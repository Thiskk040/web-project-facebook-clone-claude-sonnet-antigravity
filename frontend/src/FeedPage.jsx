import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Image, Send, Heart, LogOut, MessageSquare, Trash2, Bell, Check, UserPlus, Users, MessageCircle } from 'lucide-react';
import Navbar from './Navbar';

const baseUrl = 'http://localhost:3000';

const fakeAds = [
    {
        id: 'ad-1',
        title: "Nobody",
        content: "Sponsored by: Nobody. This is just a reminder to drink water.",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-2',
        title: "Your Future Self",
        content: "Sponsored by: Your Future Self. Go to sleep before 1 AM tonight. Seriously, scrolling won't make you happier.",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-3',
        title: "Office Worker Association",
        content: "Ad · กด Skip ไม่ได้เพราะมันไม่ใช่โฆษณาจริง มันคือการเตือนให้ลุกไปยืดเส้นยืดสาย สูดหายใจเข้าลึกๆ 5 วินาที",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-4',
        title: "Orthopedic Surgeon",
        content: "Sponsored: ก้มหัวเล่นมือถือแบบนี้ หมอนรองกระดูกคอขอร้องไห้ กรุณาปรับระดับสายตาขึ้นมา 10 องศาด้วยครับ",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-5',
        title: "Blink Warning System",
        content: "Ad · ตาคุณแห้งแล้วนะจ๊ะ กรุณากะพริบตาถี่ๆ 5 ครั้ง หรือละสายตาไปมองต้นไม้สีเขียวนอกหน้าต่างสัก 10 วินาที",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-6',
        title: "Your Bank Account",
        content: "Sponsored: เงินในบัญชีเตือนว่า ไม่มีความจำเป็นต้องซื้อของชิ้นถ้าปในตะกร้าสินค้า ปิดแอปช็อปปิ้งแล้วไปนอนซะ",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-7',
        title: "Social Media Detox Dept.",
        content: "Ad · คุณไถฟีดมานานเกินไปแล้ว เพื่อสุขภาพจิตที่ดี ลองปิดหน้าจอนี้แล้วคุยกับคนข้างๆ หรือหมาแมวสักครู่",
        badge: "Sponsored (ล้อเลียน)"
    },
    {
        id: 'ad-8',
        title: "The Air Quality Monitor",
        content: "Sponsored by: The Universe. Take a deep breath. Exhale. You are doing fine. Now go get some actual oxygen.",
        badge: "Sponsored (ล้อเลียน)"
    }
];

