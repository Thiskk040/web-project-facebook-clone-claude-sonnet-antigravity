import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { KeyRound, ShieldCheck, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import GlazeLogo from './GlazeLogo';
import AntigravityCanvas from './AntigravityCanvas';

export default function ResetPasswordPage() {
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [resetSessionToken, setResetSessionToken] = useState('');
    const [otpCode, setOtpCode] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const { resetPassword, resetPasswordVerify2FA } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Extract token once on mount from window.location.search
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
            // Immediately strip token from address bar to prevent referrer leakage
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }
        if (newPassword.length < 4) {
            return setError('Password must be at least 4 characters');
        }
        if (!token) {
            return setError('Invalid or missing reset token. Please request a new reset link.');
        }

        setLoading(true);
        try {
            const res = await resetPassword(token, newPassword);
            if (res.requires2FA) {
                setResetSessionToken(res.resetSessionToken);
                setRequires2FA(true);
            } else {
                setSuccessMsg('Password reset successful! Redirecting to login...');
                setTimeout(() => navigate('/auth'), 2000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Password reset failed');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerifySubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await resetPasswordVerify2FA(resetSessionToken, otpCode);
            setSuccessMsg('2FA verified & password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/auth'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || '2FA verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ position: 'relative', overflow: 'hidden' }}>
            <AntigravityCanvas />

            <div className="auth-split-wrapper" style={{ position: 'relative', zIndex: 1, maxWidth: '500px', margin: '0 auto' }}>
                <div className="auth-form-panel" style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                        <GlazeLogo size={40} />
                        <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-main)', marginTop: 'var(--space-2)' }}>
                            {requires2FA ? 'Two-Factor Verification' : 'Reset Your Password'}
                        </h2>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                            {requires2FA 
                                ? 'Enter the OTP code from your Authenticator App to finalize password reset.'
                                : 'Enter your new password below.'
                            }
                        </p>
                    </div>

                    {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{error}</div>}
                    {successMsg && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{successMsg}</div>}

                    {!requires2FA ? (
                        <form onSubmit={handleResetSubmit} className="flex-col gap-4">
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    required 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    style={{ paddingLeft: '38px' }}
                                />
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="password" 
                                    placeholder="Confirm New Password" 
                                    required 
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)} 
                                    style={{ paddingLeft: '38px' }}
                                />
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            </div>
                            <button type="submit" className="btn-glaze" disabled={loading} style={{ marginTop: 'var(--space-2)', width: '100%' }}>
                                <ShieldCheck size={18}/> Reset Password
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handle2FAVerifySubmit} className="flex-col gap-4">
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder="6-Digit OTP Code" 
                                    required 
                                    maxLength={6}
                                    value={otpCode} 
                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: 'var(--text-md)', fontWeight: 'bold' }}
                                />
                                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            </div>
                            <button type="submit" className="btn-glaze" disabled={loading || otpCode.length !== 6} style={{ width: '100%' }}>
                                <CheckCircle2 size={18}/> Verify 2FA & Confirm Reset
                            </button>
                        </form>
                    )}

                    <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                        <button 
                            type="button" 
                            onClick={() => navigate('/auth')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            <ArrowLeft size={16} /> Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
