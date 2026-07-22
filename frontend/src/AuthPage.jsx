import { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

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
        <div className="auth-container">
            <div className="glass auth-box">
                <h1 style={{ marginBottom: '10px' }}>{isLogin ? 'Welcome Back' : 'Join Us'}</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Complete Facebook Clone</p>
                
                {error && <div style={{ color: '#ef4444', marginBottom: '20px', fontWeight: '500' }}>{error}</div>}

                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} />
                    <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" className="btn-primary" style={{ marginTop: '10px', width: '100%' }}>
                        {isLogin ? <><LogIn size={20}/> Login</> : <><UserPlus size={20}/> Register</>}
                    </button>
                </form>

                <div style={{ marginTop: '24px' }}>
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
    );
}
