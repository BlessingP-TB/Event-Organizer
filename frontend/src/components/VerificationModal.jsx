import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../styles/components/_verification-modal.scss';

export default function VerificationModal({ email, onVerified, onClose }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setCode(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, code: fullCode });
      toast.success('Email verified successfully!');
      onVerified();
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || 'Verification failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('New verification code sent!');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('Resend error:', err);
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again.';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal">
        <button className="close-btn" onClick={onClose} disabled={loading}>
          &times;
        </button>
        
        <h2>Verify Your Email</h2>
        <p>We've sent a 6-digit code to</p>
        <p className="email">{email}</p>
        
        <div className="code-inputs" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className="code-input"
            />
          ))}
        </div>

        <button
          className="verify-btn"
          onClick={handleVerify}
          disabled={loading || code.join('').length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <p className="resend-text">
          Didn't receive the code?{' '}
          <button
            className="resend-btn"
            onClick={handleResend}
            disabled={resending || loading}
          >
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
        </p>
      </div>
    </div>
  );
}
