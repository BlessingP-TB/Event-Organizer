// src/components/ModernSidebar.jsx

import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import "../styles/components/_modernSidebar.scss";
import NotificationModal from './NotificationModal';

const ModernSidebar = ({ role, links, storageKey }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const popupRef = useRef(null);

  /* ---------------- Load Notifications ---------------- */
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    setNotifications(stored);

    const handleUpdate = () => {
      const updated = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setNotifications(updated);
    };

    const handleCountUpdate = () => {
      // trigger re-render by reading from localStorage when count updates
      const storedCount = parseInt(localStorage.getItem(`${storageKey}:unreadCount`) || '0', 10);
      // update notifications state only if count change might imply different list
      setNotifications(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    };

    window.addEventListener(`${storageKey}Updated`, handleUpdate);
    window.addEventListener(`${storageKey}CountUpdated`, handleCountUpdate);
    return () => {
      window.removeEventListener(`${storageKey}Updated`, handleUpdate);
      window.removeEventListener(`${storageKey}CountUpdated`, handleCountUpdate);
    };
  }, [storageKey]);

  const unreadCount = parseInt(localStorage.getItem(`${storageKey}:unreadCount`) || String(notifications.filter((n) => !n.read).length), 10);
  const navigate = useNavigate();

  /* ---------------- Toggle Sidebar ---------------- */
  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  /* ---------------- Toggle Notifications ---------------- */
  const toggleNotifications = () => {
    const newState = !showNotifications;
    setShowNotifications(newState);

    // If opening the popup, request server to mark all as read (bulk) then refresh
    if (newState) {
      (async () => {
        try {
          await api.patch('/notifications/mark-read', {});
        } catch (err) {
          console.warn('Failed to bulk-mark notifications read on server', err);
        }

        try {
          const res = await api.get('/notifications');
          const serverNotes = res.data?.data || [];
          setNotifications(serverNotes);
          localStorage.setItem(storageKey, JSON.stringify(serverNotes));
          // also update unread count stored by poller; if unavailable, derive
          const derived = serverNotes.filter((n) => !n.read).length;
          localStorage.setItem(`${storageKey}:unreadCount`, String(derived));
          window.dispatchEvent(new Event(`${storageKey}Updated`));
          window.dispatchEvent(new Event(`${storageKey}CountUpdated`));
        } catch (err) {
          // fallback: mark locally
          const updated = notifications.map((n) => ({ ...n, read: true }));
          setNotifications(updated);
          localStorage.setItem(storageKey, JSON.stringify(updated));
          localStorage.setItem(`${storageKey}:unreadCount`, '0');
          window.dispatchEvent(new Event(`${storageKey}Updated`));
          window.dispatchEvent(new Event(`${storageKey}CountUpdated`));
        }
      })();
    }
  };

  const handleDismiss = (id) => {
    const c = window.confirm("Dismiss this notification?");
    if (!c) return;
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleOpen = async (note) => {
    try {
      // mark as read on the server
      await api.patch(`/notifications/${note.id}/read`);
    } catch (err) {
      console.warn('Failed to mark notification read on server', err);
    }

    // re-fetch notifications from server (poller will also update soon)
    try {
      const res = await api.get('/notifications');
      const serverNotes = res.data?.data || [];
      setNotifications(serverNotes);
      localStorage.setItem(storageKey, JSON.stringify(serverNotes));
      window.dispatchEvent(new Event(`${storageKey}Updated`));
    } catch (err) {
      // fallback: mark locally
      const updated = notifications.map((n) => (n.id === note.id ? { ...n, read: true } : n));
      setNotifications(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    // Show an on-screen modal with notification details instead of navigating
    setActiveNote(note);
    setShowNotifModal(true);
    // close the sidebar popup so the modal appears centered on the page
    setShowNotifications(false);
  };

  const closeNotifModal = () => {
    setShowNotifModal(false);
    setActiveNote(null);
  };

  const goToEventFromNotif = (note) => {
    const eventId = note.data?.eventId;
    if (eventId) {
      if (role === 'ADMIN') navigate(`/admin/details/${eventId}`);
      else if (role === 'ORGANIZER') navigate(`/organizer/event/${eventId}`);
      else navigate(`/attendee/view-event/${eventId}`);
      setShowNotifications(false);
      closeNotifModal();
    }
  };

  return (
    <>
      {/* ----------- Mobile Hamburger ----------- */}
      <button
        className={`mobile-toggle ${isMobileOpen ? "open" : ""}`}
        onClick={toggleMobile}
      >
        <span className="hamburger"></span>
      </button>

      {/* ----------- Sidebar (Animated with Framer Motion) ----------- */}
      <motion.aside
        className="modern-sidebar"
        initial={{ x: "-100%" }}
        animate={{ x: isMobileOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 90 }}
      >
        <nav className="menu">
          {/* Role Header */}
          <div className="menu-role-header">
            {role === "ATTENDEE" && "Attendee Dashboard"}
            {role === "ORGANIZER" && "Organizer Dashboard"}
            {role === "ADMIN" && "Admin Dashboard"}
          </div>

          {/* Sidebar Groups */}
          {links.map((group, gIndex) => (
            <div key={gIndex} className="menu-group">
              <div className="menu-group-title">{group.category}</div>

              {group.items.map((link, index) => {
                const Icon = link.icon;
                const rootPaths = ["/organizer", "/attendee", "/admin"]; 
                return (
                  <NavLink
                    key={index}
                    to={link.path}
                    end={rootPaths.includes(link.path)}
                    className={({ isActive }) =>
                      `menu-item sidebar-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon size={20} />
                    <span className="text">{link.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Notifications */}
          <div
            className={`menu-item notification ${
              unreadCount > 0 ? "notif-glow" : ""
            }`}
            onClick={toggleNotifications}
            ref={popupRef}
          >
            <Bell size={20} />
            <span>Notifications</span>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}

            {showNotifications && (
              <div className="notification-popup">
                {notifications.length > 0 ? (
                  <ul className="notif-list">
                    {notifications.map((note) => (
                      <li
                        key={note.id}
                        className={`notif-item ${note.read ? 'read' : 'unread'}`}
                        onClick={() => handleOpen(note)}
                      >
                        <div className="notif-left">
                          <div className="notif-type">{note.type.replace(/_/g, ' ')}</div>
                          <div className="notif-message">{note.message}</div>
                        </div>
                        <div className="notif-right">
                          <small className="notif-time">{new Date(note.createdAt).toLocaleString()}</small>
                          <button className="notif-dismiss" onClick={(e) => { e.stopPropagation(); handleDismiss(note.id); }}>×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No new notifications</p>
                )}
              </div>
            )}
          </div>
        </nav>
      </motion.aside>

      {/* ----------- Overlay (close sidebar & popup) ----------- */}
      {(isMobileOpen || showNotifications) && (
        <div
          className="sidebar-overlay"
          onClick={() => {
            setIsMobileOpen(false);
            setShowNotifications(false);
          }}
        />
      )}
      {/* Notification modal shown on top of screen when a notification is clicked */}
      {showNotifModal && activeNote && (
        <NotificationModal note={activeNote} onClose={closeNotifModal} onOpenEvent={goToEventFromNotif} />
      )}
    </>
  );
};

export default ModernSidebar;
