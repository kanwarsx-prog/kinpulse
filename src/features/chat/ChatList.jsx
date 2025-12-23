import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import './ChatList.css';

const ChatList = () => {
    const { supabase, user } = useSupabase();
    const navigate = useNavigate();
    const [familyMembers, setFamilyMembers] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [typingUsers, setTypingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.family_id) {
            fetchConversations();
            subscribeToUpdates();
        }
    }, [user?.family_id]);

    const fetchConversations = async () => {
        // Get all family members except current user
        const { data: members } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', user.family_id)
            .neq('id', user.id);

        setFamilyMembers(members || []);

        // Get unread counts for each member
        const counts = {};
        for (const member of members || []) {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', user.id)
                .eq('user_id', member.id)
                .eq('is_read', false);

            counts[member.id] = count || 0;
        }
        setUnreadCounts(counts);

        // Get last message for each conversation
        const lastMsgs = {};
        for (const member of members || []) {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(user_id.eq.${user.id},recipient_id.eq.${member.id}),and(user_id.eq.${member.id},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) lastMsgs[member.id] = data;
        }
        setLastMessages(lastMsgs);
        setLoading(false);
    };

    const subscribeToUpdates = () => {
        // Subscribe to new messages
        const messageChannel = supabase
            .channel('dm-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${user.id}`
            }, (payload) => {
                // Update unread count
                setUnreadCounts(prev => ({
                    ...prev,
                    [payload.new.user_id]: (prev[payload.new.user_id] || 0) + 1
                }));
                // Update last message
                setLastMessages(prev => ({
                    ...prev,
                    [payload.new.user_id]: payload.new
                }));
            })
            .subscribe();

        // Subscribe to typing indicators
        const typingChannel = supabase
            .channel('typing-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'typing_indicators',
                filter: `recipient_id=eq.${user.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setTypingUsers(prev => [...new Set([...prev, payload.new.user_id])]);
                } else if (payload.eventType === 'DELETE') {
                    setTypingUsers(prev => prev.filter(id => id !== payload.old.user_id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(typingChannel);
        };
    };

    const formatLastMessage = (message) => {
        if (!message) return 'No messages yet';
        if (message.photo_url && !message.content) return '📷 Photo';
        return message.content?.substring(0, 40) + (message.content?.length > 40 ? '...' : '');
    };

    if (loading) {
        return <div className="chat-list-loading">Loading conversations...</div>;
    }

    return (
        <div className="chat-list">
            <header className="chat-list-header">
                <h1>Messages</h1>
            </header>

            <div className="conversations">
                {/* Family Chat */}
                <div
                    className="conversation-item family-chat"
                    onClick={() => navigate('/chat/family')}
                >
                    <div className="conversation-avatar">
                        <span className="avatar-icon">👨‍👩‍👧‍👦</span>
                    </div>
                    <div className="conversation-info">
                        <div className="conversation-header">
                            <span className="conversation-name">Family Chat</span>
                        </div>
                        <p className="last-message">Group conversation</p>
                    </div>
                </div>

                {/* Direct Messages */}
                <div className="section-divider">
                    <span>Direct Messages</span>
                </div>

                {familyMembers.map(member => {
                    const unread = unreadCounts[member.id] || 0;
                    const lastMsg = lastMessages[member.id];
                    const isTyping = typingUsers.includes(member.id);

                    return (
                        <div
                            key={member.id}
                            className="conversation-item"
                            onClick={() => navigate(`/chat/dm/${member.id}`)}
                        >
                            <div className="conversation-avatar">
                                <span className="avatar-text">
                                    {(member.name || member.email)?.[0]?.toUpperCase()}
                                </span>
                            </div>
                            <div className="conversation-info">
                                <div className="conversation-header">
                                    <span className="conversation-name">
                                        {member.name || member.email?.split('@')[0]}
                                    </span>
                                    {unread > 0 && (
                                        <span className="unread-badge">{unread}</span>
                                    )}
                                </div>
                                <p className="last-message">
                                    {isTyping ? (
                                        <span className="typing-indicator">typing...</span>
                                    ) : (
                                        formatLastMessage(lastMsg)
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {familyMembers.length === 0 && (
                    <div className="empty-state">
                        <p>No family members to chat with yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;
