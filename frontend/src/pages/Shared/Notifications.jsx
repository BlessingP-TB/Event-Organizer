import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../utils/api";
import "../../styles/pages/_notifications.scss";

const roleConfig = {
  admin: {
    title: "Admin Notifications"
  },
  organizer: {
    title: "Organizer Notifications"
  },
  attendee: {
    title: "Attendee Notifications"
  }
};

const Notifications = () => {
  const location = useLocation();
  const roleSegment = location.pathname.split("/")[1] || "attendee";

  const { title } = useMemo(() => {
    return roleConfig[roleSegment] || roleConfig.attendee;
  }, [roleSegment]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setNotifications([]);
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('notificationsUpdated', handleUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleUpdate);
  }, [loadNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}`, { read: true });
      setNotifications((prev) => prev.map((item) => (
        item.id === id ? { ...item, read: true } : item
      )));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      toast.error('Failed to update notification.');
    }
  };

  const dismissNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      toast.error('Failed to delete notification.');
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      toast.error('Failed to clear notifications.');
    }
  };

  return (
    <section className="notifications-page">
      <div className="notifications-header">
        <h1>{title}</h1>
        {notifications.length > 0 && (
          <button type="button" className="clear-btn" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="notifications-empty">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">No notifications yet.</div>
      ) : (
        <div className="notifications-list">
          {notifications.map((item) => (
            <article key={item.id} className="notification-card">
              <div className="notification-main">
                <h3>{item.title || "Notification"}</h3>
                <p>{item.message || "You have a new update."}</p>
                <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Just now"}</small>
              </div>
              <div className="notification-actions">
                {!item.read && (
                  <button
                    type="button"
                    className="dismiss-btn"
                    onClick={() => markAsRead(item.id)}
                  >
                    Mark read
                  </button>
                )}

                <button
                  type="button"
                  className="dismiss-btn"
                  onClick={() => dismissNotification(item.id)}
                  aria-label="Dismiss notification"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Notifications;
