import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { authenticateServerRequest, canSendAccommodationRequest } from '@/lib/rbac';
import {
  sendAccommodationPartnerEmail,
  validateAccommodationMandatoryFields,
  AccommodationEmailPayload,
  EmailAttachment,
  AccommodationAttachment,
} from '@/lib/emailService';
import {
  getAccommodationPartnerById,
  isAuthorizedPartnerId,
  ACCOMMODATION_PARTNERS,
} from '@/lib/accommodationPartners';
import { uploadDocument, isStorageConfigured } from '@/lib/storage';

// Whitelisted document extensions and mime types for security
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.doc'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file
const MAX_TOTAL_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB total

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) return auth.response;

    const { user } = auth;

    // Strict Role Enforcement: Only Admin and Secretary are permitted
    if (!canSendAccommodationRequest(user)) {
      try {
        await db.query(
          `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
           VALUES ($1, '[SECURITY_VIOLATION] Unauthorized attempt to invoke Send Request', 'ACCOMMODATION_SEND', 'DENIED_403', $2)`,
          [
            `${user.name} (${user.business_profile})`,
            'Unauthorized role attempted to trigger partner email dispatch.',
          ]
        );
      } catch {}

      return NextResponse.json(
        {
          error:
            'Forbidden (403): You do not have permission to send accommodation requests. Only Admin and Secretary can dispatch partner emails.',
        },
        { status: 403 }
      );
    }

    // Parse incoming payload (supports both multipart/form-data for attachments and application/json)
    let ref = '';
    let partnerId = '';
    let confirmedResend = false;
    const uploadedFiles: File[] = [];

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      ref = ((formData.get('ref') as string) || '').trim();
      partnerId = ((formData.get('partner_id') as string) || '').trim();
      confirmedResend = formData.get('confirmed_resend') === 'true' || formData.get('confirmed_resend') === '1';

      const fileEntries = formData.getAll('attachments');
      for (const entry of fileEntries) {
        if (entry instanceof File && entry.size > 0) {
          uploadedFiles.push(entry);
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      ref = (body.ref || '').trim();
      partnerId = (body.partner_id || '').trim();
      confirmedResend = Boolean(body.confirmed_resend);
    }

    if (!ref) {
      return NextResponse.json(
        { error: 'Accommodation request reference (ref) is required.' },
        { status: 400 }
      );
    }

    // 1. Validate Partner Selection Server-side against Authorized Registry
    if (!partnerId) {
      return NextResponse.json(
        {
          error: 'Partner selection is required. Please choose between SCI DANOVA or CITY PROPERTY before submitting.',
          partners: ACCOMMODATION_PARTNERS.map((p) => ({ id: p.id, name: p.name, email: p.email })),
        },
        { status: 400 }
      );
    }

    if (!isAuthorizedPartnerId(partnerId)) {
      return NextResponse.json(
        {
          error: `Invalid accommodation partner identifier "${partnerId}". Allowed partners are SCI DANOVA or CITY PROPERTY.`,
        },
        { status: 400 }
      );
    }

    const partner = getAccommodationPartnerById(partnerId)!;

    // 2. Validate that the accommodation request exists
    const cleanRef = ref.startsWith('#') ? ref : `#${ref}`;
    const accRes = await db.query(
      'SELECT * FROM accommodation_requests WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [ref, cleanRef]
    );
    if (!accRes.rows || accRes.rows.length === 0) {
      return NextResponse.json(
        { error: `Accommodation request ${ref} does not exist.` },
        { status: 404 }
      );
    }
    const accRecord = accRes.rows[0];

    // Check for previous sent state and require explicit resend confirmation
    if (accRecord.status === 'Sent' && !confirmedResend) {
      return NextResponse.json(
        {
          error: 'Duplicate send protection: This request has already been successfully sent.',
          requiresConfirmation: true,
          message:
            `This accommodation request was already dispatched to ${accRecord.partner_name || accRecord.email_recipient || 'a partner'} on ` +
            (accRecord.email_sent_at || 'a previous date') +
            '. Please explicitly confirm if you wish to resend.',
        },
        { status: 409 }
      );
    }

    // 3. Validate that it is linked to the correct Student Record
    const studentRef = accRecord.student_ref;
    const cleanStudentRef = studentRef && studentRef.startsWith('#') ? studentRef : `#${studentRef}`;
    const studentRes = await db.query(
      'SELECT * FROM candidats WHERE ref = $1 OR ref = $2 OR LOWER(ref) = LOWER($1)',
      [studentRef, cleanStudentRef]
    );
    if (!studentRes.rows || studentRes.rows.length === 0) {
      return NextResponse.json(
        {
          error: `Integrity error: Linked student record (${studentRef}) could not be found in the database.`,
        },
        { status: 400 }
      );
    }
    const student = studentRes.rows[0];

    // 4. Validate & Securely Process Attached Supporting Documents
    if (uploadedFiles.length > 5) {
      return NextResponse.json(
        { error: 'A maximum of 5 supporting documents can be attached per accommodation request.' },
        { status: 400 }
      );
    }

    interface StoredDocumentMetadata {
      id: string;
      filename: string;
      storage_key: string;
      mime_type: string;
      file_size: number;
      sizeFormatted: string;
      uploaded_at: string;
      data_base64?: string;
    }

    const attachedMetadata: StoredDocumentMetadata[] = [];
    let totalSize = 0;

    for (const file of uploadedFiles) {
      const extMatch = file.name.match(/\.[0-9a-z]+$/i);
      const ext = extMatch ? extMatch[0].toLowerCase() : '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" has an unsupported format. Allowed formats: PDF, JPG, PNG, DOCX.`,
          },
          { status: 400 }
        );
      }

      if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" has an unsupported media type (${file.type}).`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed size of 5 MB per document.`,
          },
          { status: 400 }
        );
      }

      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `Total size of attached files (${(totalSize / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed transmission limit of 12 MB.`,
          },
          { status: 400 }
        );
      }

      // Sanitize filename to prevent header injection or directory traversal
      const safeName = file.name
        .replace(/[^\w.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 80);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate anonymous document ID and private S3 key (no personal data in key)
      const docId = crypto.randomUUID();
      const anonymousS3Key = `accommodation/docs/${docId}${ext}`;

      // Securely upload document to private S3-compatible object storage
      if (isStorageConfigured()) {
        const uploadRes = await uploadDocument(anonymousS3Key, buffer, file.type || 'application/octet-stream');
        if (!uploadRes.success) {
          return NextResponse.json(
            {
              error: `Secure storage upload failed for "${file.name}": ${uploadRes.error || 'Storage service error'}.`,
            },
            { status: 502 }
          );
        }
      }

      const sizeKb = file.size / 1024;
      const sizeFormatted = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;

      attachedMetadata.push({
        id: docId,
        filename: safeName,
        storage_key: anonymousS3Key,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        sizeFormatted,
        uploaded_at: new Date().toISOString(),
        data_base64: buffer.toString('base64'),
      });
    }

    // 5. Generate secure 256-bit token & expiring download URLs for the selected partner
    let rawToken: string | null = null;
    let tokenHash: string | null = null;
    const emailAttachedFiles: AccommodationAttachment[] = [];

    if (attachedMetadata.length > 0) {
      rawToken = crypto.randomBytes(32).toString('hex');
      tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const docIds = attachedMetadata.map((d) => d.id);

      // Store ONLY the cryptographic SHA-256 hash in PostgreSQL
      await db.query(
        `INSERT INTO accommodation_access_tokens
          (token_hash, request_ref, partner_id, partner_email, document_ids, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tokenHash, accRecord.ref, partner.id, partner.email, JSON.stringify(docIds), expiresAt]
      );

      const reqUrl = new URL(req.url);
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        `${reqUrl.protocol}//${reqUrl.host}`;

      for (const doc of attachedMetadata) {
        emailAttachedFiles.push({
          id: doc.id,
          filename: doc.filename,
          sizeFormatted: doc.sizeFormatted,
          contentType: doc.mime_type,
          downloadUrl: `${baseUrl}/api/accommodation/download?ref=${encodeURIComponent(
            accRecord.ref
          )}&token=${rawToken}&doc=${doc.id}`,
        });
      }
    }

    // 6. Assemble and validate all mandatory fields
    const emailPayload: AccommodationEmailPayload = {
      requestRef: accRecord.ref,
      studentRef: student.ref,
      studentFullName: accRecord.student_name || student.full_name,
      studentEmail: accRecord.student_email || student.email,
      studentPhone: accRecord.student_phone || student.phone,
      studentNationality: accRecord.student_nationality || student.nationality || 'Congolaise (RDC)',
      studentDob: student.dob || student.date_of_birth || undefined,
      partnerName: partner.name,
      partnerEmail: partner.email,
      partnerContactName: partner.contactName,
      arrivalDate: accRecord.arrival_date,
      departureDate: accRecord.departure_date || undefined,
      occupants: accRecord.occupants || undefined,
      preferredLocation: accRecord.preferred_location,
      accommodationType: accRecord.accommodation_type,
      budget: accRecord.budget,
      specialRequirements: accRecord.special_requirements,
      submissionDate: new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      assignedAdvisor: `${user.name} (${user.business_profile})`,
      attachedFiles: emailAttachedFiles,
      confirmedResend,
    };

    const validation = validateAccommodationMandatoryFields(emailPayload);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Cannot submit request: Missing mandatory information required by the accommodation partner.',
          missingFields: validation.missingFields,
        },
        { status: 422 }
      );
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const history = JSON.parse(accRecord.history_json || '[]');

    try {
      // 7. Send email exclusively to the selected accommodation partner
      // DIRECT ATTACHMENTS ARE NEVER SENT: Pass empty attachments array
      const sendResult = await sendAccommodationPartnerEmail(emailPayload, []);

      // Never treat development simulation as a successful production send
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Outbound email delivery was not accepted by any configured provider.');
      }

      // 7. Update submission status only after confirmation of successful outbound transmission
      const providerLabel =
        sendResult.provider === 'resend' ? 'Resend' : sendResult.provider === 'smtp' ? 'SMTP' : 'Mail Service';
      const emailDeliveryStatus = sendResult.status || 'Accepted by provider';

      const attachmentDetails =
        attachedMetadata.length > 0
          ? ` with ${attachedMetadata.length} supporting document(s) [${attachedMetadata.map((a) => a.filename).join(', ')}]`
          : '';

      history.unshift({
        timestamp,
        author: `${user.name} (${user.business_profile})`,
        action: 'EMAIL_SENT',
        partner_id: partner.id,
        partner_name: partner.name,
        partner_email: partner.email,
        attachments_count: attachedMetadata.length,
        details: `Dispatched official partner reservation request exclusively to ${partner.name} (${partner.email})${attachmentDetails} via ${providerLabel} (Message ID: ${sendResult.messageId}). Status: ${emailDeliveryStatus}.`,
        status: 'Sent',
      });

      // Assemble supporting docs string for backward compatibility
      const supportingDocsList = attachedMetadata.map((a) => a.filename).join(', ');
      const combinedDocs = supportingDocsList || accRecord.supporting_docs || '';

      await db.query(
        `UPDATE accommodation_requests SET
          status = 'Sent',
          partner_name = $1,
          email_recipient = $2,
          email_sent_at = CURRENT_TIMESTAMP,
          email_sent_by = $3,
          email_status = $4,
          email_error = NULL,
          supporting_docs = $5,
          attachments_json = $6,
          history_json = $7,
          updated_at = CURRENT_TIMESTAMP
         WHERE ref = $8`,
        [
          partner.name,
          partner.email,
          `${user.name} (${user.business_profile})`,
          emailDeliveryStatus,
          combinedDocs,
          JSON.stringify(attachedMetadata),
          JSON.stringify(history),
          ref,
        ]
      );

      // Record in student activity history
      try {
        const studentHistory = JSON.parse(student.history_json || '[]');
        studentHistory.unshift({
          timestamp,
          author: `${user.name} (${user.business_profile})`,
          activity_type: 'ACCOMMODATION_SUBMITTED',
          partner_name: partner.name,
          details: `Accommodation request ${ref} successfully submitted by email to partner ${partner.name} (${partner.email})${attachmentDetails} via ${providerLabel}.`,
        });
        await db.query('UPDATE candidats SET history_json = $1 WHERE ref = $2', [
          JSON.stringify(studentHistory),
          studentRef,
        ]);
      } catch (e) {
        console.warn('Could not update student history:', e);
      }

      // Record in global audit_logs
      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'Send Accommodation Partner Email', $2, 'Success', $3)`,
        [
          `${user.name} (${user.business_profile})`,
          ref,
          `Successfully dispatched accommodation reservation request to ${partner.name} (${partner.email}) for student ${student.full_name} (${student.ref})${attachmentDetails} via ${providerLabel}. Message ID: ${sendResult.messageId}. Status: ${emailDeliveryStatus}.`,
        ]
      );

      return NextResponse.json({
        success: true,
        status: 'Sent',
        partner: partner.name,
        recipient: partner.email,
        emailStatus: emailDeliveryStatus,
        provider: sendResult.provider,
        attachmentsCount: attachedMetadata.length,
        attachments: attachedMetadata,
        sentAt: sendResult.sentAt,
        messageId: sendResult.messageId,
        message: `Accommodation request ${ref} successfully delivered to ${partner.name} (${partner.email}).`,
      });
    } catch (sendError: any) {
      console.error('Email sending failed:', sendError);

      // Record failure without falsely marking as sent
      history.unshift({
        timestamp,
        author: `${user.name} (${user.business_profile})`,
        action: 'EMAIL_FAILED',
        partner_name: partner.name,
        partner_email: partner.email,
        details: `Failed to deliver email to partner ${partner.name} (${partner.email}): ${sendError?.message || sendError}. Remains retryable.`,
        status: 'Failed',
      });

      await db.query(
        `UPDATE accommodation_requests SET
          status = 'Failed',
          partner_name = $1,
          email_recipient = $2,
          email_status = 'Failed',
          email_error = $3,
          history_json = $4,
          updated_at = CURRENT_TIMESTAMP
         WHERE ref = $5`,
        [partner.name, partner.email, sendError?.message || 'Unknown email transmission error', JSON.stringify(history), ref]
      );

      await db.query(
        `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
         VALUES ($1, 'Send Accommodation Partner Email', $2, 'Failed', $3)`,
        [
          `${user.name} (${user.business_profile})`,
          ref,
          `Failed to dispatch partner email to ${partner.name} (${partner.email}): ${sendError?.message || sendError}`,
        ]
      );

      return NextResponse.json(
        {
          error: `Email transmission failed: ${sendError?.message || 'Could not send outbound email'}. The request status is set to Failed and can be safely retried.`,
          status: 'Failed',
          retryable: true,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Unhandled error in accommodation send route:', error);
    return NextResponse.json(
      { error: 'Internal server error processing send request', details: error?.message },
      { status: 500 }
    );
  }
}
