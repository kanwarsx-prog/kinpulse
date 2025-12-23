import { useEffect } from 'react';
import './PhotoLightbox.css';

export default function PhotoLightbox({
    photo,
    profile,
    currentUser,
    onClose,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && hasNext) onNext();
            if (e.key === 'ArrowLeft' && hasPrevious) onPrevious();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);

    const displayName = photo.user_id === currentUser.id
        ? 'You'
        : (profile?.name || profile?.email?.split('@')[0] || 'Family Member');

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'long' }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    return (
        <div className="photo-lightbox" onClick={onClose}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <button className="lightbox-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {hasPrevious && (
                    <button className="lightbox-nav prev" onClick={onPrevious}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                )}

                {hasNext && (
                    <button className="lightbox-nav next" onClick={onNext}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                )}

                <div className="lightbox-image-container">
                    <img src={photo.signedUrl} alt={`Shared by ${displayName}`} />
                </div>

                <div className="lightbox-info">
                    <div className="lightbox-meta">
                        <div className="meta-left">
                            <span className="meta-author">{displayName}</span>
                            <span className="meta-source">
                                {photo.source === 'pulse' ? '💜 From Pulse' : '💬 From Chat'}
                            </span>
                        </div>
                        <span className="meta-date">{formatDate(photo.created_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
