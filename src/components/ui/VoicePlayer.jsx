import React, { useRef, useState } from 'react';
import './VoicePlayer.css';

const VoicePlayer = ({ audioUrl, duration }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * (duration || audioRef.current?.duration || 0);

        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const cyclePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="voice-player">
            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                preload="metadata"
            />

            <button className="play-btn" onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶️'}
            </button>

            <div className="player-info">
                <div className="progress-bar" onClick={handleSeek}>
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="time-info">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration || audioRef.current?.duration || 0)}</span>
                </div>
            </div>

            <button className="speed-btn" onClick={cyclePlaybackRate}>
                {playbackRate}x
            </button>
        </div>
    );
};

export default VoicePlayer;
