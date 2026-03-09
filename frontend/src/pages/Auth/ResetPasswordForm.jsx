// src/pages/Auth/ResetPasswordForm.jsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import '../../styles/abstracts-auth/_auth.scss';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    const strong =
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /\d/.test(pwd) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (!strong) {
      toast.error(
        'Password must include upper, lower, number, special char, and 8+ chars.'
      );
      return false;
    }
    return true;
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword)
      return toast.error('Please fill both fields.');
    if (!validatePassword(password)) return;
    if (password !== confirmPassword)
      return toast.error('Passwords do not match.');
    if (!resetToken)
      return toast.error('Reset token missing. Try again.');

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword: password,
      });
      toast.success('Password reset successful! Redirecting...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to reset password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleResetSubmit}>
        <h1>Reset Password</h1>
        <p>Set a new password for your account</p>

        {!resetToken ? (
          <p className="error">
            Invalid or missing reset token. Please check your link.
          </p>
        ) : (
          <>
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />

            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </>
        )}

        <div className="auth-footer">
          <p>
            <span onClick={() => navigate('/login')}>Back to Login</span>
          </p>
        </div>
      </form>
    </div>
  );
}
