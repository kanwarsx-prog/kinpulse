import React, { useEffect, useState, useRef } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './FamilyChat.css';

const FamilyChat = () => {
    const { supabase, user } = useSupabase();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (user?.family_id) {
            fetchMessages();
            fetchProfiles();

            // Subscribe to new messages
            const channel = supabase
                .channel('public:messages')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `family_id=eq.${user.family_id}`
                    },
                    (payload) => {
                        console.log('New message:', payload);
                        // Only add if not already in list (avoid duplicates from optimistic update)
                        setMessages(prev => {
                            const exists = prev.some(m => m.id === payload.new.id);
                            if (exists) return prev;
                            return [...prev, payload.new];
                        });
                    }
                )
                .subscribe((status) => {
                    console.log('Realtime status:', status);
                });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.family_id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchProfiles = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', user.family_id);

        const profileMap = {};
        data?.forEach(p => profileMap[p.id] = p);
        setProfiles(profileMap);
    };

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: true })
            .limit(100);

        if (data) {
            setMessages(data);
        }
        setLoading(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageContent = newMessage.trim();
        const tempId = 'temp-' + Date.now();

        // Optimistic update
        const tempMessage = {
            id: tempId,
            family_id: user.family_id,
            user_id: user.id,
            content: messageContent,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                family_id: user.family_id,
                user_id: user.id,
                content: messageContent
            }])
            .select()
            .single();

        if (error) {
            console.error('Send error:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(messageContent);
        } else {
            // Replace temp message with real one
            setMessages(prev => prev.map(m => m.id === tempId ? data : m));
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className="chat-loading">Loading chat...</div>;
    }

    return (
        <div className="family-chat">
            <header className="chat-header">
                <h1>Family Chat</h1>
                <p className="subtitle">Stay connected</p>
            </header>

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMe = message.user_id === user.id;
                        const profile = profiles[message.user_id];

                        return (
                            <div
                                key={message.id}
                                className={`message ${isMe ? 'message-me' : 'message-other'}`}
                            >
                                {!isMe && (
                                    <div className="message-sender">
                                        {profile?.name || profile?.email?.split('@')[0] || 'Family'}
                                    </div>
                                )}
                                <div className="message-bubble">
                                    <p className="message-content">{message.content}</p>
                                    <span className="message-time">{formatTime(message.created_at)}</span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    maxLength={500}
                />
                <button type="submit" disabled={!newMessage.trim()}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default FamilyChat;
