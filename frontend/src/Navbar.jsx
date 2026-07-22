import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Bell, MessageCircle, LogOut, Search, Sun, Moon, Home, User, Check, CheckCircle, CheckCircle2, Sparkles, EyeOff } from 'lucide-react';
import GlazeLogo from './GlazeLogo';

const baseUrl = 'http://localhost:3000';

export default function Navbar() {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showBaitBadge, setShowBaitBadge] = useState(localStorage.getItem('showBaitBadge') !== 'false');
    const [toast, setToast] = useState('');

    const socketRef = useRef(null);
    const searchRef = useRef(null);
    const notifRef = useRef(null);

    // Sync theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Click outside handlers
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchQuery('');
                setSearchResults([]);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load initial notifications and listen to sockets
    useEffect(() => {
        if (!token || !user) return;

        const fetchNotifications = async () => {
            try {
                const res = await axios.get(`${baseUrl}/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const mapped = res.data.map(n => {
                    let msg = '';
                    if (n.type === 'like') msg = `${n.actor_username} liked your post.`;
                    else if (n.type === 'comment') msg = `${n.actor_username} commented on your post.`;
                    else if (n.type === 'friend_request') msg = `New friend request from ${n.actor_username}!`;
                    else if (n.type === 'friend_accept') msg = `${n.actor_username} accepted your friend request.`;
                    else if (n.type === 'new_post') msg = `${n.actor_username} created a new post.`;
                    else if (n.type === 'tag') msg = `${n.actor_username} tagged you in a post.`;
                    return { id: n.id, msg, is_read: n.is_read, time: new Date(n.created_at) };
                });
                setNotifications(mapped);
            } catch (err) {
                console.error('Error fetching notifications:', err);
            }
        };

        fetchNotifications();

        const socket = io(baseUrl, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        const handleRealtimeNotification = (msg) => {
            setNotifications(prev => [{ id: Date.now(), msg, is_read: 0, time: new Date() }, ...prev]);
            showToastMessage(msg);
        };

        socket.on('new_interaction', (data) => {
            if (data.user_id !== user.id) {
                handleRealtimeNotification(`${data.username} liked a post.`);
            }
        });

        socket.on('new_comment', (data) => {
            if (data.user_id !== user.id) {
                handleRealtimeNotification(`${data.username} commented on a post.`);
            }
        });

        socket.on(`friend_request_${user.id}`, (data) => {
            handleRealtimeNotification(`New friend request from ${data.requester_username}!`);
        });

        socket.on('token_expired', () => {
            showToastMessage("Session expired, logging out...");
            setTimeout(logout, 2000);
        });

        return () => {
            socket.disconnect();
        };
    }, [token, user, logout]);

    // Debounced search
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.trim()) {
                try {
                    setIsSearching(true);
                    const res = await axios.get(`${baseUrl}/users/search?q=${searchQuery}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSearchResults(res.data);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery, token]);

    const showToastMessage = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleAddFriend = async (userId) => {
        try {
            await axios.post(`${baseUrl}/friend-request`, { addressee_id: userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friend_status: 'pending' } : u));
            showToastMessage('Friend request sent!');
        } catch (err) {
            showToastMessage(err.response?.data?.error || 'Error sending request');
        }
    };

    const markNotificationAsRead = async (id) => {
        try {
            await axios.put(`${baseUrl}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (err) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        }
    };

    const toggleGlazeBadge = () => {
        const newVal = !showBaitBadge;
        setShowBaitBadge(newVal);
        localStorage.setItem('showBaitBadge', String(newVal));
        localStorage.setItem('showGlazeBadge', String(newVal));
        window.dispatchEvent(new Event('showBaitBadgeChange'));
        window.dispatchEvent(new Event('showGlazeBadgeChange'));
        showToastMessage(newVal ? 'Glaze badges visible' : 'Glaze badges hidden');
    };

    const toggleTheme = () => {
        setTheme(t => t === 'light' ? 'dark' : 'light');
    };

    const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

    const avatarUrl = user?.profile_picture 
        ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${baseUrl}${user.profile_picture}`)
        : null;

    return (
        <>
            <div className="navbar flex items-center justify-between" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                {/* Zone 1: Logo & Search */}
                <div className="flex items-center gap-4">
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        <GlazeLogo size={32} />
                    </Link>

                    <div style={{ position: 'relative' }} ref={searchRef}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search friends..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--surface-1)',
                                    width: '200px',
                                    fontSize: 'var(--text-sm)'
                                }}
                            />
                        </div>
                        {searchQuery && (
                            <div className="floating-material" style={{ position: 'absolute', top: '100%', left: 0, width: '280px', marginTop: '8px', padding: '12px', zIndex: 101 }}>
                                {isSearching ? <p style={{ fontSize: 'var(--text-xs)', margin: 0, color: 'var(--text-tertiary)' }}>Searching...</p> : null}
                                {!isSearching && searchResults.length === 0 ? <p style={{ fontSize: 'var(--text-xs)', margin: 0, color: 'var(--text-tertiary)' }}>No users found.</p> : null}
                                {searchResults.map(u => (
                                    <div key={u.id} className="flex items-center justify-between" style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-1)', marginBottom: '4px' }}>
                                        <div className="flex items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => { navigate(`/profile/${u.username}`); setSearchQuery(''); }}>
                                            {u.profile_picture ? (
                                                <img src={u.profile_picture.startsWith('http') ? u.profile_picture : `${baseUrl}${u.profile_picture}`} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div className="avatar" style={{ width: 24, height: 24, fontSize: '0.7rem' }}>{(u.username || '?')[0].toUpperCase()}</div>
                                            )}
                                            <span style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{u.username}</span>
                                        </div>
                                        <button
                                            disabled={u.friend_status === 'accepted' || u.friend_status === 'pending'}
                                            onClick={() => handleAddFriend(u.id)}
                                            className="btn-primary"
                                            style={{ padding: '4px 10px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-sm)', opacity: (u.friend_status ? 0.5 : 1) }}
                                        >
                                            {u.friend_status === 'accepted' ? 'Friends' : u.friend_status === 'pending' ? 'Pending' : 'Add'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Zone 2 & 3: Nav links & Actions */}
                <div className="flex items-center gap-4 desktop-nav-actions">
                    {/* Home Link */}
                    <Link to="/" className="btn-icon" title="Feed" style={{ color: location.pathname === '/' ? 'var(--accent)' : 'var(--text-secondary)', minWidth: 40, minHeight: 40 }}>
                        <Home size={20} />
                    </Link>

                    {/* Glaze Badge Toggle */}
                    <button
                        onClick={toggleGlazeBadge}
                        className="btn-icon"
                        title={showBaitBadge ? "Hide Glaze Badge" : "Show Glaze Badge"}
                        style={{ minWidth: 40, minHeight: 40 }}
                    >
                        {showBaitBadge ? <Sparkles size={18} /> : <EyeOff size={18} />}
                    </button>

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className="btn-icon" title="Toggle Theme" style={{ minWidth: 40, minHeight: 40 }}>
                        {theme === 'light' ? <Moon size={20} className="theme-icon" /> : <Sun size={20} className="theme-icon" />}
                    </button>

                    {/* Messages Link */}
                    <Link to="/messages" className="btn-icon" style={{ color: location.pathname === '/messages' ? 'var(--accent)' : 'var(--text-secondary)', minWidth: 40, minHeight: 40 }} title="Messages">
                        <MessageCircle size={20} />
                    </Link>

                    {/* Notifications Bell Dropdown */}
                    <div style={{ position: 'relative' }} ref={notifRef}>
                        <button onClick={() => setShowNotifications(!showNotifications)} className="btn-icon" title="Notifications" style={{ minWidth: 40, minHeight: 40 }}>
                            <Bell size={20} />
                            {unreadNotificationsCount > 0 && (
                                <span className="notif-badge-anim" style={{ position: 'absolute', top: 4, right: 4, background: 'var(--danger)', width: 14, height: 14, borderRadius: '50%', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="floating-material" style={{ position: 'absolute', right: 0, top: '48px', width: '320px', padding: '12px', zIndex: 101 }}>
                                <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: 'var(--text-base)' }}>Notifications</h4>
                                </div>
                                {notifications.length === 0 ? <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '12px 0', textAlign: 'center' }}>No new notifications</p> : null}
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => { markNotificationAsRead(n.id); setShowNotifications(false); }}
                                        style={{
                                            padding: '10px',
                                            marginBottom: '4px',
                                            fontSize: 'var(--text-sm)',
                                            cursor: 'pointer',
                                            fontWeight: n.is_read ? 'var(--font-regular)' : 'var(--font-semibold)',
                                            opacity: n.is_read ? 0.7 : 1,
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--surface-1)',
                                            color: 'var(--text-main)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
                                        <span style={{ flex: 1 }}>{n.msg}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profile Link */}
                    <Link to={`/profile/${user?.username}`} className="flex items-center gap-2" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-main)', textDecoration: 'none', fontSize: 'var(--text-sm)', minHeight: 40 }}>
                        <span className="glaze-avatar-ring">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="avatar" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div className="avatar" style={{ width: 26, height: 26, fontSize: '0.75rem' }}>{(user?.username || '?')[0].toUpperCase()}</div>
                            )}
                        </span>
                        <span className="navbar-username-text">{user?.username}</span>
                    </Link>

                    {/* Logout Button */}
                    <button onClick={logout} className="btn-icon" title="Logout" style={{ color: 'var(--text-secondary)', minWidth: 40, minHeight: 40 }}><LogOut size={20} /></button>
                </div>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <div className="mobile-bottom-nav">
                <Link to="/" style={{ color: location.pathname === '/' ? 'var(--accent)' : 'var(--text-secondary)' }} title="Home">
                    <Home size={22} />
                </Link>
                <Link to="/messages" style={{ color: location.pathname === '/messages' ? 'var(--accent)' : 'var(--text-secondary)' }} title="Messages">
                    <MessageCircle size={22} />
                </Link>
                <button onClick={() => setShowNotifications(!showNotifications)} style={{ color: 'var(--text-secondary)', background: 'transparent', position: 'relative' }} title="Notifications">
                    <Bell size={22} />
                    {unreadNotificationsCount > 0 && (
                        <span className="notif-badge-anim" style={{ position: 'absolute', top: 4, right: 12, background: 'var(--danger)', width: 10, height: 10, borderRadius: '50%' }} />
                    )}
                </button>
                <Link to={`/profile/${user?.username}`} style={{ color: location.pathname.startsWith('/profile') ? 'var(--accent)' : 'var(--text-secondary)' }} title="Profile">
                    <User size={22} />
                </Link>
            </div>

            {toast && <div className="toast" style={{ zIndex: 1000 }}><CheckCircle size={16} style={{ color: 'var(--accent)' }} /> <span>{toast}</span></div>}
        </>
    );
}
