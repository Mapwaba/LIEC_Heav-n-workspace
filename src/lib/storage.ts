/**
 * Neon S3-Compatible Object Storage Integration for LIEC Heav'n
 *
 * Implements S3 SigV4 authentication for uploads, downloads, and pre-signed access
 * without requiring heavy external SDKs, preserving serverless compatibility.
 */

import crypto from 'crypto';
import { isPreviewEnvironment } from './environment.ts';

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * NOTE ON CLOUD-LEVEL ISOLATION:
 * The application enforces strict logical bucket separation by requiring a dedicated
 * PREVIEW_S3_BUCKET and preventing the preview runtime from targeting the production bucket.
 * However, logical application-level bucket scoping alone does NOT constitute cloud-level
 * IAM isolation. Cloud-level isolation strictly requires provider-side IAM scoping
 * (e.g. Neon Object Storage API keys restricted to the preview bucket via IAM policies).
 */
export function getStorageConfig(): StorageConfig | null {
  const isPreview = isPreviewEnvironment();

  let endpoint: string | undefined;
  let accessKeyId: string | undefined;
  let secretAccessKey: string | undefined;
  let bucket: string | undefined;

  if (isPreview) {
    // PREVIEW ENVIRONMENT STORAGE CONFIGURATION:
    // Strictly requires PREVIEW_AWS_* credentials and dedicated PREVIEW_S3_BUCKET.
    // Zero silent fallback to production credentials or production bucket name.
    bucket = process.env.PREVIEW_S3_BUCKET?.trim();
    const productionBucket = process.env.S3_BUCKET?.trim();

    // Strict Guards: Reject missing bucket, default 'uploads', or collision with production bucket
    if (!bucket || bucket === 'uploads' || (productionBucket && bucket === productionBucket)) {
      return null;
    }

    endpoint = process.env.PREVIEW_AWS_ENDPOINT_URL_S3?.trim();
    accessKeyId = process.env.PREVIEW_AWS_ACCESS_KEY_ID?.trim();
    secretAccessKey = process.env.PREVIEW_AWS_SECRET_ACCESS_KEY?.trim();

    // Fail closed: If any preview S3 credential or endpoint is missing, return null
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      return null;
    }
  } else {
    // PRODUCTION / DEVELOPMENT STORAGE CONFIGURATION:
    bucket = process.env.S3_BUCKET?.trim();
    endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
    accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      return null;
    }
  }

  const region = process.env.AWS_REGION?.trim() || 'eu-central-1';

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

/**
 * Permanently delete a document from private S3 object storage using SigV4 DELETE request.
 */
export async function deleteDocument(
  fileKey: string
): Promise<{ success: boolean; key: string; error?: string }> {
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

    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const host = new URL(config.endpoint).host;
    const emptyPayloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const headers: Record<string, string> = {
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': emptyPayloadHash,
    };

    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
      .join('');
    const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(';');

    const canonicalRequest = [
      'DELETE',
      `/${config.bucket}/${cleanKey}`,
      '',
      canonicalHeaders,
      signedHeaders,
      emptyPayloadHash,
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
      method: 'DELETE',
      headers: {
        ...headers,
        Authorization: authorizationHeader,
      },
    });

    if (!res.ok && res.status !== 204 && res.status !== 404) {
      const errText = await res.text().catch(() => '');
      return { success: false, key: cleanKey, error: `S3 returned status ${res.status}: ${errText}` };
    }

    return {
      success: true,
      key: cleanKey,
    };
  } catch (err: any) {
    return { success: false, key: fileKey, error: err.message };
  }
}

/**
 * Generates an S3 SigV4 pre-signed GET download URL with a short expiration.
 * Default expiration is 300 seconds (5 minutes).
 */
export async function getSignedDownloadUrl(
  fileKey: string,
  expiresInSeconds: number = 300
): Promise<{ success: boolean; url?: string; error?: string }> {
  const config = getStorageConfig();
  if (!config) {
    return {
      success: false,
      error: 'Object storage environment variables are not configured.',
    };
  }

  try {
    const cleanKey = fileKey.replace(/^\//, '');
    const endpointUrl = new URL(config.endpoint);
    const host = endpointUrl.host;
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalUri = `/${encodeURIComponent(config.bucket)}/${cleanKey.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

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

    const presignedUrl = `${config.endpoint}/${config.bucket}/${cleanKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return {
      success: true,
      url: presignedUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}
