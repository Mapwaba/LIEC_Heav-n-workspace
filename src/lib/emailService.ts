import nodemailer from 'nodemailer';
import {
  ACCOMMODATION_PARTNERS,
  AccommodationPartner,
  getAccommodationPartnerById,
  getAccommodationPartnerByEmail,
} from './accommodationPartners';

export interface AccommodationAttachment {
  id?: string;
  filename: string;
  sizeFormatted?: string;
  contentType?: string;
  downloadUrl?: string;
}

export interface AccommodationEmailPayload {
  requestRef: string;
  studentRef: string;
  studentFullName: string;
  studentEmail: string;
  studentPhone: string;
  studentNationality: string;
  studentDob?: string;
  partnerName: string;
  partnerEmail: string;
  partnerContactName?: string;
  accommodationType: string;
  preferredLocation: string;
  arrivalDate: string;
  departureDate?: string;
  occupants?: string;
  budget: string;
  specialRequirements?: string;
  submissionDate?: string;
  assignedAdvisor?: string;
  attachedFiles?: AccommodationAttachment[];
  idempotencyKey?: string;
  confirmedResend?: boolean;
}

export type EmailProviderType = 'resend' | 'smtp' | 'json_transport' | 'simulated';
export type EmailDeliveryStatus = 'Pending' | 'Accepted by provider' | 'Delivered' | 'Failed' | 'Bounced';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  sentAt: string;
  error?: string;
  transport: string;
  provider: EmailProviderType;
  status: EmailDeliveryStatus;
  idempotencyKey?: string;
  details?: Record<string, any>;
}

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  idempotencyKey?: string;
  workflow?: 'accommodation' | 'advisor_assignment' | 'general';
  reference?: string;
  allowSimulation?: boolean;
}

export interface AdvisorAssignmentEmailPayload {
  advisorName: string;
  advisorEmail: string;
  assignedBy: string;
  assignedAt: string;
  prospects: {
    ref: string;
    fullName: string;
    country?: string;
    program?: string;
  }[];
  workspaceUrl?: string;
  idempotencyKey?: string;
}

/**
 * Validates mandatory fields according to accommodation partner requirements.
 */
export function validateAccommodationMandatoryFields(payload: Partial<AccommodationEmailPayload>): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!payload.requestRef?.trim()) missingFields.push('Accommodation Request Reference (requestRef)');
  if (!payload.studentRef?.trim()) missingFields.push('Student Reference (studentRef)');
  if (!payload.studentFullName?.trim()) missingFields.push('Student Full Name (studentFullName)');
  if (!payload.studentEmail?.trim()) missingFields.push('Student Email (studentEmail)');
  if (!payload.studentPhone?.trim()) missingFields.push('Student Phone (studentPhone)');
  if (!payload.studentNationality?.trim()) missingFields.push('Nationality (studentNationality)');
  if (!payload.arrivalDate?.trim()) missingFields.push('Expected Arrival Date (arrivalDate)');
  if (!payload.preferredLocation?.trim()) missingFields.push('Preferred Location (preferredLocation)');
  if (!payload.accommodationType?.trim()) missingFields.push('Accommodation Type (accommodationType)');
  if (!payload.budget?.trim()) missingFields.push('Budget (budget)');
  if (!payload.partnerEmail?.trim()) missingFields.push('Partner Email (partnerEmail)');
  if (!payload.partnerName?.trim()) missingFields.push('Partner Name (partnerName)');

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Returns configured accommodation partner recipient email address.
 */
export function getAccommodationPartnerEmail(): string {
  const envEmail = process.env.ACCOMMODATION_PARTNER_EMAIL?.trim();
  if (envEmail && envEmail.includes('@')) {
    return envEmail;
  }
  return 'housing-partner@liecconsulting.com';
}

/**
 * Cleans and sanitizes the sender address so it strictly adheres
 * to RFC 5322 and Resend API validation rules: "Name <email@example.com>" or "email@example.com".
 * Strips accidental wrapping quotes, apostrophes, and curly quotes which trigger Resend HTTP 422.
 */
