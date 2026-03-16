import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import '../../styles/pages/_writtenassign.scss';

const WrittenAssign = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const eventData = location.state?.eventData;

  const [staffCount, setStaffCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const scannerLoginUrl = useMemo(() => `${window.location.origin}/scanner-login/${eventId}`,[eventId]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post(`/events/${eventId}/written-assign`, {
        staffCount: Number(staffCount),
      });
      setResult(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate scanner login details.');
    } finally {
      setLoading(false);
    }
  };

  const buildCredentialsText = () => {
    if (!result?.credentials?.length) return '';

    const lines = [
      `Event: ${eventData?.name || eventId}`,
      `Expires: ${new Date(result.expiresAt).toLocaleString()}`,
      `Scanner Login: ${scannerLoginUrl}`,
      '',
      'Assigned Scanner Credentials:',
    ];

    result.credentials.forEach((cred, index) => {
      lines.push(`Scanner ${index + 1} | Username: ${cred.username} | Password: ${cred.password}`);
    });

    return lines.join('\n');
  };

  const copyCredentials = async () => {
    const text = buildCredentialsText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setActionMessage('Credentials copied to clipboard.');
    } catch (err) {
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = text;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);
      setActionMessage('Credentials copied to clipboard.');
    }
  };

  const printAssignmentSlip = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setActionMessage('Please allow pop-ups to print the assignment slip.');
      return;
    }

    const credentialRows = (result?.credentials || [])
      .map(
        (cred, index) => `
          <tr>
            <td>Scanner ${index + 1}</td>
            <td>${cred.username}</td>
            <td>${cred.password}</td>
          </tr>
        `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Written Assign Slip</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; color: #0b4f78; }
            p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Written Assign - Scanner Team</h1>
          <p><strong>Event:</strong> ${eventData?.name || eventId}</p>
          <p><strong>Event ID:</strong> ${eventId}</p>
          <p><strong>Credentials Expire:</strong> ${new Date(result.expiresAt).toLocaleString()}</p>
          <p><strong>Scanner Login:</strong> ${scannerLoginUrl}</p>

          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Username</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              ${credentialRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="written-assign-page">
      <div className="wa-header">
        <button className="wa-back" onClick={() => navigate('/organizer/events')}>
          Back
        </button>
        <h2>Written Assign Scanner Team</h2>
      </div>

      <div className="wa-card">
        <p className="wa-event">Event: <strong>{eventData?.name || eventId}</strong></p>
        <p className="wa-help">
          Select how many staff members will scan attendee QR codes at entry.
        </p>

        <div className="wa-controls">
          <label htmlFor="staff-count">Scanner Staff Count</label>
          <select
            id="staff-count"
            value={staffCount}
            onChange={(e) => setStaffCount(e.target.value)}
          >
            <option value={2}>2 people</option>
            <option value={3}>3 people</option>
            <option value={4}>4 people</option>
          </select>
          <button type="button" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Login Details'}
          </button>
        </div>

        {error && <p className="wa-error">{error}</p>}

        {result && (
          <div className="wa-result">
            <p>
              Credentials expire at: <strong>{new Date(result.expiresAt).toLocaleString()}</strong>
            </p>
            <p>
              Scanner login page: <a href={scannerLoginUrl} target="_blank" rel="noreferrer">{scannerLoginUrl}</a>
            </p>

            <div className="wa-credentials">
              {result.credentials?.map((cred, index) => (
                <div key={cred.username} className="wa-credential-item">
                  <h4>Scanner {index + 1}</h4>
                  <p>Username: <strong>{cred.username}</strong></p>
                  <p>Password: <strong>{cred.password}</strong></p>
                </div>
              ))}
            </div>

            <div className="wa-actions">
              <button type="button" className="wa-copy-btn" onClick={copyCredentials}>
                Copy Credentials
              </button>
              <button type="button" className="wa-print-btn" onClick={printAssignmentSlip}>
                Print Assignment Slip
              </button>
            </div>

            {actionMessage && <p className="wa-action-message">{actionMessage}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default WrittenAssign;
