import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import './RitualDetail.css';

const RitualDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { supabase, user } = useSupabase();

    const [ritual, setRitual] = useState(null);
    const [responses, setResponses] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [response, setResponse] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: ritualData } = await supabase.from('rituals').select('*').eq('id', id).single();
            setRitual(ritualData);

            const { data: profileData } = await supabase.from('profiles').select('*').eq('family_id', user.family_id);
            const profileMap = {};
            profileData?.forEach((p) => (profileMap[p.id] = p));
            setProfiles(profileMap);

            const { data: responseData } = await supabase
                .from('ritual_responses')
                .select('*')
                .eq('ritual_id', id)
                .order('created_at', { ascending: true });

            setResponses(responseData || []);

            const myRes = responseData?.find((r) => r.user_id === user.id);
            if (myRes) {
                setSubmitted(true);
                setResponse(myRes.response);
            }

            setLoading(false);
        };

        fetchData();
    }, [id, supabase, user.id, user.family_id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (response.trim()) {
            const { error } = await supabase.from('ritual_responses').insert({
                ritual_id: id,
                user_id: user.id,
                response: response
            });

            if (!error) {
                setSubmitted(true);
                setResponses([
                    ...responses,
                    {
                        user_id: user.id,
                        response: response,
                        created_at: new Date().toISOString()
                    }
                ]);
            }
        }
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
    if (!ritual) return <div style={{ padding: '20px', textAlign: 'center' }}>Ritual not found</div>;

    return (
        <div className="ritual-detail fade-in">
            <header className="detail-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <span className="header-title">Ritual</span>
            </header>

            <section className="prompt-section">
                <h1 className="prompt-text">{ritual.prompt}</h1>
                <p className="ritual-meta">{ritual.title}</p>
            </section>

            <section className="response-section">
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="response-form">
                        <textarea
                            className="response-input"
                            placeholder="Share your moment..."
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            rows={4}
                        />
                        <button type="submit" className="submit-response-btn" disabled={!response.trim()}>
                            Share
                        </button>
                    </form>
                ) : (
                    <div className="members-responses">
                        {responses.map((res, idx) => {
                            const isMe = res.user_id === user.id;
                            const profile = profiles[res.user_id];

                            if (isMe) {
                                return (
                                    <div key={idx} className="my-response">
                                        <span className="user-label">You</span>
                                        <p>{res.response}</p>
                                    </div>
                                );
                            }

                            return (
                                <div key={idx} className="family-response">
                                    <div className="response-meta">
                                        <span className="user-name">{profile?.username || 'Family Member'}</span>
                                        <span className="time">
                                            {new Date(res.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="response-text">{res.response}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default RitualDetail;
