import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setAudioBlob(null);
            chunksRef.current = [];

            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Create MediaRecorder with iOS-compatible format
            let mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                // Fallback to webm for desktop browsers
                mimeType = 'audio/webm;codecs=opus';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            // Store mime type for blob creation
            let recordedMimeType = mimeType;

            // Collect audio data
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recordedMimeType });
                setAudioBlob(blob);

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
            };

            // Start recording
            mediaRecorder.start();
            setIsRecording(true);

            // Start timer
            let seconds = 0;
            timerRef.current = setInterval(() => {
                seconds++;
                setDuration(seconds);

                // Auto-stop at 2 minutes
                if (seconds >= 120) {
                    stopRecording();
                }
            }, 1000);

        } catch (err) {
            console.error('Error starting recording:', err);
            setError(err.message || 'Failed to start recording');
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            // Clear timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }

        // Stop all tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Clear timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setIsRecording(false);
        setDuration(0);
        setAudioBlob(null);
        chunksRef.current = [];
    }, []);

    const resetRecording = useCallback(() => {
        setDuration(0);
        setAudioBlob(null);
        setError(null);
        chunksRef.current = [];
    }, []);

    return {
        isRecording,
        duration,
        audioBlob,
        error,
        startRecording,
        stopRecording,
        cancelRecording,
        resetRecording
    };
};
