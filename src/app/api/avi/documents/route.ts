import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { authenticateServerRequest } from '@/lib/rbac';
import { uploadDocument, getSignedDownloadUrl } from '@/lib/storage';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const itemId = String(formData.get('item_id') || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');

    if (!itemId) {
      return NextResponse.json({ error: 'Checklist item_id is required.' }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file must be provided.' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Selected file is empty.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 10 MB maximum size limit.' }, { status: 400 });
    }

    const originalName = (file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const isPdfName = originalName.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hasPdfMagic = buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';

    if (!isPdfName && !isPdfMime && !hasPdfMagic) {
      return NextResponse.json(
        { error: 'Only valid PDF documents (.pdf) are accepted for TrustAVI checklist uploads.' },
        { status: 400 }
      );
    }

    const safeFileName = originalName.toLowerCase().endsWith('.pdf') ? originalName : `${originalName}.pdf`;
    const uniqueKey = `avi-checklist/${itemId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const uploadRes = await uploadDocument(uniqueKey, buffer, 'application/pdf');
    if (!uploadRes.success) {
      return NextResponse.json(
        { error: uploadRes.error || 'Failed to upload document to secure storage.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      storageKey: uploadRes.key,
      fileName: file.name || safeFileName,
      fileSizeBytes: file.size,
      mimeType: 'application/pdf',
    });
  } catch (err: any) {
    console.error('[AVI DOCUMENTS UPLOAD] Error:', err);
    return NextResponse.json({ error: 'Failed to process document upload.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const auth = await authenticateServerRequest(req, db);
    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const key = (searchParams.get('key') || '').trim();
    if (!key || !key.startsWith('avi-checklist/')) {
      return NextResponse.json({ error: 'Invalid or unauthorized document key.' }, { status: 400 });
    }

    const signedUrl = getSignedDownloadUrl(key, 300);
    if (!signedUrl) {
      return NextResponse.json({ error: 'Secure storage is not configured.' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, url: signedUrl, expiresInSeconds: 300 });
  } catch (err: any) {
    console.error('[AVI DOCUMENTS DOWNLOAD] Error:', err);
    return NextResponse.json({ error: 'Failed to generate signed download link.' }, { status: 500 });
  }
}
