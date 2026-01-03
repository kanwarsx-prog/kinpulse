import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import './GroupCreationModal.css';

const EMOJIS = ['👥', '👨‍👩‍👧‍👦', '🏠', '💼', '🎮', '⚽', '🎨', '🎵', '📚', '🍕', '✈️', '🎯', '💪', '🧘', '🎓', '🏆'];

const GroupCreationModal = ({ isOpen, onClose, onSuccess }) => {
    const { supabase, user, setCurrentGroup } = useSupabase();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Group Details
    const [groupName, setGroupName] = useState('');
    const [groupIcon, setGroupIcon] = useState('👥');
    const [groupDescription, setGroupDescription] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Step 2: Members
    const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' or 'email'
    const [existingContacts, setExistingContacts] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [emailInvites, setEmailInvites] = useState([]);
    const [emailError, setEmailError] = useState('');

    useEffect(() => {
        if (isOpen && step === 2) {
            fetchExistingContacts();
        }
    }, [isOpen, step]);

    const fetchExistingContacts = async () => {
        if (!user?.id) return;

        try {
            // Get all users from groups the current user belongs to
            const { data, error } = await supabase.rpc('get_group_contacts', {
                p_user_id: user.id
            });

            if (error) {
                console.error('Error fetching contacts:', error);
                // Fallback to manual query if RPC doesn't exist
                const { data: members } = await supabase
                    .from('group_members')
                    .select('user_id, groups!inner(id, name)')
                    .in('group_id',
                        supabase
                            .from('group_members')
                            .select('group_id')
                            .eq('user_id', user.id)
                    );

                if (members) {
                    const userIds = [...new Set(members.map(m => m.user_id))].filter(id => id !== user.id);
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, name, avatar_url')
                        .in('id', userIds);

                    setExistingContacts(profiles || []);
                }
            } else {
                setExistingContacts(data || []);
            }
        } catch (err) {
            console.error('Error fetching contacts:', err);
        }
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleAddEmail = () => {
        setEmailError('');

        if (!emailInput.trim()) {
            setEmailError('Please enter an email address');
            return;
        }

        if (!validateEmail(emailInput)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        if (emailInvites.includes(emailInput.toLowerCase())) {
            setEmailError('This email is already added');
            return;
        }

        setEmailInvites([...emailInvites, emailInput.toLowerCase()]);
        setEmailInput('');
    };

    const handleRemoveEmail = (email) => {
        setEmailInvites(emailInvites.filter(e => e !== email));
    };

    const toggleMemberSelection = (memberId) => {
        if (selectedMembers.includes(memberId)) {
            setSelectedMembers(selectedMembers.filter(id => id !== memberId));
        } else {
            setSelectedMembers([...selectedMembers, memberId]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert('Please enter a group name');
            return;
        }

        setLoading(true);

        try {
            // Create the group
            const { data: newGroup, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: groupName.trim(),
                    description: groupDescription.trim(),
                    icon: groupIcon,
                    created_by: user.id
                })
                .select()
                .single();

            if (groupError) throw groupError;

            // Add creator as admin
            await supabase
                .from('group_members')
                .insert({
                    group_id: newGroup.id,
                    user_id: user.id,
                    role: 'admin'
                });

            // Add selected members
            if (selectedMembers.length > 0) {
                await supabase
                    .from('group_members')
                    .insert(
                        selectedMembers.map(memberId => ({
                            group_id: newGroup.id,
                            user_id: memberId,
                            role: 'member'
                        }))
                    );
            }

            // Send email invitations
            if (emailInvites.length > 0) {
                await supabase
                    .from('group_invitations')
                    .insert(
                        emailInvites.map(email => ({
                            group_id: newGroup.id,
                            inviter_id: user.id,
                            invitee_email: email
                        }))
                    );
            }

            // Switch to the new group
            setCurrentGroup(newGroup);

            // Reset and close
            handleClose();
            if (onSuccess) onSuccess(newGroup);
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setGroupName('');
        setGroupIcon('👥');
        setGroupDescription('');
        setSelectedMembers([]);
        setEmailInvites([]);
        setSearchQuery('');
        setEmailInput('');
        setEmailError('');
        onClose();
    };

    const filteredContacts = existingContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return !isOpen ? null : (
        <div className="group-modal-overlay" onClick={handleClose}>
            <div className="group-modal" onClick={(e) => e.stopPropagation()}>
                <div className="group-modal-header">
                    <h2>Create New Group</h2>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="group-modal-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                        <div className="progress-circle">1</div>
                        <span>Details</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <div className="progress-circle">2</div>
                        <span>Members</span>
                    </div>
                </div>

                <div className="group-modal-body">
                    {step === 1 && (
                        <div className="step-content fade-in">
                            <div className="form-group">
                                <label>Group Icon</label>
                                <div className="icon-selector">
                                    <button
                                        className="selected-icon"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        {groupIcon}
                                    </button>
                                    {showEmojiPicker && (
                                        <div className="emoji-picker">
                                            {EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    className="emoji-option"
                                                    onClick={() => {
                                                        setGroupIcon(emoji);
                                                        setShowEmojiPicker(false);
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Group Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Family, Friends, Work Team..."
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    maxLength={50}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    placeholder="What's this group about?"
                                    value={groupDescription}
                                    onChange={(e) => setGroupDescription(e.target.value)}
                                    maxLength={200}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="step-content fade-in">
                            <div className="tabs">
                                <button
                                    className={`tab ${activeTab === 'contacts' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('contacts')}
                                >
                                    Existing Contacts ({existingContacts.length})
                                </button>
                                <button
                                    className={`tab ${activeTab === 'email' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('email')}
                                >
                                    Invite by Email ({emailInvites.length})
                                </button>
                            </div>

                            {activeTab === 'contacts' && (
                                <div className="contacts-tab">
                                    {existingContacts.length > 0 && (
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Search contacts..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    )}

                                    <div className="contacts-list">
                                        {existingContacts.length === 0 ? (
                                            <div className="empty-state">
                                                <p>No contacts yet. Invite people by email to get started!</p>
                                            </div>
                                        ) : filteredContacts.length === 0 ? (
                                            <div className="empty-state">
                                                <p>No contacts match your search</p>
                                            </div>
                                        ) : (
                                            filteredContacts.map(contact => (
                                                <label key={contact.id} className="contact-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMembers.includes(contact.id)}
                                                        onChange={() => toggleMemberSelection(contact.id)}
                                                    />
                                                    <div className="contact-info">
                                                        <div className="contact-name">{contact.name}</div>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {selectedMembers.length > 0 && (
                                        <div className="selected-count">
                                            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'email' && (
                                <div className="email-tab">
                                    <p className="helper-text">
                                        Invite friends, family, or colleagues who aren't on KinPulse yet
                                    </p>

                                    <div className="email-input-group">
                                        <input
                                            type="email"
                                            placeholder="Enter email address"
                                            value={emailInput}
                                            onChange={(e) => {
                                                setEmailInput(e.target.value);
                                                setEmailError('');
                                            }}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                                        />
                                        <button onClick={handleAddEmail} className="add-btn">
                                            Add
                                        </button>
                                    </div>

                                    {emailError && <div className="error-message">{emailError}</div>}

                                    {emailInvites.length > 0 && (
                                        <div className="email-list">
                                            {emailInvites.map(email => (
                                                <div key={email} className="email-chip">
                                                    <span>{email}</span>
                                                    <button onClick={() => handleRemoveEmail(email)}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="group-modal-footer">
                    {step === 1 ? (
                        <>
                            <button className="btn-secondary" onClick={handleClose}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => setStep(2)}
                                disabled={!groupName.trim()}
                            >
                                Next: Add Members
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={() => setStep(1)}>
                                Back
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateGroup}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Group'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupCreationModal;
