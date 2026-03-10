// src/components/ModernSidebar.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import api from "../utils/api";
import "../styles/components/_modernSidebar.scss";

const ORGANIZER_EVENT_NOTE_PREFIX = "organizer-event";

const safeParseArray = (rawValue) => {
  try {
    const parsed = JSON.parse(rawValue || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toTimestamp = (value) => {
  const ms = new Date(value || "").getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const ModernSidebar = ({ role, links, storageKey }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const popupRef = useRef(null);
  const dismissedOrganizerNoteIdsKey = `${storageKey}:dismissed`;

  const readStoredNotifications = useCallback(() => {
    return safeParseArray(localStorage.getItem(storageKey));
  }, [storageKey]);

  const readDismissedOrganizerNoteIds = useCallback(() => {
    return new Set(safeParseArray(localStorage.getItem(dismissedOrganizerNoteIdsKey)));
  }, [dismissedOrganizerNoteIdsKey]);

  const persistNotifications = useCallback(
    (nextNotifications) => {
      setNotifications(nextNotifications);
      localStorage.setItem(storageKey, JSON.stringify(nextNotifications));
    },
    [storageKey]
  );

  const buildOrganizerNotificationsFromEvents = useCallback((events) => {
    return events.flatMap((event) => {
      const latestApproval =
        Array.isArray(event.approvals) && event.approvals.length > 0
          ? event.approvals[0]
          : null;
      const latestApprovalStatus = latestApproval?.status;
      const eventName = event?.name || "Untitled Event";
      const baseTimestamp =
        latestApproval?.updatedAt ||
        latestApproval?.createdAt ||
        event?.updatedAt ||
        event?.createdAt ||
        new Date().toISOString();

      if (event.status === "CANCELLED") {
        return [
          {
            id: `${ORGANIZER_EVENT_NOTE_PREFIX}-${event.id}-cancelled`,
            title: "Event Cancelled",
            message: `Your event "${eventName}" has been cancelled.`,
            timestamp: baseTimestamp,
            read: false,
          },
        ];
      }

      if (event.status === "DRAFT" && latestApprovalStatus === "PENDING") {
        return [
          {
            id: `${ORGANIZER_EVENT_NOTE_PREFIX}-${event.id}-pending`,
            title: "Waiting For Approval",
            message: `Your event "${eventName}" is waiting for admin approval.`,
            timestamp: baseTimestamp,
            read: false,
          },
        ];
      }

      if (
        latestApprovalStatus === "APPROVED" ||
        event.status === "PUBLISHED" ||
        event.status === "ONGOING" ||
        event.status === "COMPLETED"
      ) {
        return [
          {
            id: `${ORGANIZER_EVENT_NOTE_PREFIX}-${event.id}-approved`,
            title: "Event Approved",
            message: `Your event "${eventName}" has been approved by admin.`,
            timestamp: baseTimestamp,
            read: false,
          },
        ];
      }

      return [];
    });
  }, []);

  const syncOrganizerNotifications = useCallback(async () => {
    if (role !== "ORGANIZER") return;

    try {
      const allOrganizerEvents = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await api.get("/events/organizer", {
          params: { page, pageSize: 100 },
        });

        const pageEvents = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        allOrganizerEvents.push(...pageEvents);
        hasNextPage = Boolean(response.data?.meta?.hasNextPage);
        page += 1;

        if (pageEvents.length === 0) break;
      }

      const existingNotifications = readStoredNotifications();
      const dismissedOrganizerIds = readDismissedOrganizerNoteIds();
      const generatedOrganizerNotifications = buildOrganizerNotificationsFromEvents(
        allOrganizerEvents
      ).filter((note) => !dismissedOrganizerIds.has(note.id));

      const existingById = new Map(
        existingNotifications.map((note) => [String(note.id), note])
      );

      const organizerNotificationsWithReadState = generatedOrganizerNotifications.map(
        (note) => {
          const existingNote = existingById.get(String(note.id));
          return existingNote ? { ...note, read: Boolean(existingNote.read) } : note;
        }
      );

      const nonOrganizerGeneratedNotifications = existingNotifications.filter(
        (note) =>
          !(
            typeof note?.id === "string" &&
            note.id.startsWith(`${ORGANIZER_EVENT_NOTE_PREFIX}-`)
          )
      );

      const mergedNotifications = [
        ...organizerNotificationsWithReadState,
        ...nonOrganizerGeneratedNotifications,
      ].sort((a, b) => toTimestamp(b.timestamp) - toTimestamp(a.timestamp));

      persistNotifications(mergedNotifications);
      window.dispatchEvent(new Event(`${storageKey}Updated`));
    } catch (error) {
      console.error("Failed to sync organizer notifications:", error);
    }
  }, [
    role,
    buildOrganizerNotificationsFromEvents,
    persistNotifications,
    readDismissedOrganizerNoteIds,
    readStoredNotifications,
    storageKey,
  ]);

  /* ---------------- Load Notifications ---------------- */
  useEffect(() => {
    const stored = readStoredNotifications();
    setNotifications(stored);

    const handleUpdate = () => {
      const updated = readStoredNotifications();
      setNotifications(updated);
    };

    window.addEventListener(`${storageKey}Updated`, handleUpdate);
    return () => window.removeEventListener(`${storageKey}Updated`, handleUpdate);
  }, [readStoredNotifications, storageKey]);

  useEffect(() => {
    if (role !== "ORGANIZER") return;

    const refreshNotifications = () => {
      void syncOrganizerNotifications();
    };

    refreshNotifications();

    const refreshIntervalId = window.setInterval(refreshNotifications, 60000);
    window.addEventListener("focus", refreshNotifications);
    window.addEventListener("organizerEventsUpdated", refreshNotifications);

    return () => {
      window.clearInterval(refreshIntervalId);
      window.removeEventListener("focus", refreshNotifications);
      window.removeEventListener("organizerEventsUpdated", refreshNotifications);
    };
  }, [role, syncOrganizerNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ---------------- Toggle Sidebar ---------------- */
  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  /* ---------------- Toggle Notifications ---------------- */
  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);

    // Auto-mark all notifications as read
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(updated);
    window.dispatchEvent(new Event(`${storageKey}Updated`));
  };

  const handleDismiss = (id) => {
    const c = window.confirm("Dismiss this notification?");
    if (!c) return;

    if (
      role === "ORGANIZER" &&
      typeof id === "string" &&
      id.startsWith(`${ORGANIZER_EVENT_NOTE_PREFIX}-`)
    ) {
      const dismissedIds = readDismissedOrganizerNoteIds();
      dismissedIds.add(id);
      localStorage.setItem(
        dismissedOrganizerNoteIdsKey,
        JSON.stringify(Array.from(dismissedIds))
      );
    }

    const updated = notifications.filter((n) => n.id !== id);
    persistNotifications(updated);
    window.dispatchEvent(new Event(`${storageKey}Updated`));
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
