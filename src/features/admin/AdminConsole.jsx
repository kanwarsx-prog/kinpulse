import React, { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './AdminConsole.css';

const AdminConsole = () => {
    const { supabase, user } = useSupabase();
    const [activeTab, setActiveTab] = useState('groups'); // 'families' or 'groups'
    const [families, setFamilies] = useState([]);
    const [groups, setGroups] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);

    // Family form states
    const [newFamilyName, setNewFamilyName] = useState('');
    const [newInviteCode, setNewInviteCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserFamily, setNewUserFamily] = useState('');

    // Group form states
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupIcon, setNewGroupIcon] = useState('👥');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupIcon, setEditGroupIcon] = useState('');

    useEffect(() => {
        fetchData();
    }, [supabase]);

    const fetchData = async () => {
        setLoading(true);
        const [
            { data: fams },
            { data: grps },
            { data: profs },
            { data: members }
        ] = await Promise.all([
            supabase.from('families').select('*').order('created_at', { ascending: false }),
            supabase.from('groups').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*'),
            supabase.from('group_members').select('*')
        ]);
        setFamilies(fams || []);
        setGroups(grps || []);
        setProfiles(profs || []);
        setGroupMembers(members || []);
        setLoading(false);
    };

    const createFamily = async (e) => {
        e.preventDefault();
        if (!newFamilyName.trim()) return;
        setBusy(true);
        await supabase.from('families').insert({
            name: newFamilyName.trim(),
            invite_code: newInviteCode.trim() || null
        });
        setNewFamilyName('');
        setNewInviteCode('');
        setBusy(false);
        fetchData();
    };

    const createGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim() || !user) return;
        setBusy(true);

        // Create group
        const { data: newGroup, error: groupError } = await supabase
            .from('groups')
            .insert({
                name: newGroupName.trim(),
                icon: newGroupIcon,
                created_by: user.id
            })
            .select()
            .single();

        if (!groupError && newGroup) {
            // Add creator as admin
            await supabase.from('group_members').insert({
                group_id: newGroup.id,
                user_id: user.id,
                role: 'admin'
            });
        }

        setNewGroupName('');
        setNewGroupIcon('👥');
        setBusy(false);
        fetchData();
    };

    const addMemberToGroup = async (e) => {
        e.preventDefault();
        if (!selectedGroup || !selectedUser) return;
        setBusy(true);
        await supabase.from('group_members').insert({
            group_id: selectedGroup,
            user_id: selectedUser,
            role: 'member'
        });
        setSelectedGroup('');
        setSelectedUser('');
        setBusy(false);
        fetchData();
    };

    const removeMemberFromGroup = async (groupId, userId) => {
        if (!window.confirm('Remove this user from the group?')) return;
        setBusy(true);
        await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
        setBusy(false);
        fetchData();
    };

    const createUser = async (e) => {
        e.preventDefault();
        if (!newUserEmail.trim() || !newUserFamily) return;
        setBusy(true);
        await supabase.from('profiles').insert({
            email: newUserEmail.trim(),
            name: newUserName.trim() || null,
            family_id: newUserFamily
        });
        setNewUserEmail('');
        setNewUserName('');
        setNewUserFamily('');
        setBusy(false);
        fetchData();
    };

    const deleteFamily = async (id) => {
        if (!window.confirm('Delete this family and related data?')) return;
        setBusy(true);
        await supabase.from('families').delete().eq('id', id);
        setBusy(false);
        fetchData();
    };

    const deleteGroup = async (id) => {
        if (!window.confirm('Delete this group and all memberships?')) return;
        setBusy(true);
        await supabase.from('groups').delete().eq('id', id);
        setBusy(false);
        fetchData();
    };

    const startEditGroup = (group) => {
        setEditingGroupId(group.id);
        setEditGroupName(group.name);
        setEditGroupIcon(group.icon);
    };

    const cancelEditGroup = () => {
        setEditingGroupId(null);
        setEditGroupName('');
        setEditGroupIcon('');
    };

    const saveGroupEdit = async (groupId) => {
        if (!editGroupName.trim()) return;
        setBusy(true);
        await supabase
            .from('groups')
            .update({
                name: editGroupName.trim(),
                icon: editGroupIcon
            })
            .eq('id', groupId);
        setBusy(false);
        setEditingGroupId(null);
        setEditGroupName('');
        setEditGroupIcon('');
        fetchData();
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        setBusy(true);
        await supabase.from('profiles').delete().eq('id', id);
        setBusy(false);
        fetchData();
    };

    const familyList = useMemo(() => {
        const term = search.trim().toLowerCase();
        return families
            .map((fam) => {
                const members = profiles.filter((p) => p.family_id === fam.id);
                return { ...fam, members };
            })
            .filter((fam) => {
                if (!term) return true;
                return (
                    fam.name?.toLowerCase().includes(term) ||
                    fam.invite_code?.toLowerCase().includes(term) ||
                    fam.members.some((m) => (m.name || m.email || '').toLowerCase().includes(term))
                );
            });
    }, [families, profiles, search]);

    const groupList = useMemo(() => {
        const term = search.trim().toLowerCase();
        return groups
            .map((grp) => {
                const members = groupMembers
                    .filter((gm) => gm.group_id === grp.id)
                    .map((gm) => {
                        const profile = profiles.find((p) => p.id === gm.user_id);
                        return {
                            ...profile,
                            role: gm.role,
                            installation_status: profile?.installation_status
                        };
                    })
                    .filter(Boolean);
                return { ...grp, members };
            })
            .filter((grp) => {
                if (!term) return true;
                return (
                    grp.name?.toLowerCase().includes(term) ||
                    grp.members.some((m) => (m.name || m.email || '').toLowerCase().includes(term))
                );
            });
    }, [groups, groupMembers, profiles, search]);

    return (
        <div className="admin-console page fade-in">
            <header className="admin-header">
                <div>
                    <p className="admin-eyebrow">Admin</p>
                    <h1>Management Console</h1>
                </div>
                <input
                    className="admin-search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </header>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('groups')}
                >
                    Groups
                </button>
                <button
                    className={`admin-tab ${activeTab === 'families' ? 'active' : ''}`}
                    onClick={() => setActiveTab('families')}
                >
                    Families (Legacy)
                </button>
            </div>

            {activeTab === 'groups' && (
                <>
                    <div className="admin-forms">
                        <form className="admin-form" onSubmit={createGroup}>
                            <p className="admin-eyebrow">Create Group</p>
                            <div className="form-row">
                                <input
                                    placeholder="Group name"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                                <input
                                    placeholder="Icon (emoji)"
                                    value={newGroupIcon}
                                    onChange={(e) => setNewGroupIcon(e.target.value)}
                                    style={{ width: '100px' }}
                                />
                                <button type="submit" disabled={busy || !newGroupName.trim()}>Create</button>
                            </div>
                        </form>
                        <form className="admin-form" onSubmit={addMemberToGroup}>
                            <p className="admin-eyebrow">Add Member to Group</p>
                            <div className="form-row">
                                <select
                                    value={selectedGroup}
                                    onChange={(e) => setSelectedGroup(e.target.value)}
                                    required
                                >
                                    <option value="">Select group</option>
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    required
                                >
                                    <option value="">Select user</option>
                                    {profiles.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name || p.email}</option>
                                    ))}
                                </select>
                                <button type="submit" disabled={busy || !selectedGroup || !selectedUser}>Add</button>
                            </div>
                        </form>
                    </div>

                    {loading ? (
                        <p className="admin-hint">Loading...</p>
                    ) : (
                        <div className="admin-grid">
                            {groupList.map((grp) => (
                                <div key={grp.id} className="admin-card">
                                    <div className="admin-card-header">
                                        <div>
                                            <p className="admin-eyebrow">Group</p>
                                            {editingGroupId === grp.id ? (
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={editGroupIcon}
                                                        onChange={(e) => setEditGroupIcon(e.target.value)}
                                                        style={{ width: '40px', fontSize: '20px' }}
                                                        maxLength={2}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editGroupName}
                                                        onChange={(e) => setEditGroupName(e.target.value)}
                                                        style={{ flex: 1 }}
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <h3>{grp.icon} {grp.name}</h3>
                                            )}
                                        </div>
                                        <div className="admin-actions">
                                            <span className="admin-badge">{grp.members.length} members</span>
                                            {editingGroupId === grp.id ? (
                                                <>
                                                    <button onClick={() => saveGroupEdit(grp.id)} disabled={busy || !editGroupName.trim()}>Save</button>
                                                    <button onClick={cancelEditGroup} disabled={busy}>Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEditGroup(grp)} disabled={busy}>Rename</button>
                                                    <button className="admin-delete" onClick={() => deleteGroup(grp.id)} disabled={busy}>Delete</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="admin-users">
                                        {grp.members.map((m) => (
                                            <div key={m.id} className="admin-user">
                                                <div className="admin-avatar">{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</div>
                                                <div>
                                                    <p className="admin-user-name">{m.name || m.email}</p>
                                                    <p className="admin-user-sub">{m.email} • {m.role}</p>
                                                </div>
                                                <button className="admin-delete" onClick={() => removeMemberFromGroup(grp.id, m.id)} disabled={busy}>Remove</button>
                                            </div>
                                        ))}
                                        {grp.members.length === 0 && <p className="admin-hint">No members</p>}
                                    </div>
                                </div>
                            ))}
                            {groupList.length === 0 && <p className="admin-hint">No groups found</p>}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'families' && (
                <>
                    <div className="admin-forms">
                        <form className="admin-form" onSubmit={createFamily}>
                            <p className="admin-eyebrow">Add family</p>
                            <div className="form-row">
                                <input
                                    placeholder="Family name"
                                    value={newFamilyName}
                                    onChange={(e) => setNewFamilyName(e.target.value)}
                                />
                                <input
                                    placeholder="Invite code (optional)"
                                    value={newInviteCode}
                                    onChange={(e) => setNewInviteCode(e.target.value)}
                                />
                                <button type="submit" disabled={busy || !newFamilyName.trim()}>Add</button>
                            </div>
                        </form>
                        <form className="admin-form" onSubmit={createUser}>
                            <p className="admin-eyebrow">Add user</p>
                            <div className="form-row">
                                <input
                                    placeholder="Name"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                />
                                <input
                                    placeholder="Email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    required
                                />
                                <select
                                    value={newUserFamily}
                                    onChange={(e) => setNewUserFamily(e.target.value)}
                                    required
                                >
                                    <option value="">Select family</option>
                                    {families.map((f) => (
                                        <option key={f.id} value={f.id}>{f.name || f.invite_code || f.id}</option>
                                    ))}
                                </select>
                                <button type="submit" disabled={busy || !newUserEmail.trim() || !newUserFamily}>Add</button>
                            </div>
                        </form>
                    </div>

                    {loading ? (
                        <p className="admin-hint">Loading...</p>
                    ) : (
                        <div className="admin-grid">
                            {familyList.map((fam) => (
                                <div key={fam.id} className="admin-card">
                                    <div className="admin-card-header">
                                        <div>
                                            <p className="admin-eyebrow">Family</p>
                                            <h3>{fam.name || 'Untitled family'}</h3>
                                            <p className="admin-sub">Invite: {fam.invite_code || 'N/A'}</p>
                                        </div>
                                        <div className="admin-actions">
                                            <span className="admin-badge">{fam.members.length} users</span>
                                            <button className="admin-delete" onClick={() => deleteFamily(fam.id)} disabled={busy}>Delete</button>
                                        </div>
                                    </div>
                                    <div className="admin-users">
                                        {fam.members.map((m) => (
                                            <div key={m.id} className="admin-user">
                                                <div className="admin-avatar">{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</div>
                                                <div>
                                                    <p className="admin-user-name">
                                                        {m.name || m.email}
                                                        {m.installation_status === 'standalone' && <span title="App Installed">📱</span>}
                                                        {m.installation_status === 'browser' && <span title="Browser">🌐</span>}
                                                    </p>
                                                    <p className="admin-user-sub">{m.email}</p>
                                                </div>
                                                <button className="admin-delete" onClick={() => deleteUser(m.id)} disabled={busy}>Remove</button>
                                            </div>
                                        ))}
                                        {fam.members.length === 0 && <p className="admin-hint">No users</p>}
                                    </div>
                                </div>
                            ))}
                            {familyList.length === 0 && <p className="admin-hint">No results</p>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminConsole;
