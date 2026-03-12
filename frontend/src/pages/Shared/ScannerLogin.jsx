import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import '../../styles/pages/_scannercheckin.scss';

const ScannerLogin = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post(`/events/${eventId}/written-assign/login`, {
        username: username.trim(),
        password: password.trim(),
      });

      sessionStorage.setItem('scannerAccessToken', response.data.accessToken);
      sessionStorage.setItem('scannerEventId', eventId);
      navigate(`/scanner/${eventId}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid scanner credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-page">
      <div className="scanner-card login-card">
        <h2>Scanner Login</h2>
        <p>Use assigned scanner credentials for this event entry gate.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="scanner-username">Username</label>
          <input
            id="scanner-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="scanner-password">Password</label>
          <input
            id="scanner-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="scanner-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login to Scanner'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScannerLogin;
