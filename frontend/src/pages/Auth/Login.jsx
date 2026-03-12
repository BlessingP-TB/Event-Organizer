// src/pages/Auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import '../../styles/abstracts-auth/_auth.scss';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
      if (loading || retryAfterSeconds > 0) return;
    setLoading(true);

    const payload = {
      email: form.email.trim(),
      password: form.password,
    };

    console.log("Submitting form:", payload);

    try {
      const res = await api.post('/auth/login', payload);
      const { user, accessToken } = res.data;

      if (!user?.role) throw new Error('Invalid user data.');

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role.toUpperCase());

      toast.success('Login successful!');
      const routes = {
        ADMIN: '/admin',
        ORGANIZER: '/organizer',
        ATTENDEE: '/attendee',
      };
      navigate(routes[user.role.toUpperCase()] || '/');
    } catch (err) {
      const firstDetail = err.response?.data?.details?.[0]?.message;
      const msg =
        firstDetail ||
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials.';
      toast.error(msg, { id: 'auth-login-error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setRetryAfterSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [retryAfterSeconds]);

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Welcome Back</h1>
        <p>Login to your account</p>

        <label htmlFor="email">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
          disabled={loading}
        />

        <label htmlFor="password">Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((p) => !p)}
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button type="submit" disabled={loading || retryAfterSeconds > 0}>
          {loading
            ? 'Logging in…'
            : retryAfterSeconds > 0
              ? `Try again in ${retryAfterSeconds}s`
              : 'Login'}
        </button>

        <div className="auth-footer">
          <p>
            Don’t have an account?{' '}
            <span onClick={() => navigate('/register')}>Register</span>
          </p>
          <p>
            Forgot password?{' '}
            <span onClick={() => navigate('/forgot-password')}>Reset</span>
          </p>
        </div>
      </form>
    </div>
  );
}
