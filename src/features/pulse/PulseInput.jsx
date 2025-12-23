import React, { useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './PulseInput.css';

const PulseInput = ({ onSubmit }) => {
    const [selected, setSelected] = useState(null);
    const [note, setNote] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const { supabase, user } = useSupabase();

    const statusOptions = [
        { value: 'great', emoji: '😊', label: 'Great' },
        { value: 'good', emoji: '🙂', label: 'Good' },
        { value: 'okay', emoji: '😐', label: 'Okay' },
        { value: 'stressed', emoji: '😰', label: 'Stressed' },
        { value: 'sad', emoji: '😢', label: 'Sad' },
        { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed' }
    ];

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('Photo must be less than 5MB');
        }
    };

    const uploadPhoto = async () => {
        if (!photo) return null;

        const fileExt = photo.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('pulse-photos')
            .upload(fileName, photo);

        if (uploadError) {
            console.error('Photo upload error:', uploadError);
            alert('Failed to upload photo: ' + uploadError.message);
            return null;
        }

        // Create signed URL valid for 1 year
        const { data: signedData, error: signedError } = await supabase.storage
            .from('pulse-photos')
            .createSignedUrl(fileName, 31536000); // 365 days in seconds

        if (signedError) {
            console.error('Signed URL error:', signedError);
            alert('Failed to create photo URL: ' + signedError.message);
            return null;
        }

        return signedData.signedUrl;
    };

    const handleSubmit = async () => {
        if (!selected) return;

        const photoUrl = await uploadPhoto();

        onSubmit({
            state: selected,
            note: note.trim(),
            photo_url: photoUrl
        });

        setSelected(null);
        setNote('');
        setPhoto(null);
        setPhotoPreview(null);
    };

    return (
        <div className="pulse-input-container">
            <h3 className="pulse-question">How are you feeling?</h3>

            <div className="status-grid">
                {statusOptions.map(option => (
                    <div
                        key={option.value}
                        className={`status-option ${selected === option.value ? 'selected' : ''}`}
                        onClick={() => setSelected(option.value)}
                    >
                        <span className="emoji">{option.emoji}</span>
                        <span className="label">{option.label}</span>
                    </div>
                ))}
            </div>

            {selected && (
                <div className="additional-inputs">
                    <textarea
                        className="note-input"
                        placeholder="Add a note (optional)..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        maxLength={200}
                    />

                    <div className="photo-upload">
                        <input
                            type="file"
                            id="photo-input"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="photo-input" className="photo-upload-btn">
                            📷 Add Photo
                        </label>
                        {photoPreview && (
                            <div className="photo-preview">
                                <img src={photoPreview} alt="Preview" />
                                <button onClick={() => { setPhoto(null); setPhotoPreview(null); }}>✕</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="action-area">
                <button
                    className="submit-btn"
                    disabled={!selected}
                    onClick={handleSubmit}
                >
                    Share Pulse
                </button>
            </div>
        </div>
    );
};

export default PulseInput;
