import React, { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './AdminConsole.css';

const AdminConsole = () => {
    const { supabase } = useSupabase();
    const [families, setFamilies] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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
                                <span className="admin-badge">{fam.members.length} users</span>
                            </div>
                            <div className="admin-users">
                                {fam.members.map((m) => (
                                    <div key={m.id} className="admin-user">
                                        <div className="admin-avatar">{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</div>
                                        <div>
                                            <p className="admin-user-name">{m.name || m.email}</p>
                                            <p className="admin-user-sub">{m.email}</p>
                                        </div>
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
