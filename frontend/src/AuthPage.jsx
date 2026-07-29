import { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, UserPlus, CheckCircle2, ShieldCheck, Zap, KeyRound, RefreshCw, ArrowLeft, Mail, Send } from 'lucide-react';
import GlazeLogo from './GlazeLogo';
import AntigravityCanvas from './AntigravityCanvas';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPw, setIsForgotPw] = useState(false);
    const [step, setStep] = useState(1); // 1: Form, 2: 2FA Verification
    
    // Form Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    
    // 2FA Setup State
    const [tempToken, setTempToken] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [loginTempToken, setLoginTempToken] = useState('');
    
    const [error, setError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, verifyLogin2FA, registerInit, registerResend2FA, registerVerify2FA, forgotPassword } = useAuth();

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfoMsg('');
        setLoading(true);
        try {
            if (isLogin) {
                const res = await login(username, password);
                if (res.requires2FA) {
                    setLoginTempToken(res.loginTempToken);
                    setStep(2);
                }
            } else {
                const res = await registerInit(username, password, email);
                setTempToken(res.tempToken);
                setQrCodeUrl(res.qrCodeUrl);
                setSecretKey(res.secretKey);
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPwSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfoMsg('');
        setLoading(true);
        try {
            const res = await forgotPassword(email);
            setInfoMsg(res.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await verifyLogin2FA(loginTempToken, otpCode);
            } else {
                await registerVerify2FA(tempToken, otpCode);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend2FA = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await registerResend2FA(tempToken);
            setTempToken(res.tempToken);
            setQrCodeUrl(res.qrCodeUrl);
            setSecretKey(res.secretKey);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to regenerate 2FA QR code');
            if (err.response?.status === 401) {
                setStep(1); // Return to initial registration if token expired
            }
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setStep(1);
        setIsForgotPw(false);
        setError('');
        setInfoMsg('');
        setOtpCode('');
        setTempToken('');
        setLoginTempToken('');
    };

    return (
        <div className="auth-container" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Google Antigravity Particle Canvas Background */}
            <AntigravityCanvas />

            <div className="auth-split-wrapper" style={{ position: 'relative', zIndex: 1 }}>
                {/* Branding Panel (Desktop) */}
                <div className="auth-branding-panel">
                    <div>
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <GlazeLogo size={44} />
                        </div>
                        <p style={{ fontSize: 'var(--text-md)', opacity: 0.9, color: '#ffffff', lineHeight: 'var(--leading-normal)' }}>
                            Connect with friends and the world around you in a simple, fast experience.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={20} style={{ opacity: 0.9 }} />
                            <span style={{ fontSize: 'var(--text-base)' }}>Real-time messaging & instant updates</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} style={{ opacity: 0.9 }} />
                            <span style={{ fontSize: 'var(--text-base)' }}>Two-Factor Authenticator Protection (2FA)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Zap size={20} style={{ opacity: 0.9 }} />
                            <span style={{ fontSize: 'var(--text-base)' }}>Clean, responsive HIG liquid glass design</span>
                        </div>
                    </div>
                </div>

                {/* Form Panel */}
                <div className="auth-form-panel">
                    {isForgotPw ? (
                        <>
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-3)' }}>
                                <button 
                                    onClick={resetFlow} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-main)', margin: 0 }}>
                                    Forgot Password
                                </h2>
                            </div>
                            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
                                Enter your registered email address. We will send a password reset link to your email.
                            </p>

                            {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{error}</div>}
                            {infoMsg && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{infoMsg}</div>}

                            <form onSubmit={handleForgotPwSubmit} className="flex-col gap-4">
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="email" 
                                        placeholder="Email Address" 
                                        required 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        style={{ paddingLeft: '38px' }}
                                    />
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                </div>
                                <button type="submit" className="btn-glaze" disabled={loading} style={{ marginTop: 'var(--space-2)', width: '100%' }}>
                                    <Send size={18}/> Send Reset Link
                                </button>
                            </form>
                        </>
                    ) : step === 1 ? (
                        <>
                            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)', color: 'var(--text-main)' }}>
                                {isLogin ? 'Welcome Back' : 'Join Us'}
                            </h2>
                            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
                                {isLogin ? 'Enter your credentials to access your account' : 'Create an account to get started'}
                            </p>
                            
                            {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{error}</div>}

                            <form onSubmit={handleInitialSubmit} className="flex-col gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Username" 
                                    required 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)} 
                                />
                                {!isLogin && (
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="email" 
                                            placeholder="Email Address (for account recovery)" 
                                            required 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            style={{ paddingLeft: '38px' }}
                                        />
                                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    </div>
                                )}
                                <input 
                                    type="password" 
                                    placeholder="Password" 
                                    required 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                />
                                
                                {isLogin && (
                                    <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => { setIsForgotPw(true); setError(''); setInfoMsg(''); }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}

                                <button type="submit" className="btn-glaze" disabled={loading} style={{ marginTop: 'var(--space-2)', width: '100%' }}>
                                    {isLogin ? <><LogIn size={18}/> Login</> : <><UserPlus size={18}/> Continue to 2FA</>}
                                </button>
                            </form>

                            <div style={{ marginTop: 'var(--space-5)', textAlign: 'center' }}>
                                <button 
                                    type="button"
                                    onClick={() => { setIsLogin(!isLogin); resetFlow(); }} 
                                    style={{ 
                                        background: 'transparent', 
                                        color: 'var(--text-secondary)', 
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 'var(--font-medium)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '8px 16px',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                >
                                    {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Step 2: 2FA Challenge / Setup UI */
                        <>
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-3)' }}>
                                <button 
                                    onClick={resetFlow} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-main)', margin: 0 }}>
                                    {isLogin ? 'Two-Factor Verification' : 'Set Up 2FA Security'}
                                </h2>
                            </div>

                            <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                                {isLogin 
                                    ? 'Enter the 6-digit verification code from your Authenticator App.' 
                                    : 'Scan this QR code with Google Authenticator or Authy to set up your account.'
                                }
                            </p>

                            {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{error}</div>}

                            {!isLogin && qrCodeUrl && (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: 'var(--space-4)', 
                                    background: 'var(--surface-1)', 
                                    borderRadius: 'var(--radius-md)', 
                                    marginBottom: 'var(--space-4)',
                                    border: '1px solid var(--border-subtle)' 
                                }}>
                                    <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '160px', height: '160px', borderRadius: '8px', margin: '0 auto display block' }} />
                                    <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                        Key: <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{secretKey}</code>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleResend2FA} 
                                        disabled={loading}
                                        style={{ 
                                            background: 'transparent', 
                                            border: 'none', 
                                            color: 'var(--accent)', 
                                            fontSize: 'var(--text-xs)', 
                                            cursor: 'pointer', 
                                            marginTop: 'var(--space-2)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px' 
                                        }}
                                    >
                                        <RefreshCw size={12} /> Regenerate QR Code
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleVerifySubmit} className="flex-col gap-4">
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        placeholder="6-Digit OTP Code (e.g. 123456)" 
                                        required 
                                        maxLength={6}
                                        value={otpCode} 
                                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        style={{ textAlign: 'center', letterSpacing: '4px', fontSize: 'var(--text-md)', fontWeight: 'bold' }}
                                    />
                                    <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                </div>
                                <button type="submit" className="btn-glaze" disabled={loading || otpCode.length !== 6} style={{ width: '100%' }}>
                                    {isLogin ? <><ShieldCheck size={18}/> Verify & Login</> : <><CheckCircle2 size={18}/> Complete Account Setup</>}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
