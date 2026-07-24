import { createContext, useState, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

    const login = async (username, password) => {
        const res = await axios.post('http://localhost:3000/auth/login', { username, password });
        if (res.data.requires2FA) {
            return { requires2FA: true, loginTempToken: res.data.loginTempToken };
        }
        completeSession(res.data.token, res.data.user);
        return { requires2FA: false };
    };

    const verifyLogin2FA = async (loginTempToken, code) => {
        const res = await axios.post('http://localhost:3000/auth/login-verify-2fa', { loginTempToken, code });
        completeSession(res.data.token, res.data.user);
    };

    const registerInit = async (username, password) => {
        const res = await axios.post('http://localhost:3000/auth/register-init', { username, password });
        return res.data; // { tempToken, qrCodeUrl, secretKey }
    };

    const registerResend2FA = async (tempToken) => {
        const res = await axios.post('http://localhost:3000/auth/register-resend-2fa', { tempToken });
        return res.data; // { tempToken, qrCodeUrl, secretKey }
    };

    const registerVerify2FA = async (tempToken, code) => {
        const res = await axios.post('http://localhost:3000/auth/register-verify-2fa', { tempToken, code });
        completeSession(res.data.token, res.data.user);
    };

    const completeSession = (newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const updateUser = (updatedFields) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...updatedFields };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ 
            token, 
            user, 
            login, 
            verifyLogin2FA, 
            registerInit, 
            registerResend2FA, 
            registerVerify2FA, 
            logout, 
            updateUser 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
