import React, { useState } from 'react';
import './ImageLightbox.css';

const ImageLightbox = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  if (!src) return null;

  const clampScale = (val) => Math.min(3, Math.max(0.5, val));

  const zoomIn = () => setScale((s) => clampScale(s + 0.25));
  const zoomOut = () => setScale((s) => clampScale(s - 0.25));
  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setDragging(true);
    setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - start.x, y: e.clientY - start.y });
  };

  const handleMouseUp = () => setDragging(false);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div
        className="lightbox-body"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt="Preview"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
          onMouseDown={handleMouseDown}
          draggable={false}
        />
        <button className="lightbox-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="lightbox-controls">
          <button type="button" onClick={zoomOut} aria-label="Zoom out">
            -
          </button>
          <button type="button" onClick={reset} aria-label="Reset zoom">
            100%
          </button>
          <button type="button" onClick={zoomIn} aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
