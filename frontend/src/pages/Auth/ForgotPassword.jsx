// src/pages/Auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import '../../styles/abstracts-auth/_auth.scss';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success(
        `If an account with "${email}" exists, a reset link has been sent. Check your inbox.`
      );
      setEmail('');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to send reset link. Try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleEmailSubmit}>
        <h1>Forgot Password</h1>
        <p>Enter your email to receive a reset link</p>

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Sending Link…' : 'Send Reset Link'}
        </button>

        <div className="auth-footer">
          <p>
            Remembered your password?{' '}
            <span onClick={() => navigate('/login')}>Back to Login</span>
          </p>
        </div>
      </form>
    </div>
  );
}
