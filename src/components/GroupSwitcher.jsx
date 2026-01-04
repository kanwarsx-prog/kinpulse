import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import GroupCreationModal from './GroupCreationModal';
import './GroupSwitcher.css';

const GroupSwitcher = () => {
    const { user, supabase, currentGroup, switchGroup: switchGroupContext } = useSupabase();
    const [groups, setGroups] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user?.id) {
            loadGroups();
        }
    }, [user?.id]); // Only re-run when user.id changes

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadGroups = async () => {
        try {
            // First, get group IDs user belongs to
            const { data: memberData, error: memberError } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', user.id);

            if (memberError) {
                console.error('Error loading group memberships:', memberError);
                return;
            }

            const groupIds = memberData?.map(gm => gm.group_id) || [];

            if (groupIds.length === 0) {
                console.log('No groups found for user');
                setGroups([]);
                return;
            }

            // Then, get the actual group data
            const { data: groupsData, error: groupsError } = await supabase
                .from('groups')
                .select('*')
                .in('id', groupIds);

            if (groupsError) {
                console.error('Error loading groups:', groupsError);
                return;
            }

            const userGroups = groupsData || [];
            console.log('Loaded groups:', userGroups);
            setGroups(userGroups);
            setLoading(false);

            // Get current group
            const { data: profile } = await supabase
                .from('profiles')
                .select('current_group_id')
                .eq('id', user.id)
                .single();

            if (profile?.current_group_id) {
                // Current group is already set in context via loadCurrentGroup
                // No need to do anything here
            } else if (userGroups.length > 0) {
                // Set first group as current if none set
                await switchGroupContext(userGroups[0].id);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    };

    const switchGroup = async (group) => {
        try {
            await switchGroupContext(group.id);
            setShowDropdown(false);
            // State updates in context will trigger re-renders in other components
        } catch (error) {
            console.error('Error switching group:', error);
        }
    };

    const handleCreateSuccess = (newGroup) => {
        // Reload groups to include the new one
        loadGroups();
    };

    if (!user || loading) {
        return null;
    }

    if (groups.length === 0) {
        return null;
    }

    return (
        <>
            <div className="group-switcher" ref={dropdownRef}>
                <button
                    className="current-group-btn"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    <span className="group-icon">{currentGroup?.icon || '👥'}</span>
                    <span className="group-name">{currentGroup?.name || 'Select Group'}</span>
                    <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
                </button>

                {showDropdown && (
                    <div className="group-dropdown">
                        <div className="dropdown-header">Switch Group</div>
                        {groups.map(group => (
                            <button
                                key={group.id}
                                className={`group-option ${group.id === currentGroup?.id ? 'active' : ''}`}
                                onClick={() => switchGroup(group)}
                            >
                                <span className="group-icon">{group.icon}</span>
                                <span className="group-name">{group.name}</span>
                                {group.id === currentGroup?.id && <span className="check-icon">✓</span>}
                            </button>
                        ))}
                        <div className="dropdown-divider" />
                        <button
                            className="create-group-btn"
                            onClick={() => {
                                setShowDropdown(false);
                                setShowCreateModal(true);
                            }}
                        >
                            <span className="plus-icon">➕</span>
                            <span>Create New Group</span>
                        </button>
                    </div>
                )}
            </div>

            <GroupCreationModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />
        </>
    );
};

export default GroupSwitcher;
