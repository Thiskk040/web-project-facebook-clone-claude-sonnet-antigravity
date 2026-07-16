import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Image, Send, Heart, LogOut, MessageSquare, Trash2, Bell, Check, UserPlus, Users, MessageCircle } from 'lucide-react';

const baseUrl = 'http://localhost:3000';

export default function FeedPage() {
    const { token, user, logout } = useAuth();
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [toast, setToast] = useState('');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
    // New Feature States
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [openComments, setOpenComments] = useState({}); // { postId: boolean }
    const [postComments, setPostComments] = useState({}); // { postId: [] }
    const [commentInputs, setCommentInputs] = useState({}); // { postId: '' }

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Mention State
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionResults, setMentionResults] = useState([]);
    const [mentionCursorPos, setMentionCursorPos] = useState(0);

    const socketRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Fetch Initial Data
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [postsRes, suggestedRes, requestsRes, notifsRes] = await Promise.all([
                    axios.get(`${baseUrl}/posts`, config),
                    axios.get(`${baseUrl}/users/suggested`, config),
                    axios.get(`${baseUrl}/friend-requests/pending`, config),
                    axios.get(`${baseUrl}/notifications`, config)
                ]);
                setPosts(postsRes.data);
                setSuggestedUsers(suggestedRes.data);
                setFriendRequests(requestsRes.data);
                
                const mappedNotifs = notifsRes.data.map(n => {
                    let msg = '';
                    if (n.type === 'like') msg = `${n.actor_username} liked your post.`;
                    else if (n.type === 'comment') msg = `${n.actor_username} commented on your post.`;
                    else if (n.type === 'friend_request') msg = `New friend request from ${n.actor_username}!`;
                    else if (n.type === 'friend_accept') msg = `${n.actor_username} accepted your friend request.`;
                    else if (n.type === 'new_post') msg = `${n.actor_username} created a new post.`;
                    else if (n.type === 'tag') msg = `${n.actor_username} tagged you in a post.`;
                    return { id: n.id, msg, is_read: n.is_read, time: new Date(n.created_at) };
                });
                setNotifications(mappedNotifs);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();

        // Setup Socket
        const socket = io(baseUrl, { auth: { token }, transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('new_post', (post) => {
            setPosts(prev => [{...post, like_count: 0, comment_count: 0}, ...prev]);
        });

        socket.on('new_interaction', (data) => {
            setPosts(prev => prev.map(p => p.id === data.post_id ? { ...p, like_count: p.like_count + 1 } : p));
            if(data.user_id !== user.id) {
                addNotification(`${data.username} liked a post.`);
            }
        });

        socket.on('new_comment', (data) => {
            setPosts(prev => prev.map(p => p.id === data.post_id ? { ...p, comment_count: p.comment_count + 1 } : p));
            setPostComments(prev => {
                if (!prev[data.post_id]) return prev;
                return { ...prev, [data.post_id]: [...prev[data.post_id], data] };
            });
            if(data.user_id !== user.id) {
                addNotification(`${data.username} commented on a post.`);
            }
        });

        socket.on('post_deleted', (data) => {
            setPosts(prev => prev.filter(p => p.id !== parseInt(data.id)));
        });

        socket.on(`friend_request_${user.id}`, (data) => {
            addNotification(`New friend request from ${data.requester_username}!`);
            setFriendRequests(prev => [...prev, { id: data.requester_id, username: data.requester_username, created_at: new Date() }]);
        });

        socket.on('token_expired', () => {
            showToast("Session expired, logging out...");
            setTimeout(logout, 2000);
        });

        return () => socket.disconnect();
    }, [token, user, logout]);

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.trim()) {
                try {
                    setIsSearching(true);
                    const res = await axios.get(`${baseUrl}/users/search?q=${searchQuery}`, { headers: { Authorization: `Bearer ${token}` } });
                    setSearchResults(res.data);
                } catch(e) { console.error(e); }
                finally { setIsSearching(false); }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery, token]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const addNotification = (msg) => {
        setNotifications(prev => [{ id: Date.now(), msg, is_read: 0, time: new Date() }, ...prev]);
        showToast(msg);
    };

    const markNotificationAsRead = async (id) => {
        try {
            await axios.put(`${baseUrl}/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (err) {
            // Ignore if fake ID from socket
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        }
    };

    const handleContentChange = async (e) => {
        const text = e.target.value;
        setContent(text);
        const cursorPos = e.target.selectionStart;
        
        const textBeforeCursor = text.slice(0, cursorPos);
        const match = textBeforeCursor.match(/@(\w*)$/);
        
        if (match) {
            setMentionQuery(match[1]);
            setMentionCursorPos(cursorPos);
            try {
                const res = await axios.get(`${baseUrl}/users/search?q=${match[1]}`, { headers: { Authorization: `Bearer ${token}` } });
                setMentionResults(res.data);
            } catch(e) {}
        } else {
            setMentionQuery(null);
            setMentionResults([]);
        }
    };

    const handleSelectMention = (username) => {
        const textBefore = content.slice(0, mentionCursorPos).replace(/@\w*$/, `@${username} `);
        const textAfter = content.slice(mentionCursorPos);
        setContent(textBefore + textAfter);
        setMentionQuery(null);
        setMentionResults([]);
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!content && !image) return;
        const formData = new FormData();
        formData.append('content', content);
        if (image) formData.append('image', image);

        try {
            await axios.post(`${baseUrl}/posts`, formData, { headers: { Authorization: `Bearer ${token}` } });
            setContent(''); setImage(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            showToast('Post created!');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error creating post');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!confirm("Delete this post?")) return;
        try {
            await axios.delete(`${baseUrl}/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
            showToast(err.response?.data?.error || 'Error deleting post');
        }
    };

    const handleLike = async (post) => {
        try {
            if (post.has_liked) {
                await axios.delete(`${baseUrl}/interactions/${post.id}/like`, { headers: { Authorization: `Bearer ${token}` } });
                setPosts(prev => prev.map(p => p.id === post.id ? { ...p, like_count: Math.max(0, p.like_count - 1), has_liked: 0 } : p));
            } else {
                await axios.post(`${baseUrl}/interactions`, { post_id: post.id, type: 'like' }, { headers: { Authorization: `Bearer ${token}` } });
                setPosts(prev => prev.map(p => p.id === post.id ? { ...p, has_liked: 1 } : p));
            }
        } catch (err) {
            showToast('Error updating like');
        }
    };

    const handleDeleteComment = async (commentId, postId) => {
        if (!confirm("Delete this comment?")) return;
        try {
            await axios.delete(`${baseUrl}/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
            setPostComments(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }));
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p));
        } catch (err) {
            showToast('Error deleting comment');
        }
    };

    const toggleComments = async (postId) => {
        const isOpen = openComments[postId];
        setOpenComments(prev => ({ ...prev, [postId]: !isOpen }));
        
        if (!isOpen && !postComments[postId]) {
            try {
                const res = await axios.get(`${baseUrl}/posts/${postId}/comments`, { headers: { Authorization: `Bearer ${token}` } });
                setPostComments(prev => ({ ...prev, [postId]: res.data }));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const submitComment = async (postId) => {
        const text = commentInputs[postId];
        if (!text) return;
        try {
            await axios.post(`${baseUrl}/comments`, { post_id: postId, content: text }, { headers: { Authorization: `Bearer ${token}` } });
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        } catch (err) {
            showToast(err.response?.data?.error || 'Error commenting');
        }
    };

    const handleAddFriend = async (userId) => {
        try {
            await axios.post(`${baseUrl}/friend-request`, { addressee_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
            setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
            showToast('Friend request sent!');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error sending request');
        }
    };

    const handleAcceptFriend = async (requesterId) => {
        try {
            await axios.put(`${baseUrl}/friend-request/accept`, { requester_id: requesterId }, { headers: { Authorization: `Bearer ${token}` } });
            setFriendRequests(prev => prev.filter(r => r.id !== requesterId));
            showToast('Friend request accepted!');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error accepting request');
        }
    };

    const renderPostContent = (text) => {
        if (!text) return null;
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const username = part.substring(1);
                return <Link key={i} to={`/profile/${username}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>{part}</Link>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div>
            <div className="glass navbar flex items-center justify-between" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                <div className="flex items-center gap-4">
                    <h2>CloneBook</h2>
                    
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="text" 
                            placeholder="Search friends..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)' }}
                        />
                        {searchQuery && (
                            <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, width: '250px', marginTop: '8px', padding: '10px', borderRadius: '12px', zIndex: 101 }}>
                                {isSearching ? <p style={{ fontSize: '0.8rem' }}>Searching...</p> : null}
                                {!isSearching && searchResults.length === 0 ? <p style={{ fontSize: '0.8rem' }}>No users found.</p> : null}
                                {searchResults.map(u => (
                                    <div key={u.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                                        <span style={{ fontWeight: 500 }}>{u.username}</span>
                                        <button 
                                            disabled={u.friend_status === 'accepted' || u.friend_status === 'pending'} 
                                            onClick={() => { handleAddFriend(u.id); setSearchQuery(''); }} 
                                            className="btn-primary" 
                                            style={{ padding: '4px 8px', fontSize: '0.7rem', opacity: (u.friend_status ? 0.5 : 1) }}
                                        >
                                            {u.friend_status === 'accepted' ? 'Friends' : u.friend_status === 'pending' ? 'Pending' : 'Add'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="btn-icon">
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    
                    <Link to="/messages" className="btn-icon" style={{color: 'var(--text-color)'}}>
                        <MessageCircle size={20}/>
                    </Link>
                    
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowNotifications(!showNotifications)} className="btn-icon">
                            <Bell size={20}/>
                            {notifications.filter(n => !n.is_read).length > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: 'red', width: 10, height: 10, borderRadius: '50%' }}></span>}
                        </button>
                        {showNotifications && (
                            <div className="glass" style={{ position: 'absolute', right: 0, top: '40px', width: '300px', padding: '10px', borderRadius: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                                <h4>Notifications</h4>
                                {notifications.length === 0 ? <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>No new notifications</p> : null}
                                {notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => markNotificationAsRead(n.id)}
                                        style={{ 
                                            padding: '8px', 
                                            borderBottom: '1px solid var(--glass-border)', 
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            fontWeight: n.is_read ? 'normal' : 'bold',
                                            opacity: n.is_read ? 0.7 : 1
                                        }}
                                    >
                                        {n.msg}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <Link to={`/profile/${user?.username}`} style={{ fontWeight: 600, color: 'var(--text-color)', textDecoration: 'none' }}>{user?.username}</Link>
                    <button onClick={logout} className="btn-icon" title="Logout"><LogOut size={20}/></button>
                </div>
            </div>

            <div className="container flex gap-4" style={{ maxWidth: '1000px', alignItems: 'flex-start' }}>
                {/* Main Feed Column */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <form className="glass post-card flex-col gap-4" onSubmit={handlePost} style={{ position: 'relative' }}>
                        <textarea 
                            placeholder={`What's on your mind, ${user?.username}?`}
                            rows={3} value={content} onChange={handleContentChange}
                            style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: '100%', outline: 'none', resize: 'none' }}
                        />
                        
                        {mentionQuery !== null && (
                            <div className="glass" style={{ position: 'absolute', top: '100%', left: '20px', width: '250px', zIndex: 10, padding: '10px', borderRadius: '12px' }}>
                                {mentionResults.length === 0 ? <p style={{ fontSize: '0.8rem' }}>No users found.</p> : null}
                                {mentionResults.map(u => (
                                    <div key={u.id} onClick={() => handleSelectMention(u.username)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}>
                                        {u.username}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                            <div className="flex items-center gap-2">
                                <label className="btn-icon" style={{ cursor: 'pointer' }}>
                                    <Image size={20}/>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImage(e.target.files[0])} ref={fileInputRef} />
                                </label>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{image ? image.name : ''}</span>
                            </div>
                            <button type="submit" className="btn-primary" disabled={!content && !image}>
                                <Send size={18}/> Post
                            </button>
                        </div>
                    </form>

                    {posts.map(post => (
                        <div key={post.id} className="glass post-card">
                            <div className="post-header justify-between">
                                <div className="flex items-center gap-2">
                                    {post.profile_picture ? (
                                        <img src={post.profile_picture.startsWith('http') ? post.profile_picture : `${baseUrl}${post.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        <div className="avatar">{post.username[0].toUpperCase()}</div>
                                    )}
                                    <div>
                                        <Link to={`/profile/${post.username}`} style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-color)', textDecoration: 'none' }}>{post.username}</Link>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(post.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                {post.user_id === user.id && (
                                    <button onClick={() => handleDeletePost(post.id)} className="btn-icon" style={{color: '#ef4444'}}><Trash2 size={18}/></button>
                                )}
                            </div>
                            
                            <p style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{renderPostContent(post.content)}</p>
                            {post.image_url && <img src={`${baseUrl}${post.image_url}`} alt="Post" className="post-img" />}
                            
                            <div className="flex items-center justify-between" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                                <span>{post.like_count || 0} Likes</span>
                                <span>{post.comment_count || 0} Comments</span>
                            </div>

                            <div className="interactions flex justify-between" style={{ marginTop: '8px', paddingTop: '8px' }}>
                                <button className="interaction-btn flex items-center gap-2" onClick={() => handleLike(post)} style={{flex: 1, justifyContent: 'center', color: post.has_liked ? 'var(--primary-color)' : 'inherit'}}>
                                    <Heart size={18} fill={post.has_liked ? 'var(--primary-color)' : 'none'} /> {post.has_liked ? 'Liked' : 'Like'}
                                </button>
                                <button className="interaction-btn flex items-center gap-2" onClick={() => toggleComments(post.id)} style={{flex: 1, justifyContent: 'center'}}>
                                    <MessageSquare size={18} /> Comment
                                </button>
                            </div>

                            {/* Comments Section */}
                            {openComments[post.id] && (
                                <div style={{ marginTop: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                                    <div className="flex gap-2" style={{ marginBottom: '16px' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Write a comment..." 
                                            value={commentInputs[post.id] || ''}
                                            onChange={e => setCommentInputs(prev => ({...prev, [post.id]: e.target.value}))}
                                            onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                                        />
                                        <button onClick={() => submitComment(post.id)} className="btn-primary" style={{padding: '8px 16px'}}><Send size={16}/></button>
                                    </div>
                                    
                                    <div className="flex-col gap-4">
                                        {(postComments[post.id] || []).map(comment => (
                                            <div key={comment.id} className="flex gap-2">
                                                <div className="avatar" style={{width: 30, height: 30, fontSize: '0.9rem'}}>{comment.username[0].toUpperCase()}</div>
                                                <div className="glass flex items-center justify-between" style={{ padding: '8px 12px', borderRadius: '12px', flex: 1, background: 'var(--input-bg)' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', marginRight: '8px' }}>{comment.username}</span>
                                                        <span style={{ fontSize: '0.9rem' }}>{comment.content}</span>
                                                    </div>
                                                    {comment.user_id === user.id && (
                                                        <button onClick={() => handleDeleteComment(comment.id, post.id)} className="btn-icon" style={{color: '#ef4444', padding: '4px'}}><Trash2 size={14}/></button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Sidebar */}
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }} className="sidebar-hide-mobile">
                    {friendRequests.length > 0 && (
                        <div className="glass post-card" style={{ padding: '16px' }}>
                            <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={18}/> Friend Requests
                            </h4>
                            {friendRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 500 }}>{req.username}</span>
                                    <button onClick={() => handleAcceptFriend(req.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}><Check size={14}/> Accept</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="glass post-card" style={{ padding: '16px' }}>
                        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserPlus size={18}/> Suggested Friends
                        </h4>
                        {suggestedUsers.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No suggestions right now.</p> : null}
                        {suggestedUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                                <div className="flex items-center gap-2">
                                    {u.profile_picture ? (
                                        <img src={u.profile_picture.startsWith('http') ? u.profile_picture : `${baseUrl}${u.profile_picture}`} alt="" className="avatar" style={{width: 24, height: 24, borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        <div className="avatar" style={{width: 24, height: 24, fontSize:'0.7rem'}}>{u.username[0].toUpperCase()}</div>
                                    )}
                                    <Link to={`/profile/${u.username}`} style={{ fontWeight: 500, color: 'var(--text-color)', textDecoration: 'none' }}>{u.username}</Link>
                                </div>
                                <button onClick={() => handleAddFriend(u.id)} className="btn-icon"><UserPlus size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
