import React from 'react';
import './ImageLightbox.css';

const ImageLightbox = ({ src, onClose }) => {
    if (!src) return null;
    return (
        <div className="lightbox-backdrop" onClick={onClose}>
            <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
                <img src={src} alt="Preview" />
                <button className="lightbox-close" onClick={onClose} aria-label="Close">×</button>
            </div>
        </div>
    );
};

export default ImageLightbox;