export function cleanSenderAddress(raw: string): string {
  if (!raw) return 'bmapwabantoro@liecconsulting.com';
  let clean = raw.trim().replace(/^["']+|["']+$/g, '').trim();

  // Bare email format
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/.test(clean)) {
    return clean;
  }

  // Name <email@example.com> format
  const angleMatch = clean.match(/<([^>]+)>/);
  if (angleMatch) {
    const email = angleMatch[1].trim();
    let name = clean.slice(0, clean.indexOf('<')).trim();
    // Resend 422: Invalid 'from' field occurs if name has apostrophes or quotation marks
    name = name.replace(/["'’`]/g, '').trim();
    if (name) {
      return `${name} <${email}>`;
    }
    return email;
  }

  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}/);
  if (emailMatch) {
    return emailMatch[0];
  }

  return clean;
}

/**
 * Resolves verified sender address with fallback hierarchy and strict formatting.
 */
export function resolveSenderAddress(override?: string): string {
  if (override && override.trim()) {
    return cleanSenderAddress(override.trim());
  }
  const resendFrom = process.env.RESEND_FROM?.trim();
  if (resendFrom) {
    return cleanSenderAddress(resendFrom);
  }
  const smtpFrom = process.env.SMTP_FROM?.trim();
  if (smtpFrom) {
    return cleanSenderAddress(smtpFrom);
  }
  return 'LIEC Heavn <bmapwabantoro@liecconsulting.com>';
}

/**
 * Returns server-side provider status without exposing credentials.
 */
export function getEmailProviderDiagnostics(): {
  activeProvider: EmailProviderType | 'none';
  hasResendKey: boolean;
  hasSmtpConfig: boolean;
  senderAddress: string;
  isProduction: boolean;
} {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()
  );
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  let activeProvider: EmailProviderType | 'none' = 'none';
  if (hasResend) activeProvider = 'resend';
  else if (hasSmtp) activeProvider = 'smtp';
  else if (!isProduction) activeProvider = 'json_transport';

  return {
    activeProvider,
    hasResendKey: hasResend,
    hasSmtpConfig: hasSmtp,
    senderAddress: resolveSenderAddress(),
    isProduction,
  };
}

