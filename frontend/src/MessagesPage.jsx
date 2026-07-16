import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { ArrowLeft, Send, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const baseUrl = 'http://localhost:3000';

export default function MessagesPage() {
    const { token, user } = useAuth();
    const [searchParams] = useSearchParams();
    const initialUserId = searchParams.get('user');

    const [conversations, setConversations] = useState([]);
    const [activeUser, setActiveUser] = useState(null); // The user object we are chatting with
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await axios.get(`${baseUrl}/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } });
                setConversations(res.data);
                
                if (initialUserId) {
                    // Try to find the user in conversations, if not, search for them
                    const existing = res.data.find(c => c.id === parseInt(initialUserId));
                    if (existing) {
                        selectConversation(existing);
                    } else {
                        // We don't have them in history, fetch basic user info to start chat
                        const userRes = await axios.get(`${baseUrl}/users/search?q=`, { headers: { Authorization: `Bearer ${token}` } });
                        const target = userRes.data.find(u => u.id === parseInt(initialUserId));
                        if (target) {
                            setActiveUser({ id: target.id, username: target.username, profile_picture: target.profile_picture });
                        }
                    }
                }
            } catch (err) { console.error(err); }
        };
        fetchConversations();

        const socket = io(baseUrl, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        socket.on(`new_message_${user.id}`, (msg) => {
            // Update messages if it's the active chat
            setActiveUser(currentActive => {
                if (currentActive && (msg.sender_id === currentActive.id || msg.receiver_id === currentActive.id)) {
                    setMessages(prev => [...prev, msg]);
                }
                return currentActive;
            });
            // Update conversation list
            fetchConversations();
        });

        return () => socket.disconnect();
    }, [token, user.id, initialUserId]);

    useEffect(() => {
        if (activeUser) {
            const fetchMessages = async () => {
                try {
                    const res = await axios.get(`${baseUrl}/messages/${activeUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    setMessages(res.data);
                    // Mark as read in conversation list locally
                    setConversations(prev => prev.map(c => c.id === activeUser.id ? { ...c, is_read: 1 } : c));
                } catch (err) { console.error(err); }
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
                setSearchResults(res.data.filter(u => u.friend_status === 'accepted')); // Only friends
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
            // The socket will bring the message back, or we can optimistic update. 
            // The socket 'new_message_req.user.id' is emitted to sender too.
        } catch (err) { console.error(err); }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="glass navbar flex items-center gap-4">
                <Link to="/" className="btn-icon" style={{textDecoration: 'none', color: 'var(--text-color)'}}><ArrowLeft size={20}/></Link>
                <h2>Messages</h2>
            </div>
            
            <div className="container" style={{ flex: 1, display: 'flex', gap: '20px', paddingBottom: '20px', overflow: 'hidden' }}>
                {/* Sidebar */}
                <div className="glass" style={{ width: '300px', display: 'flex', flexDirection: 'column', borderRadius: '12px' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', top: 10, left: 10, color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Search friends to message..." 
                                value={searchQuery}
                                onChange={handleSearch}
                                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)' }}
                            />
                        </div>
                        {searchQuery && (
                            <div style={{ marginTop: '10px', background: 'var(--glass-bg)', borderRadius: '8px', overflow: 'hidden' }}>
                                {searchResults.map(u => (
                                    <div key={u.id} onClick={() => selectConversation(u)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }} className="flex items-center gap-2">
                                        {u.profile_picture ? <img src={u.profile_picture.startsWith('http') ? u.profile_picture : `${baseUrl}${u.profile_picture}`} alt="" className="avatar" style={{width: 30, height: 30, borderRadius: '50%', objectFit: 'cover'}} /> : <div className="avatar" style={{width: 30, height: 30, fontSize: '0.8rem'}}>{u.username[0].toUpperCase()}</div>}
                                        <span>{u.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {conversations.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => selectConversation(c)}
                                style={{ 
                                    padding: '16px', 
                                    borderBottom: '1px solid var(--glass-border)', 
                                    cursor: 'pointer',
                                    background: activeUser?.id === c.id ? 'var(--glass-border)' : 'transparent',
                                    fontWeight: (!c.is_read && c.sender_id !== user.id) ? 'bold' : 'normal'
                                }} 
                                className="flex items-center gap-3"
                            >
                                {c.profile_picture ? <img src={c.profile_picture.startsWith('http') ? c.profile_picture : `${baseUrl}${c.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} /> : <div className="avatar" style={{width: 40, height: 40}}>{c.username[0].toUpperCase()}</div>}
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.username}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: (!c.is_read && c.sender_id !== user.id) ? 'var(--text-color)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.sender_id === user.id ? 'You: ' : ''}{c.last_message}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="glass flex-col" style={{ flex: 1, borderRadius: '12px', overflow: 'hidden' }}>
                    {activeUser ? (
                        <>
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }} className="flex items-center gap-3">
                                {activeUser.profile_picture ? <img src={activeUser.profile_picture.startsWith('http') ? activeUser.profile_picture : `${baseUrl}${activeUser.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} /> : <div className="avatar" style={{width: 40, height: 40}}>{activeUser.username[0].toUpperCase()}</div>}
                                <h3 style={{ margin: 0 }}>{activeUser.username}</h3>
                            </div>
                            
                            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {messages.map(m => {
                                    const isMe = m.sender_id === user.id;
                                    return (
                                        <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                            <div style={{ 
                                                background: isMe ? 'var(--primary-color)' : 'var(--input-bg)', 
                                                color: isMe ? '#fff' : 'var(--text-color)',
                                                padding: '10px 14px', 
                                                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                            }}>
                                                {m.content}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                                                {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Type a message..." 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '24px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)' }}
                                />
                                <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '50%' }} disabled={!newMessage.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Select a conversation or search for a friend to start messaging.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
