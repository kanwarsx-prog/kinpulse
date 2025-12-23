import { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import PhotoLightbox from './PhotoLightbox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './PhotoWall.css';

export default function PhotoWall() {
    const { supabase, user } = useSupabase();
    const [photos, setPhotos] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'pulses', 'chat'
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        fetchPhotos();
        fetchProfiles();
    }, [user?.family_id]);

    const fetchProfiles = async () => {
        if (!user?.family_id) return;

        const { data } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('family_id', user.family_id);

        if (data) {
            const profileMap = {};
            data.forEach(profile => {
                profileMap[profile.id] = profile;
            });
            setProfiles(profileMap);
        }
    };

    const fetchPhotos = async () => {
        if (!user?.family_id) {
            setLoading(false);
            return;
        }

        try {
            // Fetch photos from pulses
            const { data: pulsePhotos } = await supabase
                .from('pulses')
                .select('photo_url, created_at, user_id, id')
                .eq('family_id', user.family_id)
                .not('photo_url', 'is', null)
                .order('created_at', { ascending: false });

            // Fetch photos from messages
            const { data: chatPhotos } = await supabase
                .from('messages')
                .select('photo_url, created_at, sender_id, id')
                .eq('family_id', user.family_id)
                .not('photo_url', 'is', null)
                .order('created_at', { ascending: false });

            // Combine and format photos
            const allPhotos = [
                ...(pulsePhotos || []).map(p => ({
                    id: `pulse-${p.id}`,
                    url: p.photo_url,
                    created_at: p.created_at,
                    user_id: p.user_id,
                    source: 'pulse'
                })),
                ...(chatPhotos || []).map(m => ({
                    id: `chat-${m.id}`,
                    url: m.photo_url,
                    created_at: m.created_at,
                    user_id: m.sender_id,
                    source: 'chat'
                }))
            ];

            // Sort by date
            allPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Get public URLs (much faster than signed URLs)
            const photosWithUrls = allPhotos.map(photo => {
                const fileName = photo.url.split('/').pop();
                const { data } = supabase.storage
                    .from('pulse-photos')
                    .getPublicUrl(fileName);

                return {
                    ...photo,
                    signedUrl: data.publicUrl
                };
            });

            setPhotos(photosWithUrls);
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPhotos = photos.filter(photo => {
        if (filter === 'all') return true;
        if (filter === 'pulses') return photo.source === 'pulse';
        if (filter === 'chat') return photo.source === 'chat';
        return true;
    });

    const handlePhotoClick = (photo, index) => {
        setSelectedPhoto(photo);
        setSelectedIndex(index);
    };

    const handleNext = () => {
        const nextIndex = (selectedIndex + 1) % filteredPhotos.length;
        setSelectedIndex(nextIndex);
        setSelectedPhoto(filteredPhotos[nextIndex]);
    };

    const handlePrevious = () => {
        const prevIndex = (selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
        setSelectedIndex(prevIndex);
        setSelectedPhoto(filteredPhotos[prevIndex]);
    };

    if (loading) {
        return <LoadingSpinner size="lg" message="Loading photos..." />;
    }

    return (
        <div className="photo-wall">
            <header className="photo-wall-header">
                <h1>Family Photos</h1>
                <p className="photo-count">{filteredPhotos.length} photos</p>
            </header>

            <div className="photo-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Photos
                </button>
                <button
                    className={`filter-btn ${filter === 'pulses' ? 'active' : ''}`}
                    onClick={() => setFilter('pulses')}
                >
                    From Pulses
                </button>
                <button
                    className={`filter-btn ${filter === 'chat' ? 'active' : ''}`}
                    onClick={() => setFilter('chat')}
                >
                    From Chat
                </button>
            </div>

            {filteredPhotos.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📸</div>
                    <h3>No photos yet</h3>
                    <p>Photos shared in pulses and chat will appear here</p>
                </div>
            ) : (
                <div className="photo-grid">
                    {filteredPhotos.map((photo, index) => {
                        const profile = profiles[photo.user_id];
                        const displayName = photo.user_id === user.id
                            ? 'You'
                            : (profile?.name || profile?.email?.split('@')[0] || 'Family Member');

                        return (
                            <div
                                key={photo.id}
                                className="photo-item"
                                onClick={() => handlePhotoClick(photo, index)}
                            >
                                <img
                                    src={photo.signedUrl}
                                    alt={`Shared by ${displayName}`}
                                    loading="lazy"
                                />
                                <div className="photo-overlay">
                                    <div className="photo-info">
                                        <span className="photo-author">{displayName}</span>
                                        <span className="photo-source">
                                            {photo.source === 'pulse' ? '💜 Pulse' : '💬 Chat'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedPhoto && (
                <PhotoLightbox
                    photo={selectedPhoto}
                    profile={profiles[selectedPhoto.user_id]}
                    currentUser={user}
                    onClose={() => setSelectedPhoto(null)}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    hasNext={selectedIndex < filteredPhotos.length - 1}
                    hasPrevious={selectedIndex > 0}
                />
            )}
        </div>
    );
}
