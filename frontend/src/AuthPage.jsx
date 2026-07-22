import { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, UserPlus, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import GlazeLogo from './GlazeLogo';
import AntigravityCanvas from './AntigravityCanvas';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) await login(username, password);
            else await register(username, password);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        }
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
                            <span style={{ fontSize: 'var(--text-base)' }}>Hybrid engagement glaze detector</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Zap size={20} style={{ opacity: 0.9 }} />
                            <span style={{ fontSize: 'var(--text-base)' }}>Clean, responsive HIG design</span>
                        </div>
                    </div>
                </div>

                {/* Form Panel */}
                <div className="auth-form-panel">
                    <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)', color: 'var(--text-main)' }}>
                        {isLogin ? 'Welcome Back' : 'Join Us'}
                    </h2>
                    <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
                        {isLogin ? 'Enter your credentials to access your account' : 'Create an account to get started'}
                    </p>
                    
                    {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{error}</div>}

                    <form onSubmit={handleSubmit} className="flex-col gap-4">
                        <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} />
                        <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />
                        <button type="submit" className="btn-glaze" style={{ marginTop: 'var(--space-2)', width: '100%' }}>
                            {isLogin ? <><LogIn size={18}/> Login</> : <><UserPlus size={18}/> Register</>}
                        </button>
                    </form>

                    <div style={{ marginTop: 'var(--space-5)', textAlign: 'center' }}>
                        <button 
                            type="button"
                            onClick={() => setIsLogin(!isLogin)} 
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
                </div>
            </div>
        </div>
    );
}
