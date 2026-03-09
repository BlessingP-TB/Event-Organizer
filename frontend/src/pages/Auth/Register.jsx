// src/pages/Auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import '../../styles/abstracts-auth/_auth.scss';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'attendee',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength validator
  const validatePasswordStrength = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      if (value && !validatePasswordStrength(value)) {
        toast.error(
          'Weak password! Must include upper, lower, number, special char & 8+ chars.',
          { id: 'password-toast', duration: 4000 }
        );
      } else {
        toast.dismiss('password-toast');
      }
    }

    if (name === 'confirmPassword' || name === 'password') {
      if (form.confirmPassword && value !== form.confirmPassword) {
        toast.error('Passwords do not match!', {
          id: 'mismatch-toast',
          duration: 4000,
        });
      } else {
        toast.dismiss('mismatch-toast');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validatePasswordStrength(form.password)) {
      toast.error('Password does not meet requirements!');
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match!');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        verify_password: form.confirmPassword,
        cellphone_number: form.phone,
        role: form.role.toUpperCase(),
      });

      toast.success('Registration successful! Please check your email.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error('Registration error:', err);
      let msg = 'Registration failed. Please try again.';
      if (err.response?.data) {
        if (err.response.data.message) {
          msg = err.response.data.message;
        } else if (err.response.data.error?.details?.length) {
          msg = err.response.data.error.details[0].message;
        } else if (typeof err.response.data === 'string') {
          msg = err.response.data;
        }
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <p>Join our platform and get started</p>

        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
          disabled={loading}
        />

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

        <label htmlFor="phone">Phone Number</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Enter your phone number"
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

        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="password-wrapper">
          <input
            type={showConfirm ? 'text' : 'password'}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            required
            disabled={loading}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowConfirm((p) => !p)}
            aria-label="Toggle confirm password visibility"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <label htmlFor="role">I want to register as:</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="attendee">Attendee</option>
          <option value="organizer">Organizer</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Registering…' : 'Register'}
        </button>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')}>Login</span>
          </p>
        </div>
      </form>
    </div>
  );
}
