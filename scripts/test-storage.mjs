import crypto from 'crypto';

async function main() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, '');
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'eu-central-1';

  console.log('[+] Verifying Neon S3 Object Storage...');
  console.log(`    Endpoint: ${endpoint}`);
  console.log(`    Region:   ${region}`);
  console.log(`    Bucket:   ${bucket}`);

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.error('Storage credentials incomplete');
    process.exit(1);
  }

  const cleanKey = 'system/verification-check.txt';
  const url = `${endpoint}/${bucket}/${cleanKey}`;
  const buffer = Buffer.from('LIEC Heav’n Subproduction Storage Verification Token: ' + Date.now());

  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

  const headers = {
    'host': new URL(endpoint).host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'content-type': 'text/plain',
  };

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
    .join('');
  const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(';');

  const canonicalRequest = [
    'PUT',
    `/${bucket}/${cleanKey}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        Authorization: authorizationHeader,
      },
      body: buffer,
    });

    console.log(`[i] S3 Response Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      console.log(`[✓] Test document uploaded to Neon S3 storage successfully!`);
    } else {
      const text = await res.text().catch(() => '');
      console.log(`[i] S3 Details: ${text}`);
    }
  } catch (err) {
    console.warn(`[!] S3 Test network note:`, err.message);
  }
}

main().catch(console.error);
