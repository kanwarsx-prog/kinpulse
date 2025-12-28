import React, { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './AdminConsole.css';

const AdminConsole = () => {
    const { supabase } = useSupabase();
    const [families, setFamilies] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [newFamilyName, setNewFamilyName] = useState('');
    const [newInviteCode, setNewInviteCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserFamily, setNewUserFamily] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [{ data: fams }, { data: profs }] = await Promise.all([
                supabase.from('families').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*')
            ]);
            setFamilies(fams || []);
            setProfiles(profs || []);
            setLoading(false);
        };
        fetchData();
    }, [supabase]);

    const refresh = async () => {
        const [{ data: fams }, { data: profs }] = await Promise.all([
            supabase.from('families').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*')
        ]);
        setFamilies(fams || []);
        setProfiles(profs || []);
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
        refresh();
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
        refresh();
    };

    const deleteFamily = async (id) => {
        if (!window.confirm('Delete this family and related data?')) return;
        setBusy(true);
        await supabase.from('families').delete().eq('id', id);
        setBusy(false);
        refresh();
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        setBusy(true);
        await supabase.from('profiles').delete().eq('id', id);
        setBusy(false);
        refresh();
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

    return (
        <div className="admin-console page fade-in">
            <header className="admin-header">
                <div>
                    <p className="admin-eyebrow">Admin</p>
                    <h1>Families & Users</h1>
                </div>
                <input
                    className="admin-search"
                    placeholder="Search families or users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </header>

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
                                            <p className="admin-user-name">{m.name || m.email}</p>
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
        </div>
    );
};

export default AdminConsole;