/**
 * Sends outbound email via the primary configured provider with fallback.
 * Provider Priority:
 *  1. Resend REST API (when RESEND_API_KEY is configured)
 *  2. SMTP via Nodemailer (when SMTP credentials are configured)
 *  3. JSON Transport (development / simulation only - NEVER in production)
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = resolveSenderAddress(options.from);

  const recipientList = Array.isArray(options.to)
    ? options.to.map((r) => r.trim()).filter(Boolean)
    : [options.to.trim()].filter(Boolean);

  if (recipientList.length === 0) {
    throw new Error('Email delivery error: At least one recipient address is required.');
  }

  const recipientString = recipientList.join(', ');
  let replyToArray: string[] | undefined = undefined;
  if (options.replyTo) {
    replyToArray = Array.isArray(options.replyTo)
      ? options.replyTo.map((r) => r.trim()).filter(Boolean)
      : [options.replyTo.trim()].filter(Boolean);
  }

  // --- PROVIDER 1: RESEND REST API ---
  if (resendApiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      };

      if (options.idempotencyKey) {
        // Enforce Resend idempotency headers to prevent duplicate sends on network retries
        headers['Idempotency-Key'] = options.idempotencyKey;
        headers['X-Entity-Ref-ID'] = options.idempotencyKey;
      }

      const bodyPayload: Record<string, any> = {
        from: fromAddress,
        to: recipientList,
        reply_to: replyToArray && replyToArray.length > 0 ? replyToArray : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.attachments && options.attachments.length > 0) {
        bodyPayload.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          content_type: att.contentType,
        }));
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const messageId = data?.id || `resend_${Date.now()}`;

        return {
          success: true,
          messageId,
          recipient: recipientString,
          sentAt: new Date().toISOString(),
          transport: 'resend',
          provider: 'resend',
          status: 'Accepted by provider',
          idempotencyKey: options.idempotencyKey,
        };
      }

      // Handle non-200 responses from Resend API (definitive provider rejection)
      const resendDiag = await res.json().catch(() => ({}));
      const statusCode = res.status;
      const errorMsg = resendDiag?.message || `HTTP ${statusCode} ${res.statusText}`;

      // In production workflows, never silently substitute or redirect recipients.
      // Explicitly fail so that the administrative team can correct configuration.
      if (statusCode === 403) {
        throw new Error(
          `Resend authorization error (403): ${errorMsg}. Please ensure the sender domain (${fromAddress}) is verified in the Resend dashboard and the API key has sending permissions.`
        );
      }

      throw new Error(`Resend provider error (${statusCode}): ${errorMsg}`);
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error(
          `Resend request timeout (20s). The outbound email request was aborted. Because Resend may have accepted the request, retrying with the same idempotency key (${options.idempotencyKey || 'N/A'}) prevents duplicate dispatch.`
        );
      }

      // Surface the error directly; do not silently fail over to secondary providers
      // after a network attempt to avoid duplicate dispatch across disparate systems.
      throw err;
    }
  }

  // --- PROVIDER 2: SMTP TRANSPORT (Used when Resend is not configured) ---
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const mailOptions: any = {
        from: fromAddress,
        to: recipientString,
        replyTo: replyToArray && replyToArray.length > 0 ? replyToArray.join(', ') : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        }));
      }

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId || `smtp_${Date.now()}`,
        recipient: recipientString,
        sentAt: new Date().toISOString(),
        transport: 'smtp',
        provider: 'smtp',
        status: 'Accepted by provider',
        idempotencyKey: options.idempotencyKey,
      };
    } catch (smtpErr: any) {
      console.error('[SMTP Transport Error]', smtpErr?.message || smtpErr);
      throw new Error(`SMTP delivery failed: ${smtpErr?.message || 'Outbound transport failed'}`);
    }
  }

  // --- PROVIDER 3: JSON TRANSPORT / SIMULATION (DEV ONLY) ---
  if (isProduction) {
    throw new Error(
      'Email Delivery Failure: No production email provider is configured. Neither RESEND_API_KEY nor SMTP credentials were found in the environment. Outbound email cannot be delivered in production.'
    );
  }

  // Local development / testing only
  const simTransporter = nodemailer.createTransport({ jsonTransport: true });
  const simMailOptions: any = {
    from: fromAddress,
    to: recipientString,
    replyTo: replyToArray && replyToArray.length > 0 ? replyToArray.join(', ') : undefined,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  if (options.attachments && options.attachments.length > 0) {
    simMailOptions.attachments = options.attachments.map((att) => ({
      filename: att.filename,
      contentType: att.contentType,
    }));
  }

  const info = await simTransporter.sendMail(simMailOptions);

  const isSimAllowed = Boolean(options.allowSimulation);
  return {
    success: isSimAllowed,
    messageId: info.messageId || `sim_${Date.now()}`,
    recipient: recipientString,
    sentAt: new Date().toISOString(),
    transport: 'json_transport',
    provider: 'json_transport',
    status: isSimAllowed ? 'Accepted by provider' : 'Pending',
    error: isSimAllowed
      ? undefined
      : 'Development simulation: Email compiled via JSON transport (no real outbound email was transmitted).',
    idempotencyKey: options.idempotencyKey,
  };
}

/**
 * Generates the official HTML email body using LIEC Heav'n branding and task assignment visual structure.
 */
