import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import MessageReaction from '../../components/ui/MessageReaction';
import VoiceRecorder from '../../components/ui/VoiceRecorder';
import VoicePlayer from '../../components/ui/VoicePlayer';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { compressImage } from '../../lib/image';
import { VariableSizeList as List } from 'react-window';
import MeasuredItem from './MeasuredItem';
import './FamilyChat.css';

const PAGE_SIZE = 50;

const FamilyChat = () => {
    const { supabase, user } = useSupabase();
    const { markAsRead } = useUnreadCounts();
    const [messages, setMessages] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const listRef = useRef(null);
    const sizeMap = useRef({});
    const containerRef = useRef(null);
    const [listHeight, setListHeight] = useState(480);

    useEffect(() => {
        if (user?.family_id) {
            fetchMessages(true);
            fetchProfiles();
            markAsRead();

            const channel = supabase
                .channel('family-messages')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `family_id=eq.${user.family_id}`
                    },
                    (payload) => {
                        const newMsg = payload.new;
                        if (!newMsg.recipient_id) {
                            setMessages((prev) => {
                                const exists = prev.some((m) => m.id === newMsg.id);
                                if (exists) return prev;
                                return [...prev, newMsg];
                            });
                        }
                    }
                )
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.family_id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const setSize = (index, size) => {
        if (sizeMap.current[index] !== size) {
            sizeMap.current[index] = size;
            listRef.current?.resetAfterIndex(index);
        }
    };

    const getSize = (index) => sizeMap.current[index] || 140;

    useLayoutEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setListHeight(Math.max(320, window.innerHeight - rect.top - 90));
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('family_id', user.family_id);

        const profileMap = {};
        data?.forEach((p) => (profileMap[p.id] = p));
        setProfiles(profileMap);
    };

    const fetchMessages = async (reset = false, targetPage) => {
        const currentPage = reset ? 0 : targetPage ?? page;
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('family_id', user.family_id)
            .is('recipient_id', null)
            .order('created_at', { ascending: false })
            .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (data) {
            const chunk = [...data].reverse();
            setMessages((prev) => (reset ? chunk : [...chunk, ...prev]));
            setHasMore(data.length === PAGE_SIZE);
            setPage(currentPage);
        } else {
            setHasMore(false);
        }
        setLoading(false);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 5 * 1024 * 1024) {
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
        const toUpload = await compressImage(photo, 1400, 0.7).catch(() => photo);

        const { error: uploadError } = await supabase.storage.from('pulse-photos').upload(fileName, toUpload);

        if (uploadError) {
            console.error('Photo upload error:', uploadError);
            return null;
        }

        const { data: signedData, error: signedError } = await supabase.storage.from('pulse-photos').createSignedUrl(fileName, 31536000);

        if (signedError) {
            console.error('Signed URL error:', signedError);
            return null;
        }

        return signedData.signedUrl;
    };

    const handleSendVoice = async (audioBlob, duration) => {
        try {
            const fileName = `${user.id}/${Date.now()}.webm`;
            const { error: uploadError } = await supabase.storage.from('pulse-photos').upload(fileName, audioBlob, {
                contentType: 'audio/webm'
            });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            const { data: urlData } = supabase.storage.from('pulse-photos').getPublicUrl(fileName);

            const messageData = {
                family_id: user.family_id,
                user_id: user.id,
                audio_url: urlData.publicUrl,
                audio_duration: duration,
                is_read: false
            };

            const { error } = await supabase.from('messages').insert([messageData]);

            if (error) {
                console.error('Database insert error:', error);
                alert(`Error sending voice message: ${error.message}`);
                throw error;
            }

            setShowVoiceRecorder(false);
        } catch (error) {
            console.error('Error sending voice message:', error);
            alert(`Failed to send voice message: ${error.message || 'Unknown error'}`);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !photo) return;

        const messageContent = newMessage.trim();
        const tempId = 'temp-' + Date.now();

        const photoUrl = await uploadPhoto();

        const tempMessage = {
            id: tempId,
            family_id: user.family_id,
            user_id: user.id,
            recipient_id: null,
            content: messageContent,
            photo_url: photoUrl,
            created_at: new Date().toISOString()
        };

        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage('');
        setPhoto(null);
        setPhotoPreview(null);

        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    family_id: user.family_id,
                    user_id: user.id,
                    recipient_id: null,
                    content: messageContent,
                    photo_url: photoUrl
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Send error:', error);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setNewMessage(messageContent);
        } else {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <LoadingSpinner size="md" message="Loading chat..." />;
    }

    return (
        <div className="family-chat page fade-in">
            <header className="chat-header">
                <h1 className="page-title">Family Chat</h1>
                <p className="subtitle">Stay connected</p>
            </header>

            <div className="messages-container" ref={containerRef}>
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <h3>No messages yet</h3>
                        <p>Start the conversation!</p>
                    </div>
                ) : (
                    <List
                        height={listHeight}
                        width="100%"
                        itemCount={messages.length + (hasMore ? 1 : 0)}
                        itemSize={getSize}
                        ref={listRef}
                        className="virtual-list"
                    >
                        {({ index, style }) => {
                            if (hasMore && index === 0) {
                                return (
                                    <MeasuredItem index={index} setSize={setSize} style={style}>
                                        <button
                                            className="load-more"
                                            onClick={() => fetchMessages(false, page + 1)}
                                            aria-label="Load older messages"
                                        >
                                            Load earlier messages
                                        </button>
                                    </MeasuredItem>
                                );
                            }

                            const messageIndex = hasMore ? index - 1 : index;
                            const message = messages[messageIndex];
                            const isMe = message.user_id === user.id;
                            const profile = profiles[message.user_id];

                            return (
                                <MeasuredItem index={index} setSize={setSize} style={style}>
                                    <div className={`message ${isMe ? 'message-me' : 'message-other'}`}>
                                        {!isMe && (
                                            <div className="message-sender">{profile?.name || profile?.email?.split('@')[0] || 'Family'}</div>
                                        )}
                                        <div className="message-bubble">
                                            {message.content && <p className="message-content">{message.content}</p>}
                                            {message.photo_url && (
                                                <img
                                                    src={message.photo_url}
                                                    alt="Shared"
                                                    className="message-photo"
                                                    onClick={() => window.open(message.photo_url, '_blank')}
                                                />
                                            )}
                                            <span className="message-time">{formatTime(message.created_at)}</span>
                                        </div>
                                        {message.audio_url && <VoicePlayer audioUrl={message.audio_url} duration={message.audio_duration} />}
                                        <MessageReaction messageId={message.id} />
                                    </div>
                                </MeasuredItem>
                            );
                        }}
                    </List>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={handleSend}>
                {photoPreview && (
                    <div className="chat-photo-preview">
                        <img src={photoPreview} alt="Preview" />
                        <button type="button" aria-label="Remove photo" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
                            ×
                        </button>
                    </div>
                )}
                <div className="input-row">
                    <input type="file" id="chat-photo-input" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    <label htmlFor="chat-photo-input" className="photo-btn">
                        +
                    </label>
                    {!showVoiceRecorder && (
                        <button
                            type="button"
                            className="voice-btn"
                            onClick={() => setShowVoiceRecorder(true)}
                            aria-label="Record voice message"
                        >
                            🎤
                        </button>
                    )}
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        maxLength={500}
                    />
                    <button type="submit" disabled={!newMessage.trim() && !photo} aria-label="Send message">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </form>

            {showVoiceRecorder && (
                <div className="voice-recorder-container">
                    <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoiceRecorder(false)} />
                </div>
            )}
        </div>
    );
};

export default FamilyChat;
