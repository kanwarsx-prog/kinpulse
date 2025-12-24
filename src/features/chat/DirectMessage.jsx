import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { usePresence } from '../../hooks/usePresence';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import OnlineIndicator from '../../components/ui/OnlineIndicator';
import './DirectMessage.css';

const DirectMessage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { supabase, user } = useSupabase();
    const { isOnline } = usePresence();
    const { markAsRead: markAsReadInHook } = useUnreadCounts();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [recipient, setRecipient] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (user && userId) {
            fetchRecipient();
            fetchMessages();
            // Mark messages as read using the hook
            markAsReadInHook(userId);
            subscribeToMessages();
            subscribeToTyping();
        }
    }, [user, userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchRecipient = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        setRecipient(data);
    };

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(user_id.eq.${user.id},recipient_id.eq.${userId}),and(user_id.eq.${userId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        setMessages(data || []);
        setLoading(false);
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`dm-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const msg = payload.new;
                if ((msg.user_id === user.id && msg.recipient_id === userId) ||
                    (msg.user_id === userId && msg.recipient_id === user.id)) {
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === msg.id);
                        if (exists) return prev;
                        return [...prev, msg];
                    });

                    // Mark as read if from recipient
                    if (msg.user_id === userId) {
                        markAsReadInHook(userId);
                    }
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const subscribeToTyping = () => {
        const channel = supabase
            .channel(`typing-${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'typing_indicators',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setIsTyping(false);
                } else if (payload.new?.recipient_id === user.id) {
                    setIsTyping(true);
                    // Auto-clear after 3 seconds
                    setTimeout(() => setIsTyping(false), 3000);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const handleTyping = () => {
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Send typing indicator
        supabase
            .from('typing_indicators')
            .upsert({
                user_id: user.id,
                recipient_id: userId,
                family_id: user.family_id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,recipient_id' });

        // Clear after 2 seconds of no typing
        typingTimeoutRef.current = setTimeout(() => {
            supabase
                .from('typing_indicators')
                .delete()
                .eq('user_id', user.id)
                .eq('recipient_id', userId);
        }, 2000);
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

        const { error: uploadError } = await supabase.storage
            .from('pulse-photos')
            .upload(fileName, photo);

        if (uploadError) {
            console.error('Photo upload error:', uploadError);
            return null;
        }

        const { data: signedData, error: signedError } = await supabase.storage
            .from('pulse-photos')
            .createSignedUrl(fileName, 31536000);

        if (signedError) {
            console.error('Signed URL error:', signedError);
            return null;
        }

        return signedData.signedUrl;
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !photo) return;

        const messageContent = newMessage.trim();
        const tempId = 'temp-' + Date.now();
        const photoUrl = await uploadPhoto();

        // Clear typing indicator
        await supabase
            .from('typing_indicators')
            .delete()
            .eq('user_id', user.id)
            .eq('recipient_id', userId);

        const tempMessage = {
            id: tempId,
            family_id: user.family_id,
            user_id: user.id,
            recipient_id: userId,
            content: messageContent,
            photo_url: photoUrl,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setPhoto(null);
        setPhotoPreview(null);

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                family_id: user.family_id,
                user_id: user.id,
                recipient_id: userId,
                content: messageContent,
                photo_url: photoUrl
            }])
            .select()
            .single();

        if (error) {
            console.error('Send error:', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(messageContent);
        } else {
            setMessages(prev => prev.map(m => m.id === tempId ? data : m));
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className="dm-loading">Loading conversation...</div>;
    }

    return (
        <div className="direct-message">
            <header className="dm-header">
                <button className="back-btn" onClick={() => navigate('/chat')}>←</button>
                <div className="dm-header-info">
                    <div className="header-with-status">
                        <h1>{recipient?.name || recipient?.email?.split('@')[0] || 'User'}</h1>
                        <OnlineIndicator isOnline={isOnline(userId)} size="md" />
                    </div>
                    {isOnline(userId) ? (
                        <span className="online-status">Online</span>
                    ) : (
                        isTyping && <span className="typing-status">typing...</span>
                    )}
                </div>
            </header>

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <p>Start your conversation with {recipient?.name || 'them'}!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMe = message.user_id === user.id;

                        return (
                            <div
                                key={message.id}
                                className={`message ${isMe ? 'message-me' : 'message-other'}`}
                            >
                                <div className="message-bubble">
                                    {message.content && <p className="message-content">{message.content}</p>}
                                    {message.photo_url && (
                                        <img
                                            src={message.photo_url}
                                            alt="Shared photo"
                                            className="message-photo"
                                            onClick={() => window.open(message.photo_url, '_blank')}
                                        />
                                    )}
                                    <span className="message-time">{formatTime(message.created_at)}</span>
                                </div>
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
                        <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>✕</button>
                    </div>
                )}
                <div className="input-row">
                    <input
                        type="file"
                        id="dm-photo-input"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="dm-photo-input" className="photo-btn">
                        +
                    </label>
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
                    <button type="submit" disabled={!newMessage.trim() && !photo}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DirectMessage;