export function renderAccommodationPartnerHtml(data: AccommodationEmailPayload): string {
  const partnerContactName =
    data.partnerContactName || data.partnerName || 'Équipe Partenaire Logement';
  const liecContactEmail = process.env.LIEC_CONTACT_EMAIL || 'secretariat@liecconsulting.com';
  const liecContactPhone = process.env.LIEC_CONTACT_PHONE || '+33 4 78 00 00 00';
  const submissionTimestamp =
    data.submissionDate || new Date().toISOString().replace('T', ' ').substring(0, 16);

  // Render attached supporting documents if present
  let attachmentsSectionHtml = '';
  if (data.attachedFiles && data.attachedFiles.length > 0) {
    const docRowsHtml = data.attachedFiles
      .map(
        (f) => `
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #092342; font-size: 13px;">
                &#128196; ${f.filename}
              </td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 12px;">
                ${f.sizeFormatted || '—'}
              </td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: right;">
                ${
                  f.downloadUrl
                    ? `<a href="${f.downloadUrl}" target="_blank" style="display: inline-block; background: #0c685a; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">Download Document &rarr;</a>`
                    : '<span style="color: #94a3b8; font-size: 12px;">Unavailable</span>'
                }
              </td>
            </tr>`
      )
      .join('');

    attachmentsSectionHtml = `
      <div style="margin-top: 24px; margin-bottom: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #092342; letter-spacing: 0.04em;">
        Secure Supporting Documents (${data.attachedFiles.length})
      </div>
      <div class="table-container" style="margin: 10px 0 16px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <table>
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.03em;">Document Name</th>
              <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.03em;">Size</th>
              <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.03em; text-align: right;">Access</th>
            </tr>
          </thead>
          <tbody>
            ${docRowsHtml}
          </tbody>
        </table>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 0 0 20px 0; font-size: 12px; color: #475569; line-height: 1.5;">
        <strong style="color: #0c685a;">&#x1F512; Security &amp; Data Protection:</strong> Candidate supporting documents are stored in private S3-compatible cloud storage. Download links are single-use tokens valid for <strong>48 hours</strong> from dispatch. Direct email file attachments are disabled to prevent unauthorized data replication.
      </div>`;
  }

  // Build Student Information Table Rows (only display optional fields when available)
  const studentRows: string[] = [
    `<tr><td style="width: 35%; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Full Name</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #092342;">${data.studentFullName}</td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Student Reference ID</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0c685a; font-family: monospace;">${data.studentRef}</td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Email Address</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${data.studentEmail}" style="color: #0c685a; text-decoration: none; font-weight: 600;">${data.studentEmail}</a></td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Phone Number</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.studentPhone}</td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Nationality</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.studentNationality}</td></tr>`,
  ];
  if (data.studentDob && data.studentDob.trim()) {
    studentRows.push(
      `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Date of Birth</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.studentDob.trim()}</td></tr>`
    );
  }

  // Build Accommodation Details Table Rows (only display optional fields when available)
  const accommodationRows: string[] = [
    `<tr><td style="width: 35%; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Selected Partner</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #092342;">${data.partnerName}</td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Requested Type</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #092342;">${data.accommodationType}</td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Preferred Location / City</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.preferredLocation}</td></tr>`,
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Expected Arrival Date</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0c685a;">${data.arrivalDate}</td></tr>`,
  ];
  if (data.departureDate && data.departureDate.trim()) {
    accommodationRows.push(
      `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Expected Departure / Duration</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.departureDate.trim()}</td></tr>`
    );
  }
  if (data.occupants && data.occupants.trim()) {
    accommodationRows.push(
      `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Number of Occupants</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${data.occupants.trim()}</td></tr>`
    );
  }
  accommodationRows.push(
    `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Indicated Monthly Budget</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #092342;">${data.budget}</td></tr>`
  );
  if (data.specialRequirements && data.specialRequirements.trim()) {
    accommodationRows.push(
      `<tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; background: #f8fafc;">Additional Requirements / Comments</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; white-space: pre-line;">${data.specialRequirements.trim()}</td></tr>`
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LIEC Heav'n – New Accommodation Reservation Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #092342 0%, #0c685a 100%); padding: 32px; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); color: #5eead4; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 13.5px; color: #cbd5e1; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; font-size: 13px; }
    .meta-box strong { color: #092342; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #092342; letter-spacing: 0.04em; margin: 24px 0 10px 0; }
    .table-container { margin: 12px 0 20px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    .highlight-box { background: #f0faf7; border-left: 4px solid #0c685a; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 24px 0; font-size: 13.5px; line-height: 1.6; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Partner Reservation Request</div>
      <h1>Student Housing Reservation Request</h1>
      <p>Official dispatch from the LIEC Heav'n Advisory &amp; Admissions Platform &bull; Ref: ${data.requestRef}</p>
    </div>

    <div class="content">
      <p>Dear <strong>${partnerContactName}</strong>,</p>
      <p>Please find below an official student accommodation reservation request submitted on behalf of our enrolled candidate for housing placement in Lyon. All student background details have been verified by the LIEC Admissions Secretariat.</p>

      <div class="meta-box">
        <div><strong>Designated Accommodation Partner:</strong> ${data.partnerName} (${data.partnerEmail})</div>
        <div style="margin-top: 4px;"><strong>Request Reference ID:</strong> <code style="color: #0c685a; font-weight: 700;">${data.requestRef}</code></div>
        <div style="margin-top: 4px;"><strong>Submission Date:</strong> ${submissionTimestamp}</div>
        <div style="margin-top: 4px;"><strong>Assigned LIEC Advisor / Sender:</strong> ${data.assignedAdvisor || 'LIEC Admissions & Housing Secretariat'}</div>
      </div>

      <div class="section-title">Candidate Details</div>
      <div class="table-container">
        <table>
          <tbody>
            ${studentRows.join('\n            ')}
          </tbody>
        </table>
      </div>

      <div class="section-title">Accommodation Specifications</div>
      <div class="table-container">
        <table>
          <tbody>
            ${accommodationRows.join('\n            ')}
          </tbody>
        </table>
      </div>

      ${attachmentsSectionHtml}

      <div class="highlight-box">
        <strong style="color: #092342;">Action Required:</strong><br>
        Please review the above candidate specifications and confirm room availability, proposed accommodation options, and rental pricing.<br><br>
        <em>Kindly reply directly to this notification or reference <strong>${data.requestRef}</strong> in all related correspondence.</em>
      </div>

      <div style="margin-top: 24px; font-size: 13.5px; line-height: 1.6;">
        Kind regards,<br><br>
        <strong style="color: #092342;">LIEC Admissions &amp; Housing Secretariat</strong><br>
        Lyon International Education Consulting (LIEC)<br>
        Email: <a href="mailto:${liecContactEmail}" style="color: #0c685a; text-decoration: none; font-weight: 600;">${liecContactEmail}</a><br>
        Phone: ${liecContactPhone}<br>
        Workspace: <a href="https://workspace.liecconsulting.com" style="color: #0c685a; text-decoration: none;">workspace.liecconsulting.com</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>LIEC Heav'n Consulting &bull; Student Housing Placement &amp; Admissions Platform</strong></p>
      <p style="margin: 0;">Confidentiality Notice: This transmission contains confidential student details intended exclusively for <strong>${data.partnerName}</strong> (${data.partnerEmail}). Enclosed attachments and applicant records must be handled in compliance with applicable data protection regulations. If you received this transmission in error, please immediately inform secretariat@liecconsulting.com.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Sends formatted accommodation request email to the partner via primary provider.
 */
export async function sendAccommodationPartnerEmail(
  payload: AccommodationEmailPayload,
  attachments?: EmailAttachment[]
): Promise<EmailSendResult> {
  const validation = validateAccommodationMandatoryFields(payload);
  if (!validation.valid) {
    throw new Error(`Missing mandatory accommodation fields: ${validation.missingFields.join(', ')}`);
  }

  const recipient = payload.partnerEmail.trim();
  const subject = `LIEC Heav’n – New Accommodation Reservation Request | ${payload.studentFullName}`;
  const htmlContent = renderAccommodationPartnerHtml(payload);

  const textContent = [
    `LIEC Heav’n – New Accommodation Reservation Request | ${payload.studentFullName}`,
    `Reference: ${payload.requestRef}`,
    '',
    `Dear ${payload.partnerContactName || payload.partnerName},`,
    '',
    'Please find below an official student accommodation reservation request submitted on behalf of our enrolled candidate:',
    '',
    '--- CANDIDATE DETAILS ---',
    `Full Name: ${payload.studentFullName}`,
    `Student Reference: ${payload.studentRef}`,
    `Email: ${payload.studentEmail}`,
    `Phone: ${payload.studentPhone}`,
    `Nationality: ${payload.studentNationality}`,
    ...(payload.studentDob ? [`Date of Birth: ${payload.studentDob}`] : []),
    '',
    '--- ACCOMMODATION SPECIFICATIONS ---',
    `Designated Partner: ${payload.partnerName}`,
    `Accommodation Type: ${payload.accommodationType}`,
    `Preferred Location: ${payload.preferredLocation}`,
    `Expected Arrival Date: ${payload.arrivalDate}`,
    ...(payload.departureDate ? [`Expected Departure: ${payload.departureDate}`] : []),
    ...(payload.occupants ? [`Occupants: ${payload.occupants}`] : []),
    `Budget: ${payload.budget}`,
    ...(payload.specialRequirements ? [`Special Requirements: ${payload.specialRequirements}`] : []),
    ...(payload.attachedFiles && payload.attachedFiles.length > 0
      ? [
          '',
          `--- SECURE SUPPORTING DOCUMENTS (${payload.attachedFiles.length}) ---`,
          'For data protection, candidate documents are accessible via temporary 48-hour secure links:',
          ...payload.attachedFiles.map(
            (f) =>
              `- ${f.filename}${f.sizeFormatted ? ` (${f.sizeFormatted})` : ''}: ${
                f.downloadUrl || 'Available in workspace'
              }`
          ),
          'Notice: Links automatically expire 48 hours after transmission.',
        ]
      : []),
    '',
    'Please review this request and confirm availability, proposed terms, and rental conditions.',
    '',
    'Kind regards,',
    'LIEC Admissions & Housing Secretariat',
    'Lyon International Education Consulting (LIEC)',
    'secretariat@liecconsulting.com',
  ].join('\n');

  // Compute stable idempotency key for Resend deduplication
  const cleanRef = payload.requestRef.replace(/[^a-zA-Z0-9_-]/g, '');
  const partnerTag = payload.partnerName.replace(/[^a-zA-Z0-9]/g, '_');
  const idempotencyKey =
    payload.idempotencyKey ||
    (payload.confirmedResend ? `acc_${partnerTag}_${cleanRef}_resend_${Date.now()}` : `acc_${partnerTag}_${cleanRef}`);

  // Secure Document-Sharing Policy: Always pass empty attachments array to email provider
  // All supporting documents are downloaded exclusively through temporary, signed links
  return sendEmail({
    to: recipient,
    subject,
    html: htmlContent,
    text: textContent,
    attachments: [],
    idempotencyKey,
    workflow: 'accommodation',
    reference: payload.requestRef,
  });
}

/**
 * Resolves the canonical workspace redirect URL for advisor email notifications.
 */
export function resolveWorkspaceRedirectUrl(override?: string): string {
  if (override && override.startsWith('http')) {
    return override.includes('?') ? override : `${override.replace(/\/+$/, '')}/?tab=prospects`;
  }
  const customUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  if (customUrl && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
    return customUrl.includes('?') ? customUrl : `${customUrl.replace(/\/+$/, '')}/?tab=prospects`;
  }
  return 'https://workspace.liecconsulting.com/?tab=prospects';
}

/**
 * Renders HTML email template for newly assigned prospects using LIEC branding.
 */
export function renderAdvisorAssignmentHtml(data: AdvisorAssignmentEmailPayload): string {
  const workspaceUrl = resolveWorkspaceRedirectUrl(data.workspaceUrl);
  const count = data.prospects.length;

  const rowsHtml = data.prospects
    .map(
      (p) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #092342;">${p.ref}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b;">${p.fullName}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0c685a; font-size: 13px;">${p.program || 'Lyon Partner Program'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">${p.country || 'DRC'}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Prospect Assignment - LIEC Heav'n</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #092342 0%, #0c685a 100%); padding: 32px; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); color: #5eead4; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 13.5px; color: #cbd5e1; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; font-size: 13px; }
    .meta-box strong { color: #092342; }
    .table-container { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 10px 12px; font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; }
    .btn { display: inline-block; background: #092342; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13.5px; margin: 16px 0 8px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">LIEC Heav'n - CRM Advisory Notification</div>
      <h1>New Prospect Assignment</h1>
      <p>Official assignment notification from the LIEC Heav'n CRM Pipeline</p>
    </div>
    <div class="content">
      <p>Dear <strong>${data.advisorName}</strong>,</p>
      <p>You have been assigned <strong>${count}</strong> new candidate prospect${count > 1 ? 's' : ''} to manage in your advisory queue.</p>

      <div class="meta-box">
        <div><strong>Assigned by:</strong> ${data.assignedBy}</div>
        <div style="margin-top: 4px;"><strong>Assignment Date &amp; Time:</strong> ${data.assignedAt}</div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Candidate</th>
              <th>Target Program</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <p>Please review each candidate's record, initiate contact, and advance them through the qualification and admissions milestones.</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${workspaceUrl}" class="btn" target="_blank">Open LIEC Workspace &amp; Review Prospects &rarr;</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>LIEC Heav'n Consulting &bull; Student Intake &amp; Advisory Platform</strong></p>
      <p style="margin: 0;">Security &amp; Confidentiality Notice: This message contains confidential internal assignment information intended solely for authorized LIEC advisory personnel. Do not forward or expose externally.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Sends professional assignment email to the assigned advisor via primary provider.
 */
export async function sendAdvisorAssignmentEmail(
  payload: AdvisorAssignmentEmailPayload
): Promise<EmailSendResult> {
  const recipient = payload.advisorEmail?.trim();
  if (!recipient || !recipient.includes('@')) {
    throw new Error('Invalid advisor professional email address');
  }

  const subject = `New Prospect Assignment - LIEC Heav'n (${payload.prospects.length} lead${payload.prospects.length > 1 ? 's' : ''})`;
  const htmlContent = renderAdvisorAssignmentHtml(payload);

  const prospectListText = payload.prospects
    .map((p) => `- ${p.ref}: ${p.fullName} (${p.program || 'Partner School Lyon'}, ${p.country || 'DRC'})`)
    .join('\n');

  const textContent = [
    "New Prospect Assignment - LIEC Heav'n",
    '',
    `Dear ${payload.advisorName},`,
    '',
    `You have been assigned ${payload.prospects.length} new prospect(s) in the LIEC Heav'n CRM:`,
    '',
    prospectListText,
    '',
    `Assigned by: ${payload.assignedBy}`,
    `Date & Time: ${payload.assignedAt}`,
    '',
    "Access your assigned prospects in the LIEC Heav'n Workspace:",
    resolveWorkspaceRedirectUrl(payload.workspaceUrl),
    '',
    "LIEC Heav'n Consulting - Confidential Advisory Internal Communication",
  ].join('\n');

  // Compute stable idempotency key for Resend deduplication
  const refList = payload.prospects
    .map((p) => p.ref.replace(/[^a-zA-Z0-9_-]/g, ''))
    .sort()
    .join('_');
  const cleanEmail = recipient.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanTime = payload.assignedAt.replace(/[^0-9]/g, '').substring(0, 12);
  const idempotencyKey =
    payload.idempotencyKey || `assign_${cleanEmail}_${refList}_${cleanTime}`.substring(0, 120);

  return sendEmail({
    to: recipient,
    subject,
    html: htmlContent,
    text: textContent,
    idempotencyKey,
    workflow: 'advisor_assignment',
  });
}

export interface NewUserWelcomeEmailPayload {
  firstName: string;
  lastName: string;
  userId: string;
  email: string;
  role: string;
  businessProfile?: string;
  temporaryPassword?: string;
  loginUrl?: string;
  idempotencyKey?: string;
}

/**
 * Renders HTML email notification for newly created staff user accounts.
 */
export function renderNewUserWelcomeHtml(data: NewUserWelcomeEmailPayload): string {
  const loginUrl = (data.loginUrl || 'https://workspace.liecconsulting.com/login').trim();
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const displayRole = data.businessProfile || data.role || 'Staff Member';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LIEC Heav'n Workspace</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #092342 0%, #0c685a 100%); padding: 32px; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); color: #5eead4; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 13.5px; color: #cbd5e1; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; }
    .credentials-box { background: #f0fdf9; border: 1px solid #bbf0df; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .credentials-title { font-weight: 800; color: #0c685a; margin-bottom: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; }
    .cred-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .cred-label { color: #64748b; font-weight: 600; }
    .cred-val { font-weight: 700; color: #092342; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #334155; }
    .btn { display: inline-block; background: #0c685a; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 16px 0 8px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">LIEC Heav'n &bull; User Management</div>
      <h1>Account Activation &amp; Credentials</h1>
      <p>Welcome to your LIEC Heav'n Education Management Workspace</p>
    </div>
    <div class="content">
      <p>Hello <strong>${data.firstName}</strong>,</p>
      <p>Your user account on the <strong>LIEC Heav'n Workspace</strong> platform has been created by the system administrator.</p>

      <div class="credentials-box">
        <div class="credentials-title">Your Identity &amp; Sign-In Credentials</div>
        <table style="width:100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Full Name:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #092342;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Assigned User ID:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #0c685a; font-family: monospace;">${data.userId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Professional Email:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #092342; font-family: monospace;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Assigned Role:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #092342;">${displayRole}</td>
          </tr>
        </table>
      </div>

      <div class="info-card">
        <strong>Dual Login Capability:</strong><br>
        You can sign in to the workspace using <em>either</em> your <strong>Professional Email Address</strong> (<span style="color:#0c685a;">${data.email}</span>) or your <strong>User ID</strong> (<span style="color:#0c685a;">${data.userId}</span>) with your secure password.
      </div>

      <div class="info-card" style="background: #fffbeb; border-color: #fef3c7; color: #92400e;">
        <strong>Password Security &amp; First Login:</strong><br>
        A one-time temporary password was generated for initial access and provided by your administrator. For your security, you will be required to choose a new private password upon your first sign-in. Permanent passwords are never sent via plain-text email.
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" class="btn" target="_blank">Sign In to LIEC Heav'n Workspace &rarr;</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>LIEC Heav'n Consulting &bull; Education Management</strong></p>
      <p style="margin: 0;">Login URL: <a href="${loginUrl}" style="color: #0c685a; text-decoration: none;">${loginUrl}</a></p>
      <p style="margin: 6px 0 0 0;">This email was sent to ${data.email}. If you did not expect this notification, please contact the platform administrator immediately.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Sends professional account creation notification email to the new user via Resend / configured provider.
 */
export async function sendNewUserWelcomeEmail(
  payload: NewUserWelcomeEmailPayload
): Promise<EmailSendResult> {
  const recipient = payload.email?.trim().toLowerCase();
  if (!recipient || !recipient.includes('@')) {
    throw new Error('Invalid professional email address for new user');
  }

  const subject = `Welcome to LIEC Heav'n - Your Account Credentials (${payload.userId})`;
  const htmlContent = renderNewUserWelcomeHtml(payload);
  const loginUrl = payload.loginUrl || 'https://workspace.liecconsulting.com/login';

  const textContent = [
    "Welcome to LIEC Heav'n Workspace",
    '',
    `Hello ${payload.firstName},`,
    '',
    "Your user account has been successfully configured on the LIEC Heav'n Education Management Workspace.",
    '',
    "Your Account Identity & Credentials:",
    `- Full Name: ${payload.firstName} ${payload.lastName}`,
    `- Assigned User ID: ${payload.userId}`,
    `- Professional Email: ${payload.email}`,
    `- Assigned Role: ${payload.businessProfile || payload.role}`,
    '',
    "Dual Login Capability:",
    `You can sign in using either your professional email (${payload.email}) or your User ID (${payload.userId}).`,
    '',
    "Password Security Notice:",
    "A temporary initial password was generated by your administrator. You will be prompted to set your permanent private password upon first login.",
    '',
    `Sign in at: ${loginUrl}`,
    '',
    "LIEC Heav'n Consulting - Confidential Internal Staff Communication",
  ].join('\n');

  const cleanUserId = payload.userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const idempotencyKey =
    payload.idempotencyKey || `user_welcome_${cleanUserId}_${Date.now()}`.substring(0, 120);

  return sendEmail({
    to: recipient,
    subject,
    html: htmlContent,
    text: textContent,
    idempotencyKey,
    workflow: 'general',
    allowSimulation: true,
  });
}
