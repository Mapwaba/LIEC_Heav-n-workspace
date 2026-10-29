/**
 * Neon S3-Compatible Object Storage Integration for LIEC Heav'n
 *
 * Implements S3 SigV4 authentication for uploads, downloads, and pre-signed access
 * without requiring heavy external SDKs, preserving serverless compatibility.
 */

import crypto from 'crypto';

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function getStorageConfig(): StorageConfig | null {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    endpoint: endpoint.replace(/\/$/, ''),
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export function isStorageConfigured(): boolean {
  return getStorageConfig() !== null;
}

/**
 * Upload a document to Neon S3 storage with private ACL by default
 */
export async function uploadDocument(
  fileKey: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{ success: boolean; key: string; location?: string; error?: string }> {
  const config = getStorageConfig();
  if (!config) {
    return {
      success: false,
      key: fileKey,
      error: 'Object storage environment variables are not configured.',
    };
  }

  try {
    const cleanKey = fileKey.replace(/^\//, '');
    const url = `${config.endpoint}/${config.bucket}/${cleanKey}`;

    // S3 REST Upload with SigV4
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const headers: Record<string, string> = {
      'host': new URL(config.endpoint).host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'content-type': contentType,
    };

    // SigV4 Canonical Request
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
      .join('');
    const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(';');

    const canonicalRequest = [
      'PUT',
      `/${config.bucket}/${cleanKey}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${config.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(config.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        Authorization: authorizationHeader,
      },
      body: buffer as any,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, key: cleanKey, error: `S3 returned status ${res.status}: ${errText}` };
    }

    return {
      success: true,
      key: cleanKey,
      location: url,
    };
  } catch (err: any) {
    return { success: false, key: fileKey, error: err.message };
  }
}
