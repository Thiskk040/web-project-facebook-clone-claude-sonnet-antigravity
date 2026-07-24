import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { ArrowLeft, Send, Search, Ghost, MessageSquare } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';

const baseUrl = 'http://localhost:3000';

export default function MessagesPage() {
    const { token, user } = useAuth();
    const [searchParams] = useSearchParams();
    const initialUserId = searchParams.get('user');

    const [conversations, setConversations] = useState([]);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [activeUser, setActiveUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                setLoadingConvos(true);
                const res = await axios.get(`${baseUrl}/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } });
                setConversations(res.data);
                
                if (initialUserId) {
                    const existing = res.data.find(c => c.id === parseInt(initialUserId));
                    if (existing) {
                        selectConversation(existing);
                    } else {
                        try {
                            const userRes = await axios.get(`${baseUrl}/users/by-id/${initialUserId}`, { headers: { Authorization: `Bearer ${token}` } });
                            if (userRes.data) {
                                setActiveUser({ id: userRes.data.id, username: userRes.data.username, profile_picture: userRes.data.profile_picture });
                            }
                        } catch (err) {
                            console.error("Error loading chat target user:", err);
                        }
                    }
                }
            } catch (err) { console.error(err); }
            finally { setLoadingConvos(false); }
        };
        fetchConversations();

        const socket = io(baseUrl, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        socket.on(`new_message_${user.id}`, (msg) => {
            setActiveUser(currentActive => {
                if (currentActive && (msg.sender_id === currentActive.id || msg.receiver_id === currentActive.id)) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                }
                return currentActive;
            });
            setConversations(prev => {
                const existing = prev.find(c => c.id === (msg.sender_id === user.id ? msg.receiver_id : msg.sender_id));
                if (existing) {
                    return prev.map(c => c.id === existing.id ? { ...c, last_message: msg.content, created_at: msg.created_at, is_read: (msg.sender_id === user.id ? 1 : 0), sender_id: msg.sender_id } : c);
                } else {
                    return prev;
                }
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [token, user, initialUserId]);

    useEffect(() => {
        if (activeUser) {
            const fetchMessages = async () => {
                try {
                    setLoadingMsgs(true);
                    const res = await axios.get(`${baseUrl}/messages/${activeUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    setMessages(res.data);
                    setConversations(prev => prev.map(c => c.id === activeUser.id ? { ...c, is_read: 1 } : c));
                } catch (err) { console.error(err); }
                finally { setLoadingMsgs(false); }
            };
            fetchMessages();
        }
    }, [activeUser, token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.trim()) {
            try {
                const res = await axios.get(`${baseUrl}/users/search?q=${q}`, { headers: { Authorization: `Bearer ${token}` } });
                setSearchResults(res.data.filter(u => u.friend_status === 'accepted'));
            } catch (e) {}
        } else {
            setSearchResults([]);
        }
    };

    const selectConversation = (u) => {
        setActiveUser({ id: u.id, username: u.username, profile_picture: u.profile_picture });
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeUser) return;
        try {
            await axios.post(`${baseUrl}/messages`, { receiver_id: activeUser.id, content: newMessage }, { headers: { Authorization: `Bearer ${token}` } });
            setNewMessage('');
        } catch (err) { console.error(err); }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            
            <div className="container" style={{ flex: 1, display: 'flex', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', overflow: 'hidden' }}>
                {/* Sidebar Column */}
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                    <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text-tertiary)' }} />
                            <input 
                                type="text" 
                                placeholder="Search friends to message..." 
                                value={searchQuery}
                                onChange={handleSearch}
                                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'var(--surface-1)', fontSize: 'var(--text-sm)' }}
                            />
                        </div>
                        {searchQuery && (
                            <div style={{ marginTop: 'var(--space-2)', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                                {searchResults.map(u => (
                                    <div key={u.id} onClick={() => selectConversation(u)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', gap: 'var(--space-3)' }} className="flex items-center">
                                        {u.profile_picture ? <img src={u.profile_picture.startsWith('http') ? u.profile_picture : `${baseUrl}${u.profile_picture}`} alt="" className="avatar" style={{width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0}} /> : <div className="avatar" style={{width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0}}>{(u.username || '?')[0].toUpperCase()}</div>}
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{u.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingConvos ? (
                            <div style={{ padding: '8px' }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={`sk-conv-${i}`} className="flex items-center gap-3" style={{ padding: '12px 8px', marginBottom: '4px' }}>
                                        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div className="skeleton" style={{ width: '100px', height: '14px', marginBottom: '6px' }} />
                                            <div className="skeleton" style={{ width: '130px', height: '10px' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        {!loadingConvos && conversations.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => selectConversation(c)}
                                style={{ 
                                    padding: 'var(--space-4)', 
                                    borderBottom: '1px solid var(--border-subtle)', 
                                    cursor: 'pointer',
                                    background: activeUser?.id === c.id ? 'var(--surface-1)' : 'transparent',
                                    fontWeight: (!c.is_read && c.sender_id !== user.id) ? 'var(--font-bold)' : 'var(--font-regular)',
                                    gap: 'var(--space-3)'
                                }} 
                                className="flex items-center"
                            >
                                {c.profile_picture ? <img src={c.profile_picture.startsWith('http') ? c.profile_picture : `${baseUrl}${c.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0}} /> : <div className="avatar" style={{width: 40, height: 40, flexShrink: 0}}>{(c.username || '?')[0].toUpperCase()}</div>}
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 'var(--text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{c.username}</span>
                                    </div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: (!c.is_read && c.sender_id !== user.id) ? 'var(--text-main)' : 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.sender_id === user.id ? 'You: ' : ''}{c.last_message}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div style={{ flex: 1, borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {activeUser ? (
                        <>
                            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-0)', gap: 'var(--space-3)' }} className="flex items-center">
                                {activeUser.profile_picture ? <img src={activeUser.profile_picture.startsWith('http') ? activeUser.profile_picture : `${baseUrl}${activeUser.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0}} /> : <div className="avatar" style={{width: 40, height: 40, flexShrink: 0}}>{(activeUser.username || '?')[0].toUpperCase()}</div>}
                                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--text-main)' }}>{activeUser.username}</h3>
                            </div>
                            
                            <div style={{ flex: 1, padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {loadingMsgs ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="skeleton" style={{ width: '180px', height: '36px', borderRadius: '18px', alignSelf: 'flex-start' }} />
                                        <div className="skeleton" style={{ width: '220px', height: '36px', borderRadius: '18px', alignSelf: 'flex-end' }} />
                                        <div className="skeleton" style={{ width: '140px', height: '36px', borderRadius: '18px', alignSelf: 'flex-start' }} />
                                        <div className="skeleton" style={{ width: '200px', height: '36px', borderRadius: '18px', alignSelf: 'flex-end' }} />
                                    </div>
                                ) : (
                                    messages.map((m, idx) => {
                                    const isMe = m.sender_id === user.id;
                                    const isGhosted = isMe && m.is_read === 1 && m.hours_since_seen >= 24;
                                    const prevMsg = messages[idx - 1];
                                    const isGrouped = prevMsg && prevMsg.sender_id === m.sender_id && (new Date(m.created_at) - new Date(prevMsg.created_at) < 120000);

                                    return (
                                        <div 
                                            key={m.id} 
                                            style={{ 
                                                alignSelf: isMe ? 'flex-end' : 'flex-start', 
                                                maxWidth: '70%',
                                                display: 'flex',
                                                gap: 'var(--space-2)',
                                                alignItems: 'center',
                                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                marginTop: isGrouped ? 'var(--space-1)' : 'var(--space-4)'
                                            }}
                                        >
                                            {isGhosted && (
                                                <Ghost 
                                                    size={18} 
                                                    style={{ 
                                                        color: 'var(--danger)', 
                                                        opacity: 0.7, 
                                                        animation: 'pulse 2s infinite' 
                                                    }} 
                                                    title={`Unanswered for ${Math.floor(m.hours_since_seen)} hours`}
                                                />
                                            )}
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ 
                                                    background: isMe ? 'var(--accent)' : 'var(--surface-1)', 
                                                    color: isMe ? 'var(--accent-contrast)' : 'var(--text-main)',
                                                    padding: '10px 14px', 
                                                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    border: isMe ? 'none' : '1px solid var(--border-subtle)',
                                                    boxShadow: 'var(--shadow-1)',
                                                    fontSize: 'var(--text-base)',
                                                    lineHeight: 'var(--leading-thai)'
                                                }}>
                                                    {m.content}
                                                </div>
                                                {!isGrouped && (
                                                    <div style={{ 
                                                        fontSize: 'var(--text-xs)', 
                                                        color: 'var(--text-tertiary)', 
                                                        marginTop: '4px', 
                                                        textAlign: isMe ? 'right' : 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                        gap: '4px'
                                                    }}>
                                                        <span>{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        {isMe && (
                                                            m.is_read === 1 ? (
                                                                m.hours_since_seen >= 24 ? (
                                                                    <span style={{ color: 'var(--danger)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                                        · <Ghost size={12} /> Seen {Math.floor(m.hours_since_seen / 24)} days ago
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: 'var(--accent)' }}> · Seen</span>
                                                                )
                                                            ) : (
                                                                <span> · Sent</span>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }))}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            <form onSubmit={handleSend} style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-3)' }}>
                                <input 
                                    type="text" 
                                    placeholder="Type a message..." 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    style={{ flex: 1, padding: '12px var(--space-4)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}
                                />
                                <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '50%', minWidth: 44, minHeight: 44 }} disabled={!newMessage.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', textAlign: 'center', gap: 'var(--space-3)' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(24, 119, 242, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
                                <MessageSquare size={32} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-main)', fontWeight: 'var(--font-semibold)' }}>
                                Your Messages
                            </h3>
                            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', maxWidth: '320px', lineHeight: 'var(--leading-normal)' }}>
                                Select a conversation from the left sidebar or search for a friend to start messaging.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
