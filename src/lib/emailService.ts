import nodemailer from 'nodemailer';

export interface AccommodationEmailPayload {
  requestRef: string;
  studentRef: string;
  studentFullName: string;
  studentEmail: string;
  studentPhone: string;
  studentNationality: string;
  arrivalDate: string;
  preferredLocation: string;
  accommodationType: string;
  budget: string;
  specialRequirements?: string;
  partnerEmail?: string;
  partnerContactName?: string;
  idempotencyKey?: string;
  confirmedResend?: boolean;
}

export type EmailProviderType = 'resend' | 'smtp' | 'json_transport' | 'simulated';
export type EmailDeliveryStatus = 'Pending' | 'Accepted by provider' | 'Delivered' | 'Failed' | 'Bounced';

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

      const bodyPayload = {
        from: fromAddress,
        to: recipientList,
        reply_to: replyToArray && replyToArray.length > 0 ? replyToArray : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

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

      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipientString,
        replyTo: replyToArray && replyToArray.length > 0 ? replyToArray.join(', ') : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

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
  const info = await simTransporter.sendMail({
    from: fromAddress,
    to: recipientString,
    replyTo: replyToArray && replyToArray.length > 0 ? replyToArray.join(', ') : undefined,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

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
 * Generates the official HTML email body using LIEC Heav\'n branding.
 */
export function renderAccommodationPartnerHtml(data: AccommodationEmailPayload): string {
  const partnerName =
    data.partnerContactName || process.env.ACCOMMODATION_PARTNER_CONTACT_NAME || 'Accommodation Partner Team';
  const liecContactEmail = process.env.LIEC_CONTACT_EMAIL || 'secretariat@liecconsulting.com';
  const liecContactPhone = process.env.LIEC_CONTACT_PHONE || '+33 4 78 00 00 00';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LIEC Accommodation Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #092342 0%, #0c685a 100%); padding: 28px 32px; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 13px; color: #93c5fd; }
    .badge { display: inline-block; background: #0c685a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; margin-bottom: 8px; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0c685a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .data-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
    .data-table td.label { width: 38%; font-weight: 600; color: #64748b; background-color: #f8fafc; }
    .data-table td.val { width: 62%; font-weight: 500; color: #092342; }
    .highlight-box { background: #f0faf7; border-left: 4px solid #0c685a; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 13.5px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12.5px; color: #64748b; }
    .signature { margin-top: 24px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Partner Dispatch</div>
      <h1>LIEC Heav'n - Student Housing Reservation Request</h1>
      <p>Lyon International Education Consulting (LIEC) &bull; Ref: ${data.requestRef}</p>
    </div>

    <div class="content">
      <p>Dear <strong>${partnerName}</strong>,</p>
      <p>Please find below the official student housing request submitted by LIEC on behalf of our enrolled candidate. All student and admission background details have been verified by our admissions secretariat.</p>

      <div class="section-title">Candidate Details</div>
      <table class="data-table">
        <tr>
          <td class="label">Candidate Name:</td>
          <td class="val">${data.studentFullName}</td>
        </tr>
        <tr>
          <td class="label">LIEC Reference:</td>
          <td class="val"><code>${data.studentRef}</code></td>
        </tr>
        <tr>
          <td class="label">Nationality:</td>
          <td class="val">${data.studentNationality}</td>
        </tr>
        <tr>
          <td class="label">Candidate Email:</td>
          <td class="val"><a href="mailto:${data.studentEmail}" style="color: #0c685a;">${data.studentEmail}</a></td>
        </tr>
        <tr>
          <td class="label">Contact Phone:</td>
          <td class="val">${data.studentPhone}</td>
        </tr>
      </table>

      <div class="section-title">Accommodation Specifications</div>
      <table class="data-table">
        <tr>
          <td class="label">Expected Arrival Date:</td>
          <td class="val"><strong>${data.arrivalDate}</strong></td>
        </tr>
        <tr>
          <td class="label">Preferred Location:</td>
          <td class="val">${data.preferredLocation}</td>
        </tr>
        <tr>
          <td class="label">Accommodation Type:</td>
          <td class="val">${data.accommodationType}</td>
        </tr>
        <tr>
          <td class="label">Indicated Monthly Budget:</td>
          <td class="val"><strong>${data.budget}</strong></td>
        </tr>
        <tr>
          <td class="label">Special Requirements / Notes:</td>
          <td class="val">${data.specialRequirements?.trim() || 'None specified'}</td>
        </tr>
      </table>

      <div class="highlight-box">
        <strong>Next Steps:</strong><br>
        Please review this request and confirm availability, the proposed accommodation arrangements, pricing, and any additional documents or information required to proceed.<br><br>
        <em>Kindly include the accommodation request reference <strong>(${data.requestRef})</strong> in your response.</em>
      </div>

      <p>Thank you for your collaboration.</p>

      <div class="signature">
        Kind regards,<br><br>
        <strong>LIEC Secretariat</strong><br>
        Lyon International Education Consulting (LIEC)<br>
        Email: ${liecContactEmail}<br>
        Phone: ${liecContactPhone}
      </div>
    </div>

    <div class="footer">
      This transmission is confidential and intended solely for the designated LIEC accommodation partner. LIEC Heav'n Education Management Workspace &bull; Lyon, France.
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Sends formatted accommodation request email to the partner via primary provider.
 */
export async function sendAccommodationPartnerEmail(
  payload: AccommodationEmailPayload
): Promise<EmailSendResult> {
  const validation = validateAccommodationMandatoryFields(payload);
  if (!validation.valid) {
    throw new Error(`Missing mandatory accommodation fields: ${validation.missingFields.join(', ')}`);
  }

  const recipient = payload.partnerEmail?.trim() || getAccommodationPartnerEmail();
  const subject = `LIEC Accommodation Request - ${payload.requestRef} - ${payload.studentFullName}`;
  const htmlContent = renderAccommodationPartnerHtml({ ...payload, partnerEmail: recipient });

  const textContent =
    `LIEC Accommodation Request - ${payload.requestRef} - ${payload.studentFullName}

` +
    `Student Full Name: ${payload.studentFullName}
` +
    `LIEC Reference: ${payload.studentRef}
` +
    `Email: ${payload.studentEmail}
` +
    `Phone: ${payload.studentPhone}
` +
    `Nationality: ${payload.studentNationality}
` +
    `Expected Arrival Date: ${payload.arrivalDate}
` +
    `Preferred Location: ${payload.preferredLocation}
` +
    `Accommodation Type: ${payload.accommodationType}
` +
    `Budget: ${payload.budget}
` +
    `Additional Requirements: ${payload.specialRequirements || 'N/A'}
` +
    `Request Reference: ${payload.requestRef}

` +
    `Please review this request and confirm availability and pricing.`;

  // Compute stable idempotency key for Resend deduplication
  const cleanRef = payload.requestRef.replace(/[^a-zA-Z0-9_-]/g, '');
  const idempotencyKey =
    payload.idempotencyKey ||
    (payload.confirmedResend ? `acc_${cleanRef}_resend_${Date.now()}` : `acc_${cleanRef}`);

  return sendEmail({
    to: recipient,
    subject,
    html: htmlContent,
    text: textContent,
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
