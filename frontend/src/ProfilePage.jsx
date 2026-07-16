import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Image, Save, ArrowLeft, Heart, MessageSquare, UserMinus, Users, MessageCircle } from 'lucide-react';

const baseUrl = 'http://localhost:3000';

export default function ProfilePage() {
    const { username } = useParams();
    const { token, user } = useAuth();
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
                return <Link key={i} to={`/profile/${uname}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>{part}</Link>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const displayPosts = activeTab === 'posts' ? posts : taggedPosts;

    if (!profile) return <div className="container">Loading...</div>;

    const isOwner = user.id === profile.id;
    const isFriend = friends.some(f => f.username === user.username);

    const handleUnfriend = async (friendId) => {
        if (!confirm("Are you sure you want to unfriend?")) return;
        try {
            await axios.delete(`${baseUrl}/friendships/${friendId}`, { headers: { Authorization: `Bearer ${token}` } });
            setFriends(prev => prev.filter(f => f.id !== friendId));
            if (!isOwner) window.location.reload(); // Refresh if we just unfriended the person we are looking at
            showToast("Unfriended successfully");
        } catch (e) { showToast("Error removing friend"); }
    };

    return (
        <div>
            <div className="glass navbar flex items-center justify-between" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
                <div className="flex items-center gap-4">
                    <Link to="/" className="btn-icon" style={{textDecoration: 'none', color: 'var(--text-color)'}}><ArrowLeft size={20}/></Link>
                    <h2>{profile.username}'s Profile</h2>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '800px' }}>
                <div className="glass post-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ height: '200px', background: 'var(--glass-border)', position: 'relative' }}>
                        {profile.cover_photo && (
                            <img src={profile.cover_photo.startsWith('http') ? profile.cover_photo : `${baseUrl}${profile.cover_photo}`} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        {isEditing && (
                            <div style={{ position: 'absolute', top: 10, right: 10 }}>
                                <label className="btn-primary" style={{ cursor: 'pointer', opacity: 0.9 }}>
                                    <Image size={16}/> Change Cover
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCoverFile(e.target.files[0])} />
                                </label>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4" style={{ marginTop: '-60px' }}>
                                <div style={{ position: 'relative', width: '100px', height: '100px', zIndex: 1 }}>
                                    {profile.profile_picture ? (
                                        <img src={profile.profile_picture.startsWith('http') ? profile.profile_picture : `${baseUrl}${profile.profile_picture}`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-color)' }} />
                                    ) : (
                                        <div className="avatar" style={{ width: '100%', height: '100%', fontSize: '2.5rem', border: '4px solid var(--bg-color)' }}>
                                            {profile.username[0].toUpperCase()}
                                        </div>
                                    )}
                                    {isEditing && (
                                        <label className="btn-icon" style={{ position: 'absolute', bottom: 0, right: -10, cursor: 'pointer', background: 'var(--glass-bg)' }}>
                                            <Image size={16}/>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setProfilePicFile(e.target.files[0])} />
                                        </label>
                                    )}
                                </div>
                                <div className="flex items-center gap-4" style={{ marginTop: '40px' }}>
                                    <h1 style={{ margin: 0 }}>{profile.username}</h1>
                                    {!isOwner && isFriend && (
                                        <div className="flex gap-2">
                                            <Link to={`/messages?user=${profile.id}`} className="btn-primary flex items-center gap-1" style={{padding: '6px 12px', fontSize: '0.9rem', textDecoration: 'none'}}>
                                                <MessageCircle size={14}/> Message
                                            </Link>
                                            <button onClick={() => handleUnfriend(profile.id)} className="btn-icon" style={{color: '#ef4444', padding: '6px 12px'}} title="Unfriend">
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
                                style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', color: 'var(--text-color)' }}
                            />
                        ) : (
                            <p style={{ color: profile.bio ? 'var(--text-color)' : 'var(--text-muted)' }}>
                                {profile.bio || "No bio available."}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-4" style={{ marginBottom: '20px' }}>
                    <button onClick={() => setActiveTab('posts')} className={activeTab === 'posts' ? 'btn-primary' : 'btn-icon'} style={{ flex: 1, padding: '12px' }}>My Posts</button>
                    <button onClick={() => setActiveTab('tagged')} className={activeTab === 'tagged' ? 'btn-primary' : 'btn-icon'} style={{ flex: 1, padding: '12px' }}>Tagged In</button>
                    <button onClick={() => setActiveTab('friends')} className={activeTab === 'friends' ? 'btn-primary' : 'btn-icon'} style={{ flex: 1, padding: '12px' }}>Friends ({friends.length})</button>
                </div>

                {activeTab === 'friends' ? (
                    <div className="glass post-card flex-col gap-2">
                        <h3 className="flex items-center gap-2"><Users size={20}/> Friends</h3>
                        {friends.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No friends found.</p> : null}
                        {friends.map(f => (
                            <div key={f.id} className="flex items-center justify-between" style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)' }}>
                                <div className="flex items-center gap-3">
                                    {f.profile_picture ? (
                                        <img src={f.profile_picture.startsWith('http') ? f.profile_picture : `${baseUrl}${f.profile_picture}`} alt="" className="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        <div className="avatar" style={{width: 40, height: 40}}>{f.username[0].toUpperCase()}</div>
                                    )}
                                    <Link to={`/profile/${f.username}`} style={{ fontWeight: 600, color: 'var(--text-color)', textDecoration: 'none' }}>{f.username}</Link>
                                </div>
                                {isOwner && (
                                    <button onClick={() => handleUnfriend(f.id)} className="btn-icon" style={{color: '#ef4444'}}>
                                        <UserMinus size={18}/> Unfriend
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : displayPosts.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No posts to show.</p>
                ) : (
                    <div className="flex-col gap-4">
                        {displayPosts.map(post => (
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
                                </div>
                                <p style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{renderPostContent(post.content)}</p>
                                {post.image_url && <img src={`${baseUrl}${post.image_url}`} alt="Post" className="post-img" />}
                                
                                <div className="flex items-center justify-between" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                                    <span className="flex items-center gap-1"><Heart size={14}/> {post.like_count || 0}</span>
                                    <span className="flex items-center gap-1"><MessageSquare size={14}/> {post.comment_count || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
