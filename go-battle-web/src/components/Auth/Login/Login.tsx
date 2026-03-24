import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import '../../shared/CreateForm.css';
import Alert from 'react-bootstrap/Alert';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const err = await login(username, password);
        setLoading(false);

        if (err) {
            setError(err);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="create-page">
            <p className="create-page__title">Log In</p>
            <div className="create-card">
                <form onSubmit={handleSubmit}>
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="username">Username</label>
                        <input
                            id="username"
                            className="form-control form-control-sm"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-control form-control-sm"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    {error && <Alert variant="danger" className="mb-0 mt-3" style={{ fontSize: 13 }}>{error}</Alert>}
                    <div className="create-card__footer">
                        <button className="create-card__submit" type="submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            No account? <Link to="/register">Register</Link>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
