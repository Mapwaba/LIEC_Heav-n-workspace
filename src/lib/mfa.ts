import crypto from 'crypto';
import { generateTotpCode } from './totp.ts';

function getMfaEncryptionKey(): Buffer {
  const rawKey = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (!rawKey) {
    throw new Error('[SECURITY FATAL] MFA_ENCRYPTION_KEY is not configured in the environment.');
  }

  // Key can be 64-char hex or 32-byte raw string
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  } else if (rawKey.length === 32) {
    return Buffer.from(rawKey, 'utf-8');
  }

  // If provided key is arbitrary string, derive a stable 256-bit key using HKDF
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(rawKey), Buffer.from('liec_mfa_salt'), Buffer.from('mfa_enc_v1'), 32));
}

/**
 * Authenticated Encryption of TOTP Secret at Rest (AES-256-GCM)
 * Output format: <iv_hex>:<ciphertext_hex>:<auth_tag_hex>
 */
export function encryptMfaSecret(plaintextSecret: string): string {
  if (!plaintextSecret) throw new Error('Cannot encrypt empty MFA secret.');
  const key = getMfaEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintextSecret, 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
}

/**
 * Authenticated Decryption of TOTP Secret at Rest (AES-256-GCM)
 * Verifies cryptographic integrity via GCM auth tag before returning plaintext.
 */
export function decryptMfaSecret(encryptedString: string): string {
  if (!encryptedString || typeof encryptedString !== 'string') {
    throw new Error('Invalid encrypted MFA secret payload.');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid MFA ciphertext format (expected iv:ciphertext:tag).');
  }

  const [ivHex, cipherHex, tagHex] = parts;
  const key = getMfaEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf-8');
  } catch (err: any) {
    throw new Error(`MFA decryption integrity check failed: ${err?.message || 'ciphertext tampered or incorrect key'}`);
  }
}

/**
 * Generates 8 high-entropy alphanumeric emergency recovery codes
 * Returned as plaintext for one-time user display and SHA-256 hashes for storage.
 */
export function generateRecoveryCodes(count = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32-like (no 0/O, 1/I confusion)
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(10);
    let code = '';
    for (let b = 0; b < 10; b++) {
      code += chars[bytes[b] % chars.length];
    }
    // Format as 5-5: e.g. ABCDE-FGHIJ
    const formatted = `${code.substring(0, 5)}-${code.substring(5, 10)}`;
    rawCodes.push(formatted);

    const hash = crypto.createHash('sha256').update(formatted).digest('hex');
    hashedCodes.push(hash);
  }

  return { rawCodes, hashedCodes };
}

/**
 * TOTP verification with strict replay protection and clock-drift tolerance (+/- 1 window)
 */
export function verifyTotpWithReplayProtection(
  secret: string,
  code: string,
  lastUsedTimestep = 0
): { valid: boolean; currentTimestep: number; reason?: string } {
  if (!code || !secret) {
    return { valid: false, currentTimestep: lastUsedTimestep, reason: 'Code or secret missing.' };
  }

  const cleanCode = code.trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { valid: false, currentTimestep: lastUsedTimestep, reason: 'Invalid 6-digit format.' };
  }

  const baseTimestep = Math.floor(Date.now() / 1000 / 30);

  // Check windows: 0 (current), -1 (30s past), +1 (30s future)
  for (const w of [0, -1, 1]) {
    const timestep = baseTimestep + w;
    const expected = generateTotpCode(secret, w);

    if (expected === cleanCode) {
      // Replay protection: The code must belong to a timestep strictly greater than last used
      if (timestep <= lastUsedTimestep) {
        return {
          valid: false,
          currentTimestep: lastUsedTimestep,
          reason: 'This TOTP code has already been used (replay blocked). Please wait for the next 30-second code.',
        };
      }
      return { valid: true, currentTimestep: timestep };
    }
  }

  return { valid: false, currentTimestep: lastUsedTimestep, reason: 'Code does not match current TOTP window.' };
}
