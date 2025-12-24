import React from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import './VoiceRecorder.css';

const VoiceRecorder = ({ onSend, onCancel }) => {
    const {
        isRecording,
        duration,
        audioBlob,
        error,
        startRecording,
        stopRecording,
        cancelRecording,
        resetRecording
    } = useAudioRecorder();

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob, duration);
            resetRecording();
        }
    };

    const handleCancel = () => {
        cancelRecording();
        if (onCancel) onCancel();
    };

    if (error) {
        return (
            <div className="voice-recorder error">
                <p className="error-message">❌ {error}</p>
                <button onClick={handleCancel} className="cancel-btn">Close</button>
            </div>
        );
    }

    if (audioBlob && !isRecording) {
        // Preview mode
        return (
            <div className="voice-recorder preview">
                <div className="preview-info">
                    <span className="preview-icon">🎤</span>
                    <span className="preview-duration">{formatDuration(duration)}</span>
                    <audio src={URL.createObjectURL(audioBlob)} controls className="preview-player" />
                </div>
                <div className="preview-actions">
                    <button onClick={handleCancel} className="cancel-btn">Cancel</button>
                    <button onClick={handleSend} className="send-btn">Send</button>
                </div>
            </div>
        );
    }

    if (isRecording) {
        // Recording mode
        return (
            <div className="voice-recorder recording">
                <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    <span className="recording-time">{formatDuration(duration)}</span>
                    {duration >= 105 && <span className="warning">⚠️ 15s left</span>}
                </div>
                <div className="recording-actions">
                    <button onClick={handleCancel} className="cancel-btn">Cancel</button>
                    <button onClick={stopRecording} className="stop-btn">Stop</button>
                </div>
            </div>
        );
    }

    // Initial state - show record button
    return (
        <button onClick={startRecording} className="record-btn" title="Record voice message">
            🎤
        </button>
    );
};

export default VoiceRecorder;
