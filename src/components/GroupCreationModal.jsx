import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import './GroupCreationModal.css';

const EMOJIS = ['👥', '👨‍👩‍👧‍👦', '🏠', '💼', '🎮', '⚽', '🎨', '🎵', '📚', '🍕', '✈️', '🎯', '💪', '🧘', '🎓', '🏆'];

const GroupCreationModal = ({ isOpen, onClose, onSuccess }) => {
    const { supabase, user, loadCurrentGroup } = useSupabase();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Group Details
    const [groupName, setGroupName] = useState('');
    const [groupIcon, setGroupIcon] = useState('👥');
    const [groupDescription, setGroupDescription] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Step 2: Members
    const [activeTab, setActiveTab] = useState('contacts'); // 'contacts', 'email', or 'phone'
    const [existingContacts, setExistingContacts] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [emailInvites, setEmailInvites] = useState([]);
    const [phoneInvites, setPhoneInvites] = useState([]); // [{ name, tel }]
    const [emailError, setEmailError] = useState('');
    const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);

    useEffect(() => {
        setIsContactPickerSupported('contacts' in navigator && 'ContactsManager' in window);
    }, []);

    useEffect(() => {
        if (isOpen && step === 2) {
            fetchExistingContacts();
        }
    }, [isOpen, step]);

    const fetchExistingContacts = async () => {
        if (!user?.id) return;

        try {
            // Get all groups the user belongs to
            const { data: userGroups, error: groupsError } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', user.id);

            if (groupsError) {
                console.error('Error fetching user groups:', groupsError);
                setExistingContacts([]);
                return;
            }

            if (!userGroups || userGroups.length === 0) {
                setExistingContacts([]);
                return;
            }

            const groupIds = userGroups.map(g => g.group_id);

            // Get all members from those groups (excluding current user)
            const { data: members, error: membersError } = await supabase
                .from('group_members')
                .select('user_id')
                .in('group_id', groupIds)
                .neq('user_id', user.id);

            if (membersError) {
                console.error('Error fetching members:', membersError);
                setExistingContacts([]);
                return;
            }

            if (!members || members.length === 0) {
                setExistingContacts([]);
                return;
            }

            // Get unique user IDs
            const userIds = [...new Set(members.map(m => m.user_id))];

            // Fetch profiles for these users
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', userIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                setExistingContacts([]);
                return;
            }

            setExistingContacts(profiles || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setExistingContacts([]);
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

    const handleImportContacts = async () => {
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            const contacts = await navigator.contacts.select(props, opts);

            if (contacts.length > 0) {
                const newPhoneInvites = [...phoneInvites];

                contacts.forEach(contact => {
                    const name = contact.name?.[0] || 'Unknown';
                    const tel = contact.tel?.[0];

                    if (tel && !newPhoneInvites.some(p => p.tel === tel)) {
                        newPhoneInvites.push({ name, tel });
                    }
                });

                setPhoneInvites(newPhoneInvites);
            }
        } catch (err) {
            console.error('Error selecting contacts:', err);
            // Fallback or error message could go here
        }
    };

    const handleRemovePhone = (tel) => {
        setPhoneInvites(phoneInvites.filter(p => p.tel !== tel));
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
            await loadCurrentGroup(newGroup.id);

            // If we have phone invites, go to step 3 (Send Invites)
            if (phoneInvites.length > 0) {
                setLoading(false);
                setStep(3);
                return;
            }

            // Otherwise, reset and close
            handleClose();
            if (onSuccess) onSuccess(newGroup);
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group. Please try again.');
        } finally {
            if (step !== 3) {
                setLoading(false);
            }
        }
    };

    const sendSmsInvite = (phone, name) => {
        const message = `Join me in our new '${groupName}' group on KinPulse! Use code: DEFAULT`;
        const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleFinish = () => {
        handleClose();
        if (onSuccess) onSuccess();
    };

    const handleClose = () => {
        setStep(1);
        setGroupName('');
        setGroupIcon('👥');
        setGroupDescription('');
        setSelectedMembers([]);
        setEmailInvites([]);
        setPhoneInvites([]);
        setSearchQuery('');
        setEmailInput('');
        setEmailError('');
        onClose();
    };

    const filteredContacts = existingContacts.filter(contact =>
        contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return !isOpen ? null : (
        <div className="group-modal-overlay" onClick={handleClose}>
            <div className="group-modal" onClick={(e) => e.stopPropagation()}>
                <div className="group-modal-header">
                    <h2>{step === 3 ? 'Send Invites' : 'Create New Group'}</h2>
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
                    {step === 3 && (
                        <>
                            <div className="progress-line"></div>
                            <div className={`progress-step active`}>
                                <div className="progress-circle">3</div>
                                <span>Invite</span>
                            </div>
                        </>
                    )}
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
                                    App Contacts ({existingContacts.length})
                                </button>
                                <button
                                    className={`tab ${activeTab === 'email' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('email')}
                                >
                                    Email
                                </button>
                                <button // Always display Phone tab
                                    className={`tab ${activeTab === 'phone' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('phone')}
                                >
                                    Phone
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
                                        Invite friends, family, or colleagues by email
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

                            {activeTab === 'phone' && (
                                <div className="phone-tab">
                                    {isContactPickerSupported && (
                                        <div className="phone-actions">
                                            <button className="import-contacts-btn" onClick={handleImportContacts}>
                                                <span className="icon">📱</span> Select from Contact List
                                            </button>
                                            <div className="divider-text">or enter manually</div>
                                        </div>
                                    )}

                                    {!isContactPickerSupported && (
                                        <p className="helper-text">
                                            Enter name and phone number to send an SMS invite.
                                        </p>
                                    )}

                                    <div className="manual-phone-form">
                                        <input
                                            type="text"
                                            placeholder="Name (e.g. Mom)"
                                            id="manual-name"
                                            className="manual-input"
                                        />
                                        <div className="phone-input-group">
                                            <input
                                                type="tel"
                                                placeholder="Phone Number"
                                                id="manual-phone"
                                                className="manual-input"
                                            />
                                            <button
                                                className="add-btn"
                                                onClick={() => {
                                                    const nameInput = document.getElementById('manual-name');
                                                    const phoneInput = document.getElementById('manual-phone');
                                                    const name = nameInput.value.trim();
                                                    const tel = phoneInput.value.trim();

                                                    if (name && tel) {
                                                        if (!phoneInvites.some(p => p.tel === tel)) {
                                                            setPhoneInvites([...phoneInvites, { name, tel }]);
                                                            nameInput.value = '';
                                                            phoneInput.value = '';
                                                            nameInput.focus();
                                                        } else {
                                                            alert('This number is already added');
                                                        }
                                                    } else {
                                                        alert('Please enter both name and phone number');
                                                    }
                                                }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    {phoneInvites.length > 0 && (
                                        <div className="phone-list">
                                            {phoneInvites.map((contact, index) => (
                                                <div key={index} className="phone-chip">
                                                    <span className="contact-name">{contact.name}</span>
                                                    <span className="contact-tel">{contact.tel}</span>
                                                    <button onClick={() => handleRemovePhone(contact.tel)}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="step-content fade-in">
                            <h3>Send Invites</h3>
                            <p className="helper-text">
                                Your group is created! Now send invites to the contacts you selected.
                            </p>

                            <div className="invite-list">
                                {phoneInvites.map((contact, index) => (
                                    <div key={index} className="invite-item">
                                        <div className="invite-info">
                                            <div className="contact-name">{contact.name}</div>
                                            <div className="contact-tel">{contact.tel}</div>
                                        </div>
                                        <button
                                            className="send-invite-btn"
                                            onClick={() => sendSmsInvite(contact.tel, contact.name)}
                                        >
                                            Send SMS
                                        </button>
                                    </div>
                                ))}
                            </div>
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
                    ) : step === 2 ? (
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
                    ) : (
                        <button className="btn-primary full-width" onClick={handleFinish}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupCreationModal;
