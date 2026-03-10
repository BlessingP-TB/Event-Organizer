// src/components/ModernSidebar.jsx

import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import api from "../utils/api";
import "../styles/components/_modernSidebar.scss";

const ModernSidebar = ({ role, links, storageKey }) => {
  const [notifications, setNotifications] = useState([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const popupRef = useRef(null);

  /* ---------------- Load Notifications ---------------- */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setNotifications([]);
      }
    };

    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('notificationsUpdated', handleUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleUpdate);
  }, [storageKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ---------------- Toggle Sidebar ---------------- */
  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  const notificationsPath = `/${role.toLowerCase()}/notifications`;

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

          <NavLink
            to={notificationsPath}
            className={({ isActive }) =>
              `menu-item notification sidebar-link ${isActive ? "active" : ""} ${
                unreadCount > 0 ? "notif-glow" : ""
              }`
            }
            ref={popupRef}
          >
            <Bell size={20} />
            <span>Notifications</span>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </NavLink>
        </nav>
      </motion.aside>

      {/* ----------- Overlay (close sidebar & popup) ----------- */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => {
            setIsMobileOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ModernSidebar;
