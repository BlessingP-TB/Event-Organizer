// src/components/ModernSidebar.jsx

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, CircleHelp, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import "../styles/components/_modernSidebar.scss";

const ModernSidebar = ({ role, links, storageKey }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const roleBasePath = role === "ATTENDEE" ? "/attendee" : role === "ORGANIZER" ? "/organizer" : "/admin";

  const helpPath = role === "ATTENDEE" ? "/attendee/help-support" : null;

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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfileImage");
    navigate("/login");
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
          <NavLink
            to={`${roleBasePath}/notifications`}
            className={({ isActive }) =>
              `menu-item sidebar-link notification ${isActive ? "active" : ""} ${
                unreadCount > 0 ? "notif-glow" : ""
              }`
            }
          >
            <Bell size={20} />
            <span>Notifications</span>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </NavLink>

          <div className="menu-bottom">
            {helpPath && (
              <NavLink
                to={helpPath}
                className={({ isActive }) =>
                  `menu-item sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <CircleHelp size={20} />
                <span className="text">Help / Support</span>
              </NavLink>
            )}

            <button className="menu-item logout-item" onClick={() => setShowLogoutModal(true)}>
              <LogOut size={20} />
              <span className="text">Logout</span>
            </button>
          </div>
        </nav>
      </motion.aside>

      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm logout">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="logout-modal-actions">
              <button type="button" className="logout-cancel-btn" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="logout-confirm-btn"
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------- Overlay (close sidebar) ----------- */}
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
