import React, { useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './LoginScreen.css';

const LoginScreen = () => {
    const { signIn, signUp } = useSupabase();
    const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = mode === 'signin'
            ? await signIn(email, password)
            : await signUp(email, password);

        setLoading(false);

        if (error) {
            setMessage(error.message);
        } else if (mode === 'signup') {
            setMessage('Account created! Please check your email to confirm.');
        }
    };

    return (
        <div className="login-screen fade-in">
            <div className="login-card">
                <h1>KinPulse</h1>
                <p className="tagline">Your family, stronger.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                {message && <p className="message">{message}</p>}

                <button
                    className="toggle-mode"
                    onClick={() => {
                        setMode(mode === 'signin' ? 'signup' : 'signin');
                        setMessage(null);
                    }}
                >
                    {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
            </div>
        </div>
    );
};

export default LoginScreen;
