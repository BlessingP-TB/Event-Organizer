// src/components/ModernSidebar.jsx

import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import "../styles/components/_modernSidebar.scss";

const ModernSidebar = ({ role, links, storageKey }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
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

    window.addEventListener(`${storageKey}Updated`, handleUpdate);
    return () => window.removeEventListener(`${storageKey}Updated`, handleUpdate);
  }, [storageKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ---------------- Toggle Sidebar ---------------- */
  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  /* ---------------- Toggle Notifications ---------------- */
  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);

    // Auto-mark all notifications as read
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleDismiss = (id) => {
    const c = window.confirm("Dismiss this notification?");
    if (!c) return;
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
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
                  <ul>
                    {notifications.map((note) => (
                      <li
                        key={note.id}
                        className={note.read ? "read" : "unread"}
                      >
                        <strong>{note.title}</strong>
                        <p>{note.message}</p>
                        <small>{note.timestamp || "Just now"}</small>
                        <button onClick={() => handleDismiss(note.id)}>
                          ×
                        </button>
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
    </>
  );
};

export default ModernSidebar;