export default function FeedPage() {
    const { token, user, logout } = useAuth();
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [toast, setToast] = useState('');
    
    // New Feature States
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [openComments, setOpenComments] = useState({});
    const [postComments, setPostComments] = useState({});
    const [commentInputs, setCommentInputs] = useState({});
    const [animatingLikes, setAnimatingLikes] = useState({});
    
    // Mention State
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionResults, setMentionResults] = useState([]);
    const [mentionCursorPos, setMentionCursorPos] = useState(0);

    const [showBaitBadge, setShowBaitBadge] = useState(localStorage.getItem('showBaitBadge') !== 'false');
    const [activeRoast, setActiveRoast] = useState(null);

    const socketRef = useRef(null);
    const fileInputRef = useRef(null);

    // Sync showBaitBadge status from Navbar events
    useEffect(() => {
        const handleBadgeChange = () => {
            setShowBaitBadge(localStorage.getItem('showBaitBadge') !== 'false');
        };
        window.addEventListener('showBaitBadgeChange', handleBadgeChange);
        return () => window.removeEventListener('showBaitBadgeChange', handleBadgeChange);
    }, []);

    useEffect(() => {
        // Fetch Initial Data
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [postsRes, suggestedRes, requestsRes] = await Promise.all([
                    axios.get(`${baseUrl}/posts`, config),
                    axios.get(`${baseUrl}/users/suggested`, config),
                    axios.get(`${baseUrl}/friend-requests/pending`, config)
                ]);
                setPosts(postsRes.data);
                setSuggestedUsers(suggestedRes.data);
                setFriendRequests(requestsRes.data);
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
        });

        socket.on('new_comment', (data) => {
            setPosts(prev => prev.map(p => p.id === data.post_id ? { ...p, comment_count: p.comment_count + 1 } : p));
            setPostComments(prev => {
                if (!prev[data.post_id]) return prev;
                return { ...prev, [data.post_id]: [...prev[data.post_id], data] };
            });
        });

        socket.on('post_deleted', (data) => {
            setPosts(prev => prev.filter(p => p.id !== parseInt(data.id)));
        });

        socket.on(`friend_request_${user.id}`, (data) => {
            setFriendRequests(prev => [...prev, { id: data.requester_id, username: data.requester_username, created_at: new Date() }]);
        });

        socket.on('token_expired', () => {
            showToast("Session expired, logging out...");
            setTimeout(logout, 2000);
        });

        return () => socket.disconnect();
    }, [token, user, logout]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
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
        setAnimatingLikes(prev => ({ ...prev, [post.id]: true }));
        setTimeout(() => setAnimatingLikes(prev => ({ ...prev, [post.id]: false })), 200);

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
                return <Link key={i} to={`/profile/${username}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--font-semibold)' }}>{part}</Link>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div>
            <Navbar />

            <div className="container flex gap-4" style={{ maxWidth: '1000px', alignItems: 'flex-start' }}>
                {/* Main Feed Column */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Create Post Form */}
                    <form className="glass post-card flex-col gap-4" onSubmit={handlePost} style={{ position: 'relative', marginBottom: 'var(--space-5)' }}>
                        <textarea 
                            placeholder={`What's on your mind, ${user?.username}?`}
                            rows={3} value={content} onChange={handleContentChange}
                            style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: '100%', outline: 'none', resize: 'none', fontSize: 'var(--text-base)', color: 'var(--text-main)' }}
                        />
                        
                        {mentionQuery !== null && (
                            <div className="floating-material" style={{ position: 'absolute', top: '100%', left: '20px', width: '250px', zIndex: 10, padding: '10px' }}>
                                {mentionResults.length === 0 ? <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No users found.</p> : null}
                                {mentionResults.map(u => (
                                    <div key={u.id} onClick={() => handleSelectMention(u.username)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>
                                        {u.username}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
                            <div className="flex items-center gap-2">
                                <label className="btn-icon" style={{ cursor: 'pointer', minWidth: 40, minHeight: 40 }}>
                                    <Image size={20}/>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImage(e.target.files[0])} ref={fileInputRef} />
                                </label>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{image ? image.name : ''}</span>
                            </div>
                            <button type="submit" className="btn-primary" disabled={!content && !image}>
                                <Send size={16}/> Post
                            </button>
                        </div>
                    </form>

                    {/* Posts List */}
                    {posts.map((post, index) => {
                        const showAdAfter = (index + 1) % 9 === 0;
                        const adIndex = Math.floor(index / 9) % fakeAds.length;
                        const ad = fakeAds[adIndex];

                        const baitBg = post.bait_score > 70 ? 'rgba(220, 38, 38, 0.15)' : post.bait_score > 30 ? 'rgba(217, 119, 6, 0.15)' : 'rgba(22, 163, 74, 0.15)';
                        const baitColor = post.bait_score > 70 ? 'var(--danger)' : post.bait_score > 30 ? 'var(--warning)' : 'var(--success)';

                        return (
                            <div key={post.id}>
                                <div className="post-card">
                                    <div className="post-header justify-between">
                                        <div className="flex items-center gap-3">
                                            {post.profile_picture ? (
                                                <img src={post.profile_picture.startsWith('http') ? post.profile_picture : `${baseUrl}${post.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
                                            ) : (
                                                <div className="avatar">{(post.username || '?')[0].toUpperCase()}</div>
                                            )}
                                            <div>
                                                <Link to={`/profile/${post.username}`} style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-main)', textDecoration: 'none' }}>{post.username}</Link>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{new Date(post.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {showBaitBadge && post.bait_score > 0 && (
                                                <span 
                                                    className="bait-badge"
                                                    title={`Click to analyze post: ${post.bait_translation}`} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveRoast({
                                                            content: post.content,
                                                            score: post.bait_score,
                                                            translation: post.bait_translation,
                                                            roasts: post.bait_roasts
                                                        });
                                                    }}
                                                    style={{
                                                        fontSize: 'var(--text-xs)',
                                                        padding: '4px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: baitBg,
                                                        color: baitColor,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: 'var(--font-semibold)'
                                                    }}
                                                >
                                                    🎣 {post.bait_score}% Bait
                                                </span>
                                            )}
                                            {post.user_id === user.id && (
                                                <button onClick={() => handleDeletePost(post.id)} className="btn-icon" style={{color: 'var(--danger)', minWidth: 40, minHeight: 40}}><Trash2 size={18}/></button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p style={{ marginBottom: 'var(--space-3)', whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-thai)' }}>{renderPostContent(post.content)}</p>
                                    {post.image_url && <img src={`${baseUrl}${post.image_url}`} alt="Post" className="post-img" />}
                                    
                                    <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
                                        <span>{post.like_count || 0} Likes</span>
                                        <span>{post.comment_count || 0} Comments</span>
                                    </div>

                                    <div className="interactions flex justify-between" style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                                        <button 
                                            className={`interaction-btn flex items-center gap-2 ${animatingLikes[post.id] ? 'like-anim' : ''}`} 
                                            onClick={() => handleLike(post)} 
                                            style={{flex: 1, justifyContent: 'center', color: post.has_liked ? 'var(--accent)' : 'var(--text-secondary)', minHeight: 40}}
                                        >
                                            <Heart size={18} fill={post.has_liked ? 'var(--accent)' : 'none'} /> {post.has_liked ? 'Liked' : 'Like'}
                                        </button>
                                        <button className="interaction-btn flex items-center gap-2" onClick={() => toggleComments(post.id)} style={{flex: 1, justifyContent: 'center', minHeight: 40}}>
                                            <MessageSquare size={18} /> Comment
                                        </button>
                                    </div>

                                    {/* Comments Section */}
                                    {openComments[post.id] && (
                                        <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                                            <div className="flex gap-2" style={{ marginBottom: 'var(--space-4)' }}>
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
                                                        <div className="avatar" style={{width: 32, height: 32, fontSize: '0.8rem'}}>{(comment.username || '?')[0].toUpperCase()}</div>
                                                        <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', flex: 1, background: 'var(--surface-0)', border: '1px solid var(--border-subtle)' }} className="flex items-center justify-between">
                                                            <div>
                                                                <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', marginRight: '8px', color: 'var(--text-main)' }}>{comment.username}</span>
                                                                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{comment.content}</span>
                                                            </div>
                                                            {comment.user_id === user.id && (
                                                                <button onClick={() => handleDeleteComment(comment.id, post.id)} className="btn-icon" style={{color: 'var(--danger)', padding: '4px', minWidth: 32, minHeight: 32}}><Trash2 size={14}/></button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Unskippable Fake Ad Card */}
                                {showAdAfter && (
                                    <div 
                                        className="post-card fake-ad-card" 
                                        style={{ 
                                            border: '1px dashed var(--warning)',
                                            background: 'rgba(217, 119, 6, 0.05)',
                                            position: 'relative',
                                            padding: 'var(--space-5)',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: 'var(--space-5)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--warning)' }}>
                                                📢 โฆษณาเตือนใจ (Unskippable Wellness Warning)
                                            </span>
                                            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(217, 119, 6, 0.15)', color: 'var(--warning)', fontWeight: 'var(--font-bold)' }}>
                                                {ad.badge}
                                            </span>
                                        </div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: 'var(--text-md)', color: 'var(--text-main)' }}>{ad.title}</h4>
                                        <p style={{ margin: 0, fontSize: 'var(--text-base)', lineHeight: 'var(--leading-thai)', color: 'var(--text-main)' }}>
                                            {ad.content}
                                        </p>
                                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button 
                                                disabled 
                                                style={{ 
                                                    fontSize: 'var(--text-xs)', 
                                                    padding: '4px 10px', 
                                                    border: '1px solid var(--border-subtle)', 
                                                    borderRadius: 'var(--radius-full)', 
                                                    background: 'transparent',
                                                    color: 'var(--text-tertiary)',
                                                    cursor: 'not-allowed',
                                                    minHeight: 32
                                                }}
                                            >
                                                Skip Ad (Disabled)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Column */}
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} className="sidebar-hide-mobile">
                    {friendRequests.length > 0 && (
                        <div className="post-card" style={{ padding: 'var(--space-4)' }}>
                            <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)' }}>
                                <Users size={18}/> Friend Requests
                            </h4>
                            {friendRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{req.username}</span>
                                    <button onClick={() => handleAcceptFriend(req.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}><Check size={14}/> Accept</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="post-card" style={{ padding: 'var(--space-4)' }}>
                        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)' }}>
                            <UserPlus size={18}/> Suggested Friends
                        </h4>
                        {suggestedUsers.length === 0 ? <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No suggestions right now.</p> : null}
                        {suggestedUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                                <div className="flex items-center gap-2">
                                    {u.profile_picture ? (
                                        <img src={u.profile_picture.startsWith('http') ? u.profile_picture : `${baseUrl}${u.profile_picture}`} alt="" className="avatar" style={{width: 24, height: 24, borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        <div className="avatar" style={{width: 24, height: 24, fontSize:'0.7rem'}}>{u.username[0].toUpperCase()}</div>
                                    )}
                                    <Link to={`/profile/${u.username}`} style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-main)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>{u.username}</Link>
                                </div>
                                <button onClick={() => handleAddFriend(u.id)} className="btn-icon" style={{minWidth: 36, minHeight: 36}}><UserPlus size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Roast Modal Window */}
            {activeRoast && (
                <div 
                    onClick={() => setActiveRoast(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            padding: 'var(--space-6)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--surface-1)',
                            boxShadow: 'var(--shadow-2)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <div style={{ fontSize: '2.5rem' }}>🎣🔥</div>
                        <h2 style={{ margin: 0, color: 'var(--danger)', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                            วิเคราะห์จิตใต้สำนึกคนอวด (Bait Analysis)
                        </h2>
                        <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>
                            ความรุนแรงของกิเลส: <span style={{ color: 'var(--danger)' }}>{activeRoast.score}% Bait</span>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '16px 0', textAlign: 'left' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--font-semibold)' }}>โพสต์ดั้งเดิม:</p>
                            <blockquote style={{ margin: 0, paddingLeft: '12px', borderLeft: '3px solid var(--accent)', fontStyle: 'italic', color: 'var(--text-main)', fontSize: 'var(--text-base)' }}>
                                "{activeRoast.content}"
                            </blockquote>
                        </div>

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 'var(--font-semibold)' }}>แปลไทยเป็นไทย (ความนัย):</p>
                            <p style={{ margin: 0, fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)', color: 'var(--text-main)' }}>
                                {activeRoast.translation}
                            </p>
                        </div>

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(220, 38, 38, 0.08)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 'var(--font-semibold)' }}>บทวิเคราะห์ดึงสติ (Savage Roast):</p>
                            <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--danger)', lineHeight: 'var(--leading-normal)', fontWeight: 'var(--font-medium)' }}>
                                {activeRoast.roasts || "คนปกติเขาอ่านแล้วไม่มีอะไรเลย นอกจากความว่างเปล่าและความคิดในหัวของคุณ"}
                            </p>
                        </div>

                        <button 
                            onClick={() => setActiveRoast(null)}
                            className="btn-primary" 
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--danger)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'var(--font-bold)',
                                marginTop: '8px',
                                fontSize: 'var(--text-sm)'
                            }}
                        >
                            ยอมรับความจริงแล้วปิดหน้าต่างนี้ (Accept Reality)
                        </button>
                    </div>
                </div>
            )}
            
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
