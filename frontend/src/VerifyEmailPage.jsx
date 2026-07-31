import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import GlazeLogo from './GlazeLogo';
import AntigravityCanvas from './AntigravityCanvas';

export default function VerifyEmailPage() {
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Verification token is missing or invalid.');
            return;
        }

        // Clean URL query params to prevent token leak in referrers
        window.history.replaceState({}, document.title, window.location.pathname);

        axios.get(`http://localhost:3000/auth/verify-email?token=${token}`)
            .then(res => {
                setStatus('success');
                setMessage(res.data.message || 'Email successfully verified!');
                setTimeout(() => navigate('/auth'), 3000);
            })
            .catch(err => {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Invalid or expired verification token.');
            });
    }, [navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#090d16',
            color: '#f8fafc',
            fontFamily: "'Inter', sans-serif"
        }}>
            <AntigravityCanvas />

            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '440px',
                padding: '40px 32px',
                margin: '20px',
                borderRadius: '24px',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <GlazeLogo size={48} />
                </div>

                {status === 'verifying' && (
                    <div>
                        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', marginBottom: '20px' }}>
                            <Loader2 className="animate-spin" size={40} style={{ color: '#818cf8' }} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>
                            Verifying Email...
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                            Please wait while we confirm your email address.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '20px' }}>
                            <CheckCircle2 size={40} style={{ color: '#10b981' }} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>
                            Email Verified!
                        </h2>
                        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '24px' }}>
                            {message}
                        </p>
                        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            Redirecting to login in 3 seconds...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '20px' }}>
                            <XCircle size={40} style={{ color: '#ef4444' }} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>
                            Verification Failed
                        </h2>
                        <p style={{ color: '#f87171', fontSize: '0.95rem', marginBottom: '24px' }}>
                            {message}
                        </p>
                        <button
                            onClick={() => navigate('/auth')}
                            style={{
                                width: '100%',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <ArrowLeft size={18} /> Back to Sign In
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
