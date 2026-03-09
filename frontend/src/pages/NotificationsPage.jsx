import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/pages/_notifications.scss';

export default function NotificationsPage({ role = 'ATTENDEE' }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const data = res.data?.data || [];
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const openEvent = (note) => {
    const eventId = note?.data?.eventId;
    if (!eventId) return;
    if (role === 'ADMIN') navigate(`/admin/details/${eventId}`);
    else if (role === 'ORGANIZER') navigate(`/organizer/event/${eventId}`);
    else navigate(`/attendee/view-event/${eventId}`);
  };

  const markRead = async (noteId) => {
    try {
      await api.patch(`/notifications/${noteId}/read`);
      fetchNotes();
    } catch (err) {
      console.warn('Failed to mark read', err);
    }
  };

  return (
    <div className="notifications-page">
      <h2>Notifications</h2>
      {loading ? (
        <p>Loading...</p>
      ) : notes.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul className="notifications-list">
          {notes.map((n) => (
            <li key={n.id} className={`note ${n.read ? 'read' : 'unread'}`}>
              <div className="note-content">
                <div className="note-type">{(n.type || '').replace(/_/g, ' ')}</div>
                <div className="note-message">{n.message}</div>
                <div className="note-time">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="note-actions">
                {n.data?.eventId && (
                  <button onClick={() => openEvent(n)}>Open Event</button>
                )}
                {!n.read && (
                  <button onClick={() => markRead(n.id)}>Mark Read</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
