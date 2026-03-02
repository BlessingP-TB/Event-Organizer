// src/pages/Auth/Unauthorized.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/abstracts-auth/_auth.scss';

export default function Unauthorized() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role')?.toUpperCase();

  const getRedirectPath = () => {
    if (userRole === 'ADMIN') return '/admin';
    if (userRole === 'ORGANIZER') return '/organizer';
    if (userRole === 'ATTENDEE') return '/attendee';
    return '/';
  };

  return (
    <div className="auth-center">
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: '#d9534f' }}>403</h1>
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to view this page.</p>

        <button onClick={() => navigate(getRedirectPath())}>
          Go Back
        </button>
      </div>
    </div>
  );
}
