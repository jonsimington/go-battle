import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import '../../shared/CreateForm.css';
import Alert from 'react-bootstrap/Alert';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        const err = await register(username, password);
        setLoading(false);

        if (err) {
            setError(err);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="create-page">
            <p className="create-page__title">Register</p>
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
                            minLength={3}
                            maxLength={30}
                            required
                        />
                        <p className="create-card__hint">3-30 characters</p>
                    </div>
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-control form-control-sm"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                        <p className="create-card__hint">At least 8 characters</p>
                    </div>
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            className="form-control form-control-sm"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    {error && <Alert variant="danger" className="mb-0 mt-3" style={{ fontSize: 13 }}>{error}</Alert>}
                    <div className="create-card__footer">
                        <button className="create-card__submit" type="submit" disabled={loading}>
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Already have an account? <Link to="/login">Log In</Link>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
