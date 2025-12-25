import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './VaultHome.css';

const TYPE_LABELS = {
    document: 'Document',
    note: 'Note',
    credential: 'Credential',
    instruction: 'Instruction',
    media: 'Media'
};

const VaultHome = () => {
    const { supabase, user } = useSupabase();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        title: '',
        item_type: 'document',
        description: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.family_id]);

    const fetchItems = async () => {
        if (!user?.family_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('vault_items')
            .select('*')
            .eq('family_id', user.family_id)
            .order('updated_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error('Vault fetch error:', error);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSaving(true);
        const { data, error } = await supabase
            .from('vault_items')
            .insert([{
                title: form.title.trim(),
                item_type: form.item_type,
                description: form.description.trim(),
                family_id: user.family_id,
                owner_id: user.id
            }])
            .select()
            .single();
        if (error) {
            console.error('Vault create error:', error);
        } else if (data) {
            setItems([data, ...items]);
            setForm({ title: '', item_type: 'document', description: '' });
        }
        setSaving(false);
    };

    const typeBadge = (type) => (
        <span className="vault-type">{TYPE_LABELS[type] || type}</span>
    );

    return (
        <div className="vault-home page fade-in">
            <header className="vault-header">
                <div>
                    <p className="vault-eyebrow">Secure Vault</p>
                    <h1>Trust Vault</h1>
                    <p className="vault-subtitle">Store critical docs, instructions, and credentials with family-specific access.</p>
                </div>
            </header>

            <section className="vault-card">
                <h3>Add Item</h3>
                <form className="vault-form" onSubmit={handleCreate}>
                    <div className="vault-field">
                        <label>Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            maxLength={80}
                            placeholder="Insurance policy, Passport, etc."
                            required
                        />
                    </div>
                    <div className="vault-row">
                        <div className="vault-field">
                            <label>Type</label>
                            <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}>
                                {Object.keys(TYPE_LABELS).map((key) => (
                                    <option key={key} value={key}>{TYPE_LABELS[key]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="vault-field">
                            <label>Notes</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                maxLength={140}
                                placeholder="Short description"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
                </form>
            </section>

            <section className="vault-list">
                <div className="vault-list-header">
                    <h3>Recent Items</h3>
                    <button className="vault-refresh" onClick={fetchItems} disabled={loading}>Refresh</button>
                </div>
                {loading ? (
                    <p className="vault-hint">Loading...</p>
                ) : items.length === 0 ? (
                    <p className="vault-hint">No items yet. Add your first secure record.</p>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="vault-item">
                            <div className="vault-item-top">
                                <div>
                                    <p className="vault-item-title">{item.title}</p>
                                    <p className="vault-item-meta">
                                        {typeBadge(item.item_type)} · Last updated {new Date(item.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {item.is_encrypted && <span className="vault-encrypted">Encrypted</span>}
                            </div>
                            {item.description && <p className="vault-item-desc">{item.description}</p>}
                        </div>
                    ))
                )}
            </section>
        </div>
    );
};

export default VaultHome;
