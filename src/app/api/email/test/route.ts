import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { resolveSenderAddress } from '@/lib/emailService';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';
    const configuredFrom = process.env.RESEND_FROM?.trim() || '';
    const resolvedFrom = resolveSenderAddress();

    const maskedKey = resendApiKey
      ? `${resendApiKey.slice(0, 8)}...${resendApiKey.slice(-4)} (length ${resendApiKey.length})`
      : 'NOT_CONFIGURED';

    if (!resendApiKey) {
      return NextResponse.json({
        ok: false,
        error: 'RESEND_API_KEY is not configured in the server environment.',
        config: {
          hasKey: false,
          configuredFrom,
          resolvedFrom,
        },
      }, { status: 500 });
    }

    // 1. Diagnostic test with currently configured sender
    const testRecipient = 'bmapwabantoro@liecconsulting.com';
    const primaryTestPayload = {
      from: resolvedFrom,
      to: [testRecipient],
      subject: `[LIEC Heav'n] Diagnostic Email Test — ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #092342; margin-top: 0;">LIEC Heav'n Email Delivery Verification</h2>
          <p>This is a live diagnostic message dispatched from the LIEC Heav'n workspace production runtime.</p>
          <ul style="color: #475569; font-size: 13px;">
            <li><strong>Sender:</strong> ${resolvedFrom}</li>
            <li><strong>Recipient:</strong> ${testRecipient}</li>
            <li><strong>Key Prefix:</strong> ${maskedKey}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          <p style="color: #0c685a; font-weight: bold; margin-bottom: 0;">✓ If you see this email, Resend delivery is fully operational.</p>
        </div>
      `,
      text: `LIEC Heav'n Email Delivery Verification\nSender: ${resolvedFrom}\nRecipient: ${testRecipient}\nTimestamp: ${new Date().toISOString()}`,
    };

    const primaryRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(primaryTestPayload),
    });

    const primaryStatus = primaryRes.status;
    const primaryBody = await primaryRes.json().catch(() => ({}));

    // If primary failed with 403, try testing with the default sandbox sender onboarding@resend.dev
    // to diagnose whether the root cause is an unverified custom domain
    let sandboxDiag: any = null;
    if (!primaryRes.ok && primaryStatus === 403) {
      try {
        const sandboxRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...primaryTestPayload,
            from: "LIEC Heav'n <onboarding@resend.dev>",
          }),
        });
        sandboxDiag = {
          tested: true,
          status: sandboxRes.status,
          response: await sandboxRes.json().catch(() => ({})),
        };
      } catch (err: any) {
        sandboxDiag = { tested: true, error: err?.message };
      }
    }

    // Log diagnostic in audit_logs
    await db.query(
      `INSERT INTO audit_logs (actor, action, entity_ref, outcome, details)
       VALUES ('System Diagnostic', 'Resend Delivery Test', 'RESEND-TEST', $1, $2)`,
      [
        primaryRes.ok ? 'Succès' : 'Echec',
        primaryRes.ok
          ? `Delivered to ${testRecipient}. Message ID: ${primaryBody?.id || 'N/A'}`
          : `HTTP ${primaryStatus}: ${JSON.stringify(primaryBody)} | Sandbox test: ${JSON.stringify(sandboxDiag)}`,
      ]
    );

    return NextResponse.json({
      ok: primaryRes.ok,
      httpStatus: primaryStatus,
      resendResponse: primaryBody,
      senderUsed: resolvedFrom,
      recipientUsed: testRecipient,
      keyPrefix: maskedKey,
      sandboxDiagnosis: sandboxDiag,
      rootCauseHint: !primaryRes.ok
        ? primaryStatus === 403
          ? 'Resend HTTP 403 indicates either: 1) Domain liecconsulting.com is not verified under Resend > Domains (requires DNS TXT/MX records), or 2) The API key was scoped to a specific domain or has restricted permissions. If onboarding@resend.dev works, setting RESEND_FROM to onboarding@resend.dev will immediately allow test emails to bmapwabantoro@liecconsulting.com.'
          : `Resend error ${primaryStatus}: ${primaryBody?.message || 'Check configuration'}`
        : 'Email accepted successfully by Resend.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
