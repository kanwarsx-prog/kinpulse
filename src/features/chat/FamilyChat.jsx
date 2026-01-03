import React, { useEffect, useState, useRef } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import { usePresence } from '../../hooks/usePresence';
import MessageReaction from '../../components/ui/MessageReaction';
import VoiceRecorder from '../../components/ui/VoiceRecorder';
import VoicePlayer from '../../components/ui/VoicePlayer';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { compressImage } from '../../lib/image';
import './FamilyChat.css';

const PAGE_SIZE = 50;

const FamilyChat = () => {
    const { supabase, user, currentGroup } = useSupabase();
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
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef(null);
    const { isOnline } = usePresence();
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const sendPushToFamily = async (bodyText) => {
        // Ensure we have profiles loaded to target other members
        if (!Object.keys(profiles || {}).length) {
            await fetchProfiles();
        }
        const targetIds = Object.keys(profiles || {}).filter((id) => id !== user.id);
        if (targetIds.length === 0) return;
        const title = profiles[user.id]?.name
            ? `${profiles[user.id].name} in Family Chat`
            : 'New family chat';
        await Promise.allSettled(
            targetIds.map((uid) =>
                supabase.functions.invoke('send-push-notification', {
                    body: {
                        user_id: uid,
                        title,
                        body: bodyText || 'New message',
                        url: '/chat'
                    }
                }).catch((err) => console.error('Push invoke error (family)', err))
            )
        );
    };

    useEffect(() => {
        if (currentGroup?.id) {
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
                        filter: `family_id=eq.${currentGroup.id}`
                    },
                    (payload) => {
                        const newMsg = payload.new;
                        if (newMsg.family_id === currentGroup.id && !newMsg.recipient_id) {
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
    }, [currentGroup?.id]);

    useEffect(() => {
        // Periodic refresh as a safety net
        if (!currentGroup?.id) return;
        const id = setInterval(() => {
            fetchMessages(true);
        }, 30000);
        return () => clearInterval(id);
    }, [user?.family_id]);

    useEffect(() => {
        if (!user?.family_id) return;
        const channel = supabase
            .channel(`typing-family-${user.family_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'typing_indicators',
                    filter: `family_id=eq.${user.family_id},recipient_id=is.null`
                },
                (payload) => {
                    const uid = payload.new?.user_id || payload.old?.user_id;
                    if (!uid || uid === user.id) return;
                    if (payload.eventType === 'DELETE') {
                        setTypingUsers((prev) => prev.filter((id) => id !== uid));
                    } else {
                        setTypingUsers((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
                        setTimeout(() => {
                            setTypingUsers((prev) => prev.filter((id) => id !== uid));
                        }, 3000);
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.family_id, user?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const stopTyping = () => {
        supabase
            .from('typing_indicators')
            .delete()
            .eq('user_id', user.id)
            .is('recipient_id', null);
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
                    family_id: currentGroup.id,
                    recipient_id: null,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'user_id,recipient_id' }
            );

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 2000);
    };

    const fetchProfiles = async () => {
        if (!currentGroup?.id) return;

        // Get group members
        const { data: memberData } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', currentGroup.id);

        const memberIds = memberData?.map(m => m.user_id) || [];

        // Get profiles for group members
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .in('id', memberIds);

        const profileMap = {};
        data?.forEach((p) => (profileMap[p.id] = p));
        setProfiles(profileMap);
    };

    const fetchMessages = async (reset = false) => {
        if (!currentGroup?.id) return;

        const currentPage = reset ? 0 : page;
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('family_id', currentGroup.id)
            .is('recipient_id', null)
            .order('created_at', { ascending: false })
            .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (data) {
            const chunk = [...data].reverse();
            const filtered = chunk.filter((m) => m.content !== '[deleted]');
            setMessages((prev) => (reset ? filtered : [...filtered, ...prev]));
            setHasMore(data.length === PAGE_SIZE);
            if (reset) setPage(0);
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
                family_id: currentGroup.id,
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
            sendPushToFamily('Sent a voice message');
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
            family_id: currentGroup.id,
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
                    family_id: currentGroup.id,
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
            const preview = messageContent || (photoUrl ? 'Shared a photo' : 'New message');
            sendPushToFamily(preview);
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

    const handleRemovePhoto = async (message) => {
        if (!message?.photo_url) return;
        const backup = message.photo_url;
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, photo_url: null } : m)));
        const { error } = await supabase.from('messages').update({ photo_url: null }).eq('id', message.id);
        if (error) {
            console.error('Remove photo error:', error);
            setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, photo_url: backup } : m)));
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <LoadingSpinner size="md" message="Loading chat..." />;
    }

    const visibleMessages = messages.filter((m) => m.content || m.photo_url || m.audio_url);

    return (
        <div className="family-chat page fade-in">
            <header className="chat-header">
                <h1 className="page-title">Family Chat</h1>
                <p className="subtitle">Stay connected</p>
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
                        <p>Start the conversation!</p>
                    </div>
                ) : (
                    <>
                        {typingUsers.length > 0 && (
                            <div className="typing-indicator">
                                {typingUsers.length === 1
                                    ? `${profiles[typingUsers[0]]?.name || 'Someone'} is typing...`
                                    : 'Several people are typing...'}
                            </div>
                        )}
                        {visibleMessages.map((message) => {
                            const isMe = message.user_id === user.id;
                            const profile = profiles[message.user_id];

                            return (
                                <div key={message.id} className={`message ${isMe ? 'message-me' : 'message-other'}`}>
                                    <div className="message-content-wrapper">
                                        {!isMe && <div className="message-sender">{profile?.name || profile?.email?.split('@')[0] || 'Family'}</div>}
                                        <div className="message-bubble">
                                            {message.content && <p className="message-content">{message.content}</p>}
                                            {message.photo_url && (
                                                <div className="message-photo-wrapper">
                                                    <img
                                                        src={message.photo_url}
                                                        alt="Shared"
                                                        className="message-photo"
                                                        onClick={() => setLightboxSrc(message.photo_url)}
                                                    />
                                                    {isMe && (
                                                        <button
                                                            type="button"
                                                            className="photo-delete-btn"
                                                            onClick={() => handleRemovePhoto(message)}
                                                            aria-label="Delete photo"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
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

                                        {!message.id.toString().startsWith('temp-') && (
                                            <MessageReaction messageId={message.id} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
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

            {
                showVoiceRecorder && (
                    <div className="voice-recorder-container">
                        <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowVoiceRecorder(false)} />
                    </div>
                )
            }
            <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        </div>
    );
};

export default FamilyChat;
