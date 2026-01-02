import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import './GroupSwitcher.css';

const GroupSwitcher = () => {
    const { user, supabase } = useSupabase();
    const [groups, setGroups] = useState([]);
    const [currentGroup, setCurrentGroup] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user) {
            loadGroups();
        }
    }, [user]);

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
            // Get all groups user belongs to
            const { data: memberData, error } = await supabase
                .from('group_members')
                .select('groups(*)')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error loading groups:', error);
                return;
            }

            // Extract groups and filter out any nulls
            const userGroups = memberData
                ?.map(gm => gm.groups)
                .filter(g => g && g.id) || [];

            console.log('Loaded groups:', userGroups);
            setGroups(userGroups);

            // Get current group
            const { data: profile } = await supabase
                .from('profiles')
                .select('current_group_id')
                .eq('id', user.id)
                .single();

            if (profile?.current_group_id) {
                const current = userGroups.find(g => g.id === profile.current_group_id);
                setCurrentGroup(current);
            } else if (userGroups.length > 0) {
                // Set first group as current if none set
                await switchGroup(userGroups[0]);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    };

    const switchGroup = async (group) => {
        try {
            await supabase
                .from('profiles')
                .update({ current_group_id: group.id })
                .eq('id', user.id);

            setCurrentGroup(group);
            setShowDropdown(false);

            // Reload page to refresh all data with new group context
            window.location.reload();
        } catch (error) {
            console.error('Error switching group:', error);
        }
    };

    const createGroup = () => {
        setShowDropdown(false);
        window.location.href = '/groups/create';
    };

    if (!user || groups.length === 0) {
        return null;
    }

    return (
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
                    <button className="create-group-btn" onClick={createGroup}>
                        <span className="plus-icon">➕</span>
                        <span>Create New Group</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default GroupSwitcher;
