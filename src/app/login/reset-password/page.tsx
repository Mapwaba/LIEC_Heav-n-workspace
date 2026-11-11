'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ShieldCheck, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string>('');
  const [tokenMissing, setTokenMissing] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Extract token from URL fragment (#token=...) and scrub history immediately
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let extractedToken = '';
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const params = new URLSearchParams(hash);
      extractedToken = params.get('token') || '';
    }

    if (!extractedToken) {
      // Fallback check on standard query parameter
      const queryParams = new URLSearchParams(window.location.search);
      extractedToken = queryParams.get('token') || '';
    }

    if (extractedToken) {
      setToken(extractedToken);
      // Immediately remove token from browser address bar and history to prevent exposure
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      setTokenMissing(true);
    }
  }, []);

  // Live password validation
  const checks = {
    length: newPassword.length >= 14,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[^A-Za-z0-9]/.test(newPassword),
    match: Boolean(newPassword && newPassword === confirmPassword),
  };

  const isFormValid =
    checks.length &&
    checks.upper &&
    checks.lower &&
    checks.number &&
    checks.symbol &&
    checks.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing or invalid reset token. Please request a new reset link.');
      return;
    }

    if (!isFormValid) {
      setError('Please ensure the new password fulfills all security requirements and matches confirmation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message || 'Password successfully updated.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password. The link may have expired.');
      }
    } catch {
      setError('Network error: Unable to reach authentication server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #071714 0%, #0c2d27 50%, #071714 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        padding: '36px',
        color: '#1e293b'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0c685a 0%, #064e43 100%)',
            color: '#ffffff',
            marginBottom: '16px',
            boxShadow: '0 8px 16px rgba(12, 104, 90, 0.25)'
          }}>
            <Lock size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            Set New Password
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            LIEC Heav'n Enterprise Workspace
          </p>
        </div>

        {tokenMissing ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '16px',
              color: '#991b1b',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left'
            }}>
              <AlertCircle size={22} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                <strong>Invalid or Missing Reset Token</strong><br />
                The password reset link is invalid, incomplete, or has expired. Please request a new recovery link.
              </div>
            </div>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0c685a',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Return to Sign In <ArrowRight size={16} />
            </Link>
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '16px',
              color: '#065f46',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left'
            }}>
              <CheckCircle2 size={24} style={{ flexShrink: 0, color: '#059669' }} />
              <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                <strong>Password Successfully Reset</strong><br />
                {success}<br />
                <span style={{ fontSize: '12px', color: '#047857' }}>Redirecting to sign-in in 3 seconds...</span>
              </div>
            </div>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0c685a',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Sign In Now <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#991b1b',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* New Password */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 14 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Policy Requirements */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Password Policy Requirements
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '12px' }}>
                <li style={{ color: checks.length ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{checks.length ? '✓' : '•'}</span> At least 14 characters
                </li>
                <li style={{ color: checks.upper ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{checks.upper ? '✓' : '•'}</span> Uppercase letter (A-Z)
                </li>
                <li style={{ color: checks.lower ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{checks.lower ? '✓' : '•'}</span> Lowercase letter (a-z)
                </li>
                <li style={{ color: checks.number ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{checks.number ? '✓' : '•'}</span> Number (0-9)
                </li>
                <li style={{ color: checks.symbol ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{checks.symbol ? '✓' : '•'}</span> Special symbol (!@#$%^&*...)
                </li>
                <li style={{ color: checks.match ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold' }}>{checks.match ? '✓' : '•'}</span> Passwords match
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '8px',
                border: 'none',
                background: isFormValid ? 'linear-gradient(135deg, #0c685a 0%, #064e43 100%)' : '#cbd5e1',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '15px',
                cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
                boxShadow: isFormValid ? '0 4px 12px rgba(12, 104, 90, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <Link href="/login" style={{ fontSize: '13px', color: '#0c685a', textDecoration: 'none', fontWeight: '500' }}>
                Cancel and return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
