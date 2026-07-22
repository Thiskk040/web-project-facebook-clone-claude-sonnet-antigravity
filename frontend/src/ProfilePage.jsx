import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Image, Save, ArrowLeft, Heart, MessageSquare, UserMinus, Users, MessageCircle } from 'lucide-react';
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
            setShowBaitBadge(localStorage.getItem('showBaitBadge') !== 'false');
        };
        window.addEventListener('showBaitBadgeChange', handleBadgeChange);
        return () => window.removeEventListener('showBaitBadgeChange', handleBadgeChange);
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

    if (!profile) return <div className="container" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>Loading profile...</div>;

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
                                    {profile.profile_picture ? (
                                        <img src={profile.profile_picture.startsWith('http') ? profile.profile_picture : `${baseUrl}${profile.profile_picture}`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-0)' }} />
                                    ) : (
                                        <div className="avatar" style={{ width: '100%', height: '100%', fontSize: '2.5rem', border: '4px solid var(--surface-0)' }}>
                                            {(profile.username || '?')[0].toUpperCase()}
                                        </div>
                                    )}
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
                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)' }}>No posts to show.</p>
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
                                                fontWeight: 'var(--font-bold)'
                                            }}
                                        >
                                            🎣 {post.bait_score}% Bait
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
