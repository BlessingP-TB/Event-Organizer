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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

     console.log("Submitting form:", form);

    try {
      const res = await api.post('/auth/login', form);
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
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
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
