import crypto from 'crypto';

/**
 * Generate a cryptographically strong, unique temporary password
 * Minimum 14 characters, containing uppercase, lowercase, numbers, and special characters.
 */
export function generateSecureTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing characters I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Removed l
  const digits = '23456789'; // Removed 0, 1
  const symbols = '!@#$%*&-+=';

  // Ensure minimum entropy: at least 2 of each category
  const requiredChars = [
    upper[crypto.randomInt(0, upper.length)],
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const allChars = upper + lower + digits + symbols;
  const targetLength = 14;

  while (requiredChars.length < targetLength) {
    requiredChars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Cryptographic Fisher-Yates shuffle
  for (let i = requiredChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
  }

  return requiredChars.join('');
}

/**
 * Hash password with PBKDF2 using SHA-512 and random 16-byte salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Constant-time password verification against timing attacks
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) return false;
  try {
    const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Validate password against enterprise security policy
 */
export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    differentFromCurrent: boolean;
  };
}

export function validatePasswordPolicy(newPassword: string, currentPassword?: string): PasswordPolicyResult {
  const p = newPassword || '';
  const checks = {
    minLength: p.length >= 10,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(p),
    differentFromCurrent: !currentPassword || p !== currentPassword,
  };

  const errors: string[] = [];
  if (!checks.minLength) errors.push('Password must be at least 10 characters long.');
  if (!checks.hasUpper) errors.push('Password must contain at least one uppercase letter (A-Z).');
  if (!checks.hasLower) errors.push('Password must contain at least one lowercase letter (a-z).');
  if (!checks.hasNumber) errors.push('Password must contain at least one number (0-9).');
  if (!checks.hasSpecial) errors.push('Password must contain at least one special character (!@#$%*...).');
  if (!checks.differentFromCurrent) errors.push('New password cannot be identical to the temporary password.');

  return {
    valid: Object.values(checks).every(Boolean),
    errors,
    checks,
  };
}
