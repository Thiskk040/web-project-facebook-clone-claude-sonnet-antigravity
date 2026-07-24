import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Image, Save, ArrowLeft, Heart, MessageSquare, UserMinus, Users, MessageCircle, Sparkles, Inbox } from 'lucide-react';
import Navbar from './Navbar';

const baseUrl = 'http://localhost:3000';

export default function ProfilePage() {
    const { username } = useParams();
    const { token, user, updateUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [taggedPosts, setTaggedPosts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [activeTab, setActiveTab] = useState('posts');
    const [isEditing, setIsEditing] = useState(false);
    
    const [bio, setBio] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [toast, setToast] = useState('');
    const [activeRoast, setActiveRoast] = useState(null);
    const [showBaitBadge, setShowBaitBadge] = useState(localStorage.getItem('showBaitBadge') !== 'false');

    // Sync showBaitBadge status from Navbar events
    useEffect(() => {
        const handleBadgeChange = () => {
            setShowBaitBadge(localStorage.getItem('showBaitBadge') !== 'false' && localStorage.getItem('showGlazeBadge') !== 'false');
        };
        window.addEventListener('showBaitBadgeChange', handleBadgeChange);
        window.addEventListener('showGlazeBadgeChange', handleBadgeChange);
        return () => {
            window.removeEventListener('showBaitBadgeChange', handleBadgeChange);
            window.removeEventListener('showGlazeBadgeChange', handleBadgeChange);
        };
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [profRes, postsRes, taggedRes, friendsRes] = await Promise.all([
                    axios.get(`${baseUrl}/users/profile/${username}`, config),
                    axios.get(`${baseUrl}/users/${username}/posts`, config),
                    axios.get(`${baseUrl}/users/${username}/tagged_posts`, config),
                    axios.get(`${baseUrl}/users/${username}/friends`, config)
                ]);
                setProfile(profRes.data);
                setBio(profRes.data.bio || '');
                setPosts(postsRes.data);
                setTaggedPosts(taggedRes.data);
                setFriends(friendsRes.data);
            } catch (err) {
                console.error(err);
                showToast("Error loading profile");
            }
        };
        fetchProfile();
    }, [username, token]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleSaveProfile = async () => {
        const formData = new FormData();
        formData.append('bio', bio);
        if (coverFile) formData.append('cover_photo', coverFile);
        if (profilePicFile) formData.append('profile_picture', profilePicFile);

        try {
            const res = await axios.put(`${baseUrl}/users/me/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(prev => ({ ...prev, bio: res.data.bio, cover_photo: res.data.coverUrl, profile_picture: res.data.profile_picture }));
            
            // Sync current user avatar in AuthContext and localStorage
            updateUser({ profile_picture: res.data.profile_picture });
            
            setIsEditing(false);
            showToast("Profile updated!");
        } catch (err) {
            showToast("Failed to update profile");
        }
    };

    const renderPostContent = (text) => {
        if (!text) return null;
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const uname = part.substring(1);
                return <Link key={i} to={`/profile/${uname}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--font-semibold)' }}>{part}</Link>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const displayPosts = activeTab === 'posts' ? posts : taggedPosts;

    if (!profile) return (
        <div>
            <Navbar />
            <div className="container" style={{ maxWidth: '800px' }}>
                <div className="post-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
                    <div className="skeleton" style={{ height: '220px', width: '100%' }} />
                    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="flex items-center gap-4" style={{ marginTop: '-60px' }}>
                            <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
                            <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div className="skeleton" style={{ height: 24, width: '180px' }} />
                                <div className="skeleton" style={{ height: 16, width: '280px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const isOwner = user.id === profile.id;
    const isFriend = friends.some(f => f.username === user.username);

    const handleUnfriend = async (friendId) => {
        if (!confirm("Are you sure you want to unfriend?")) return;
        try {
            await axios.delete(`${baseUrl}/friendships/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
            setFriends(prev => prev.filter(f => f.id !== friendId));
            if (!isOwner) window.location.reload();
            showToast("Unfriended successfully");
        } catch (e) { showToast("Error removing friend"); }
    };

    if (!profile) {
        return (
            <div>
                <Navbar />
                <div className="container" style={{ maxWidth: '800px' }}>
                    <div className="post-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
                        <div className="skeleton" style={{ height: '220px', width: '100%' }} />
                        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="flex items-center gap-4" style={{ marginTop: '-60px' }}>
                                <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--surface-0)' }} />
                                <div style={{ marginTop: '40px' }}>
                                    <div className="skeleton" style={{ width: '160px', height: '24px', marginBottom: '8px' }} />
                                    <div className="skeleton" style={{ width: '220px', height: '14px' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />

            <div className="container" style={{ maxWidth: '800px' }}>
                {/* Profile Header Card */}
                <div className="post-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
                    {/* Cover Section */}
                    <div style={{ height: '220px', background: 'var(--surface-0)', position: 'relative' }}>
                        {profile.cover_photo && (
                            <>
                                <img src={profile.cover_photo.startsWith('http') ? profile.cover_photo : `${baseUrl}${profile.cover_photo}`} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, var(--surface-0) 95%)' }} />
                            </>
                        )}
                        {isEditing && (
                            <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                <label className="btn-primary" style={{ cursor: 'pointer', opacity: 0.9 }}>
                                    <Image size={16}/> Change Cover
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCoverFile(e.target.files[0])} />
                                </label>
                            </div>
                        )}
                    </div>
                    
                    {/* Profile Details */}
                    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4" style={{ marginTop: '-60px' }}>
                                <div style={{ position: 'relative', width: '100px', height: '100px', zIndex: 1 }}>
                                    <span className={isOwner ? "glaze-avatar-ring" : ""} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'inline-block' }}>
                                        {profile.profile_picture ? (
                                            <img src={profile.profile_picture.startsWith('http') ? profile.profile_picture : `${baseUrl}${profile.profile_picture}`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-0)' }} />
                                        ) : (
                                            <div className="avatar" style={{ width: '100%', height: '100%', fontSize: '2.5rem', border: '4px solid var(--surface-0)' }}>
                                                {(profile.username || '?')[0].toUpperCase()}
                                            </div>
                                        )}
                                    </span>
                                    {isEditing && (
                                        <label className="btn-icon" style={{ position: 'absolute', bottom: 0, right: -6, cursor: 'pointer', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', minWidth: 32, minHeight: 32 }}>
                                            <Image size={16}/>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setProfilePicFile(e.target.files[0])} />
                                        </label>
                                    )}
                                </div>
                                <div className="flex items-center gap-4" style={{ marginTop: '40px' }}>
                                    <h1 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-main)' }}>{profile.username}</h1>
                                    {!isOwner && isFriend && (
                                        <div className="flex gap-2">
                                            <Link to={`/messages?user=${profile.id}`} className="btn-primary flex items-center gap-1" style={{padding: '6px 12px', fontSize: 'var(--text-xs)', textDecoration: 'none'}}>
                                                <MessageCircle size={14}/> Message
                                            </Link>
                                            <button onClick={() => handleUnfriend(profile.id)} className="btn-icon" style={{color: 'var(--danger)', padding: '6px 12px', minWidth: 36, minHeight: 36}} title="Unfriend">
                                                <UserMinus size={16}/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {isOwner && !isEditing && (
                                <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ marginTop: '20px' }}>Edit Profile</button>
                            )}
                            {isOwner && isEditing && (
                                <button onClick={handleSaveProfile} className="btn-primary flex items-center gap-2" style={{ marginTop: '20px' }}><Save size={16}/> Save</button>
                            )}
                        </div>

                        {isEditing ? (
                            <textarea 
                                value={bio} 
                                onChange={e => setBio(e.target.value)} 
                                placeholder="Write something about yourself..."
                                rows={3}
                                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px', color: 'var(--text-main)' }}
                            />
                        ) : (
                            <p style={{ color: profile.bio ? 'var(--text-main)' : 'var(--text-tertiary)', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-thai)' }}>
                                {profile.bio || "No bio available."}
                            </p>
                        )}
                    </div>
                </div>

                {/* Profile Underline Navigation Tabs */}
                <div className="flex" style={{ marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <button 
                        onClick={() => setActiveTab('posts')} 
                        style={{ 
                            flex: 1, 
                            padding: '12px', 
                            background: 'transparent',
                            color: activeTab === 'posts' ? 'var(--text-main)' : 'var(--text-tertiary)',
                            fontWeight: activeTab === 'posts' ? 'var(--font-bold)' : 'var(--font-medium)',
                            borderBottom: activeTab === 'posts' ? '2px solid var(--accent)' : 'none',
                            borderRadius: 0,
                            minHeight: 44
                        }}
                    >
                        My Posts
                    </button>
                    <button 
                        onClick={() => setActiveTab('tagged')} 
                        style={{ 
                            flex: 1, 
                            padding: '12px', 
                            background: 'transparent',
                            color: activeTab === 'tagged' ? 'var(--text-main)' : 'var(--text-tertiary)',
                            fontWeight: activeTab === 'tagged' ? 'var(--font-bold)' : 'var(--font-medium)',
                            borderBottom: activeTab === 'tagged' ? '2px solid var(--accent)' : 'none',
                            borderRadius: 0,
                            minHeight: 44
                        }}
                    >
                        Tagged In
                    </button>
                    <button 
                        onClick={() => setActiveTab('friends')} 
                        style={{ 
                            flex: 1, 
                            padding: '12px', 
                            background: 'transparent',
                            color: activeTab === 'friends' ? 'var(--text-main)' : 'var(--text-tertiary)',
                            fontWeight: activeTab === 'friends' ? 'var(--font-bold)' : 'var(--font-medium)',
                            borderBottom: activeTab === 'friends' ? '2px solid var(--accent)' : 'none',
                            borderRadius: 0,
                            minHeight: 44
                        }}
                    >
                        Friends ({friends.length})
                    </button>
                </div>

                {/* Tab Contents */}
                {activeTab === 'friends' ? (
                    <div className="post-card flex-col gap-2">
                        <h3 className="flex items-center gap-2" style={{ marginBottom: '12px', fontSize: 'var(--text-md)' }}><Users size={20}/> Friends</h3>
                        {friends.length === 0 ? <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No friends found.</p> : null}
                        {friends.map(f => (
                            <div key={f.id} className="flex items-center justify-between" style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-0)', border: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                                <div className="flex items-center gap-3">
                                    {f.profile_picture ? (
                                        <img src={f.profile_picture.startsWith('http') ? f.profile_picture : `${baseUrl}${f.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        <div className="avatar" style={{width: 40, height: 40}}>{(f.username || '?')[0].toUpperCase()}</div>
                                    )}
                                    <Link to={`/profile/${f.username}`} style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-main)', textDecoration: 'none' }}>{f.username}</Link>
                                </div>
                                {isOwner && (
                                    <button onClick={() => handleUnfriend(f.id)} className="btn-icon" style={{color: 'var(--danger)', minWidth: 36, minHeight: 36}}>
                                        <UserMinus size={18}/> Unfriend
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : displayPosts.length === 0 ? (
                    <div className="post-card flex-col items-center justify-between" style={{ padding: 'var(--space-7) var(--space-4)', textAlign: 'center' }}>
                        <Inbox size={48} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', opacity: 0.5, marginBottom: 'var(--space-2)' }} />
                        <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}>No posts found</h3>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Posts shared by {profile.username} will appear here.</p>
                    </div>
                ) : (
                    <div className="flex-col gap-4">
                        {displayPosts.map(post => (
                            <div key={post.id} className="post-card">
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
                                    {showBaitBadge && post.bait_score > 0 && (
                                        <span 
                                            className="bait-badge"
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
                                                background: 'rgba(220, 38, 38, 0.15)',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: 'var(--font-bold)'
                                            }}
                                        >
                                            <Sparkles size={14} /> {post.bait_score}% Glaze
                                        </span>
                                    )}
                                </div>
                                <p style={{ marginBottom: 'var(--space-3)', whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-thai)' }}>{renderPostContent(post.content)}</p>
                                {post.image_url && <img src={`${baseUrl}${post.image_url}`} alt="Post" className="post-img" />}
                                
                                <div className="flex items-center justify-between" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
                                    <span className="flex items-center gap-1"><Heart size={14}/> {post.like_count || 0}</span>
                                    <span className="flex items-center gap-1"><MessageSquare size={14}/> {post.comment_count || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Roast Modal */}
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
                        className="liquid-glaze"
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            padding: 'var(--space-6)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--surface-2)',
                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--glaze-gradient)', color: '#100e0c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 16px rgba(201, 182, 255, 0.4)' }}>
                            <Sparkles size={32} />
                        </div>
                        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                            วิเคราะห์การประจบอวดอ้าง (Glaze Analysis)
                        </h2>
                        <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', color: 'var(--text-secondary)' }}>
                            ระดับความ Glaze: <span style={{ color: 'var(--accent)' }}>{activeRoast.score}% Glaze</span>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '16px 0', textAlign: 'left' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--font-semibold)' }}>โพสต์ดั้งเดิม:</p>
                            <blockquote style={{ margin: 0, paddingLeft: '12px', borderLeft: '3px solid var(--accent)', fontStyle: 'italic', color: 'var(--text-main)', fontSize: 'var(--text-base)' }}>
                                "{activeRoast.content}"
                            </blockquote>
                        </div>

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 'var(--font-semibold)' }}>แปลไทยเป็นไทย (ความนัย):</p>
                            <p style={{ margin: 0, fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)', color: 'var(--text-main)' }}>
                                {activeRoast.translation}
                            </p>
                        </div>

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(201, 182, 255, 0.1)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 'var(--font-semibold)' }}>บทวิเคราะห์ดึงสติ (Savage Roast):</p>
                            <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--text-main)', lineHeight: 'var(--leading-normal)', fontWeight: 'var(--font-medium)' }}>
                                {activeRoast.roasts || "คนปกติเขาอ่านแล้วไม่มีอะไรเลย นอกจากความว่างเปล่าและความคิดในหัวของคุณ"}
                            </p>
                        </div>

                        <button 
                            onClick={() => setActiveRoast(null)}
                            className="btn-glaze" 
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: 'var(--radius-md)',
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
