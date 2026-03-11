import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import "../styles/pages/_notifications.scss";

const getStorageKeyFromPath = () => "adminNotifications";

const NotificationsPage = () => {
  const location = useLocation();
  const storageKey = useMemo(() => getStorageKeyFromPath(location.pathname), [location.pathname]);
  const [notifications, setNotifications] = useState([]);

  const persistNotifications = (next) => {
    setNotifications(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(`${storageKey}Updated`));
  };

  useEffect(() => {
    const loadNotifications = () => {
      try {
        const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const safeList = Array.isArray(raw) ? raw : [];

        // Opening the page marks notifications as read.
        const normalized = safeList.map((n) => ({ ...n, read: true }));
        persistNotifications(normalized);
      } catch {
        setNotifications([]);
      }
    };

    loadNotifications();

    const eventName = `${storageKey}Updated`;
    window.addEventListener(eventName, loadNotifications);
    return () => window.removeEventListener(eventName, loadNotifications);
  }, [storageKey]);

  const handleDismiss = (id) => {
    const updated = notifications.filter((n) => n.id !== id);
    persistNotifications(updated);
  };

  const clearAll = () => {
    persistNotifications([]);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(updated);
  };

  const toggleReadStatus = (id) => {
    const updated = notifications.map((n) => (
      n.id === id ? { ...n, read: !n.read } : n
    ));
    persistNotifications(updated);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <section className="notifications-page">
      <header className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>All updates are shown here instead of side popups.</p>
        </div>
        <div className="notifications-actions">
          <button
            type="button"
            className="notif-action"
            onClick={markAllAsRead}
            disabled={notifications.length === 0 || unreadCount === 0}
          >
            <CheckCheck size={16} aria-hidden="true" />
            All Read
          </button>
          <button type="button" className="notif-action danger" onClick={clearAll} disabled={notifications.length === 0}>
            <Trash2 size={16} aria-hidden="true" />
            Clear All
          </button>
        </div>
      </header>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <Bell size={18} aria-hidden="true" />
          <span>No notifications yet.</span>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((note) => (
            <article key={note.id} className={`notification-card ${note.read ? "read" : "unread"}`}>
              <div className="notification-content">
                <h3>{note.title || "Notification"}</h3>
                <p>{note.message || "No message details."}</p>
                <small>{note.timestamp || note.time || "Just now"}</small>
              </div>
              <div className="notification-card-actions">
                <button
                  type="button"
                  className="read-btn"
                  onClick={() => toggleReadStatus(note.id)}
                >
                  {note.read ? "Mark Unread" : "Mark Read"}
                </button>

                <button type="button" className="dismiss-btn" onClick={() => handleDismiss(note.id)} aria-label="Delete notification">
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

export default NotificationsPage;
