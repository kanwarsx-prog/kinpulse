import React from 'react';
import './Avatar.css';

const Avatar = ({ name, email, size = 'md', isOnline = false }) => {
  const label = name || email || '';
  const initials = (label?.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className={`avatar-chip avatar-${size}`}>
      <div className="avatar-circle">
        {initials}
        {isOnline && <span className="avatar-presence" />}
      </div>
    </div>
  );
};

export default Avatar;
