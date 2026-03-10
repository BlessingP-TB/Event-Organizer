import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import '../../styles/abstracts-auth/_auth.scss';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (!token) {
        if (!isMounted) return;
        setStatus('error');
        setMessage('Invalid or missing verification token. Please request a new verification email.');
        return;
      }

      try {
        const response = await api.post('/auth/verify-email', { token });
        if (!isMounted) return;

        const successMessage =
          response.data?.message ||
          'Your email has been verified successfully. You can now log in.';

        setStatus('success');
        setMessage(successMessage);
        toast.success('Email verified successfully.');
      } catch (error) {
        if (!isMounted) return;

        const errorMessage =
          error.response?.data?.message ||
          'Email verification failed. Please request a new verification email.';

        setStatus('error');
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="auth-center">
      <div className="auth-form">
        <h1>Verify Email</h1>
        <p>Complete your account verification</p>

        <p className={status === 'success' ? 'success' : status === 'error' ? 'error' : 'message'}>
          {message}
        </p>

        {status === 'verifying' ? (
          <button type="button" disabled>
            Verifying…
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        )}

        <div className="auth-footer">
          <p>
            Need a new link? <span onClick={() => navigate('/register')}>Register again</span>
          </p>
        </div>
      </div>
    </div>
  );
}
