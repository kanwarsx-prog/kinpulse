import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { usePresence } from '../../hooks/usePresence';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import OnlineIndicator from '../../components/ui/OnlineIndicator';
import MessageReaction from '../../components/ui/MessageReaction';
import VoiceRecorder from '../../components/ui/VoiceRecorder';
import VoicePlayer from '../../components/ui/VoicePlayer';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { compressImage } from '../../lib/image';
import './DirectMessage.css';

const PAGE_SIZE = 50;

const DirectMessage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { supabase, user } = useSupabase();
    const { isOnline } = usePresence();
    const { markAsRead: markAsReadInHook } = useUnreadCounts();
    const [messages, setMessages] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [recipient, setRecipient] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    useEffect(() => {
        if (user && userId) {
            fetchRecipient();
            fetchMessages(true);
            markAsReadInHook(userId);
            subscribeToMessages();
            subscribeToTyping();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchRecipient = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        setRecipient(data);
    };

    const fetchMessages = async (reset = false) => {
        const currentPage = reset ? 0 : page;
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(user_id.eq.${user.id},recipient_id.eq.${userId}),and(user_id.eq.${userId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (data) {
            const chunk = [...data].reverse().filter((m) => m.content !== '[deleted]');
            setMessages((prev) => (reset ? chunk : [...chunk, ...prev]));
            setHasMore(data.length === PAGE_SIZE);
            if (reset) setPage(0);
        } else {
            setHasMore(false);
        }
        setLoading(false);
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`dm-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    const msg = payload.new;
                    if (
                        (msg.user_id === user.id && msg.recipient_id === userId) ||
                        (msg.user_id === userId && msg.recipient_id === user.id)
                    ) {
                        setMessages((prev) => {
                            const exists = prev.some((m) => m.id === msg.id);
                            if (exists) return prev;
                            return [...prev, msg];
                        });

                        if (msg.user_id === userId) {
                            markAsReadInHook(userId);
                        }
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const subscribeToTyping = () => {
        const channel = supabase
            .channel(`typing-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'typing_indicators',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setIsTyping(false);
                    } else if (payload.new?.recipient_id === user.id) {
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 3000);
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const handleTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        supabase
            .from('typing_indicators')
            .upsert(
                {
                    user_id: user.id,
                    recipient_id: userId,
                    family_id: user.family_id,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'user_id,recipient_id' }
            );

        typingTimeoutRef.current = setTimeout(() => {
            supabase.from('typing_indicators').delete().eq('user_id', user.id).eq('recipient_id', userId);
        }, 2000);
    };

    const sendPushToRecipient = async (bodyText) => {
        if (!userId) return;
        const title = recipient?.name ? `${recipient.name}, you have a new DM` : 'New direct message';
        try {
            await supabase.functions.invoke('send-push-notification', {
                body: {
                    user_id: userId,
                    title,
                    body: bodyText || 'New message',
                    url: `/chat/${user.id}`
                }
            });
        } catch (err) {
            console.error('Push invoke error (dm)', err);
        }
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
                recipient_id: userId,
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
            sendPushToRecipient('Sent a voice message');
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

        await supabase.from('typing_indicators').delete().eq('user_id', user.id).eq('recipient_id', userId);

        const tempMessage = {
            id: tempId,
            family_id: user.family_id,
            user_id: user.id,
            recipient_id: userId,
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
                    recipient_id: userId,
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
            const preview = messageContent || (photoUrl ? 'Sent you a photo' : 'New message');
            sendPushToRecipient(preview);
        }
    };

    const handleEditMessage = async (message) => {
        const current = message.content || '';
        const updated = window.prompt('Edit message', current);
        if (updated === null) return;
        const trimmed = updated.trim();
        if (!trimmed) return;

        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, content: trimmed } : m)));

        const { data, error } = await supabase
            .from('messages')
            .update({ content: trimmed })
            .eq('id', message.id)
            .select()
            .single();

        if (error) {
            console.error('Edit error:', error);
            setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        } else if (data) {
            setMessages((prev) => prev.map((m) => (m.id === message.id ? data : m)));
        }
    };

    const handleDeleteMessage = async (message) => {
        if (!window.confirm('Delete this message?')) return;

        const backup = { ...message };
        setMessages((prev) =>
            prev.map((m) =>
                m.id === message.id
                    ? { ...m, content: '[deleted]', photo_url: null, audio_url: null }
                    : m
            )
        );

        const { error } = await supabase
            .from('messages')
            .update({ content: '[deleted]', photo_url: null, audio_url: null })
            .eq('id', message.id);

        if (error) {
            console.error('Delete error:', error);
            setMessages((prev) => prev.map((m) => (m.id === message.id ? backup : m)));
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <LoadingSpinner size="md" message="Loading conversation..." />;
    }

    return (
        <div className="direct-message page fade-in">
            <header className="dm-header">
                <button className="back-btn" onClick={() => navigate('/chat')} aria-label="Back to chat list">
                    ←
                </button>
                <div className="dm-header-info">
                    <div className="header-with-status">
                        <h1>{recipient?.name || recipient?.email?.split('@')[0] || 'User'}</h1>
                        <OnlineIndicator isOnline={isOnline(userId)} size="md" />
                    </div>
                    {isOnline(userId) ? <span className="online-status">Online</span> : isTyping && <span className="typing-status">typing…</span>}
                </div>
            </header>

            <div className="messages-container">
                {hasMore && (
                    <button
                        className="load-more"
                        onClick={() => {
                            const next = page + 1;
                            setPage(next);
                            fetchMessages(false);
                        }}
                        aria-label="Load older messages"
                    >
                        Load earlier messages
                    </button>
                )}
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <h3>No messages yet</h3>
                        <p>Start your conversation with {recipient?.name || 'them'}.</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMe = message.user_id === user.id;

                        return (
                            <div key={message.id} className={`message ${isMe ? 'message-me' : 'message-other'}`}>
                                <div className="message-bubble">
                                    {message.content && <p className="message-content">{message.content}</p>}
                        {message.photo_url && (
                            <img
                                src={message.photo_url}
                                alt="Shared"
                                className="message-photo"
                                onClick={() => setLightboxSrc(message.photo_url)}
                            />
                        )}
                                    <span className="message-time">{formatTime(message.created_at)}</span>
                                    {isMe && message.content && message.content !== '[deleted]' && (
                                        <div className="message-actions">
                                            <button type="button" onClick={() => handleEditMessage(message)}>Edit</button>
                                            <button type="button" onClick={() => handleDeleteMessage(message)}>Delete</button>
                                        </div>
                                    )}
                                </div>
                                {message.audio_url && <VoicePlayer audioUrl={message.audio_url} duration={message.audio_duration} />}
                                <MessageReaction messageId={message.id} />
                            </div>
                        );
                    })
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
                    <input type="file" id="dm-photo-input" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    <label htmlFor="dm-photo-input" className="photo-btn">
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
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
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
                    <VoiceRecorder onSend={(audio, duration) => handleSendVoice(audio, duration)} onCancel={() => setShowVoiceRecorder(false)} />
                </div>
            )}
            <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        </div>
    );
};

export default DirectMessage;
