// src/pages/AttendeeDashBoard/Events.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaBell, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "../../styles/pages/_events.scss";

// Filter configuration
const eventFilters = [
  { label: "All", key: "all" },
  { label: "Upcoming", key: "PUBLISHED" },
  { label: "Ongoing", key: "ONGOING" },
  { label: "Attended", key: "COMPLETED" },
  { label: "Missed", key: "CANCELLED" },
];

// Helper to map backend status to a more user-friendly frontend status
const getFrontendStatus = (eventStatus, registrationStatus) => {
  if (registrationStatus === "PENDING") return "Pending Approval";
  switch (eventStatus) {
    case "PUBLISHED": return "Upcoming";
    case "ONGOING": return "Ongoing";
    case "COMPLETED": return "Attended";
    case "CANCELLED": return "Cancelled";
    case "DRAFT": return "Draft";
    default: return "Unknown";
  }
};

// Event Card Component
const EventCard = ({ event, navigate, onRateEvent, onViewTicket, isMobile }) => (
  <div
    key={event.id}
    className="event-row"
    onClick={() =>
      navigate(`/attendee/view-event/${event.id}`, {
        state: { eventData: event.fullEventData },
      })
    }
    role="button"
    tabIndex={0}
    onKeyPress={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        navigate(`/attendee/view-event/${event.id}`, {
          state: { eventData: event.fullEventData },
        });
      }
    }}
    aria-label={`View details for ${event.title}`}
  >
    <div className="event-left">
      <FaCalendarAlt size={isMobile ? 24 : 26} color="#3627d7ff" aria-hidden="true" />
    </div>
    <div className="event-info">
      <h4>{isMobile && event.title.length > 30 ? `${event.title.substring(0, 30)}...` : event.title}</h4>
      <p className="event-date">{event.date}</p>
      <p className="event-status">{event.status}</p>
    </div>
    <div className="event-right">
      {(event.status === "Upcoming" || event.status === "Ongoing") && event.ticket && (
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onViewTicket(event.ticket);
          }}
          aria-label={`View ticket for ${event.title}`}
          type="button"
        >
          {isMobile ? "Ticket" : "View Ticket"}
        </button>
      )}
      {event.status === "Attended" && (
        <button
          className="action-btn gray"
          onClick={(e) => {
            e.stopPropagation();
            onRateEvent(event.fullEventData);
          }}
          aria-label={`Rate event ${event.title}`}
          type="button"
        >
          {isMobile ? "Rate" : "Rate Event"}
        </button>
      )}
    </div>
  </div>
);

// Notification Dropdown Component
const NotificationDropdown = ({ notifications, onClose, isMobile }) => (
  <div className={`notification-dropdown ${isMobile ? 'mobile' : ''}`}>
    <div className="notification-header">
      <h4>Notifications</h4>
      <button
        onClick={onClose}
        aria-label="Close notifications"
        type="button"
      >
        <FaTimesCircle color="#999" aria-hidden="true" />
      </button>
    </div>
    {notifications.length === 0 ? (
      <p className="empty-text">No new notifications</p>
    ) : (
      <div className="notification-list">
        {notifications.map((item) => (
          <div key={item.id} className="notification-item">
            <FaInfoCircle size={isMobile ? 16 : 18} color="#2623d3ff" className="notification-icon" aria-hidden="true" />
            <div className="notification-content">
              <h5>{isMobile && item.title.length > 40 ? `${item.title.substring(0, 40)}...` : item.title}</h5>
              <p>{isMobile && item.message.length > 60 ? `${item.message.substring(0, 60)}...` : item.message}</p>
              <span>{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 481);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch events, registrations, and tickets
  useEffect(() => {
    const fetchAttendeeData = async () => {
      setLoadingEvents(true);
      if (!user?.id) {
        toast.error("User not logged in.", { id: 'user-not-logged-in' });
        setLoadingEvents(false);
        return;
      }

      try {
        const [regRes, ticketRes] = await Promise.all([
          api.get("/registrations/my"),  ////
          api.get(`/tickets/me/tickets`),
        ]);

        const regs = Array.isArray(regRes.data) ? regRes.data : [];
        const tickets = Array.isArray(ticketRes.data) ? ticketRes.data : [];

        const processedEvents = regs.map((reg) => {
          const event = reg.event;
          const ticket = tickets.find((t) => t.registrationId === reg.id);
          const status = getFrontendStatus(event.status, reg.status);

          return {
            id: event.id,
            title: event.name,
            date: new Date(event.startDateTime).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            status,
            fullEventData: event,
            registrationId: reg.id,
            ticket,
          };
        });
        setEvents(processedEvents);
        toast.success("Your events loaded successfully!");
      } catch (err) {
        console.error("Error fetching events:", err);
        toast.error("Failed to load your events.", { id: 'fetch-events-error' });
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchAttendeeData();
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoadingNotifications(true);
      if (!user?.id) {
        setLoadingNotifications(false);
        return;
      }
      try {
        const res = await api.get(`/notifications?userId=${user.id}`);
        setNotifications(res.data);
      } catch (err) {
        //console.error("Error fetching notifications:", err);
        //toast.error("Failed to load notifications.", { id: 'fetch-notifications-error' });
      } finally {
        setLoadingNotifications(false);
      }
    };
    fetchNotifications();
  }, [user]);

  // Apply filters to events
  useEffect(() => {
    setFilteredEvents(
      selectedFilter === "all"
        ? events
        : events.filter((event) => event.status === getFrontendStatus(selectedFilter, ''))
    );
  }, [selectedFilter, events]);

  const handleRateEvent = useCallback((eventData) => {
    const ratingKey = `event_rating_${eventData.id}`;
    const existingRating = localStorage.getItem(ratingKey);
    if (existingRating) {
      toast.info("You have already rated this event.");
    } else {
      navigate("/attendee/rate-events", { state: { eventData: eventData } });
    }
  }, [navigate]);

  const handleViewTicket = useCallback((ticketData) => {
    navigate("/attendee/qr-code", { state: { ticketData: ticketData } });
  }, [navigate]);

  const handleFilterChange = useCallback((filterKey) => {
    setSelectedFilter(filterKey);
  }, []);

  const toggleNotifications = useCallback(() => {
    setIsNotificationOpen(prev => !prev);
  }, []);

  // Get shortened filter labels for mobile
  const getFilterLabel = (label, key) => {
    if (!isMobile || key === 'all') return label;

    const shortLabels = {
      'Upcoming': 'Upcom',
      'Ongoing': 'Ongoin',
      'Attended': 'Attend',
      'Missed': 'Missed'
    };

    return shortLabels[label] || label.substring(0, 5);
  };

  return (
    <div className="events-container">
      {isNotificationOpen && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setIsNotificationOpen(false)}
          isMobile={isMobile}
        />
      )}

      <div className="header-row">
        <h1>My Events</h1>
        <button
          className="notification-btn"
          onClick={toggleNotifications}
          aria-label={isNotificationOpen ? "Close notifications" : "Open notifications"}
          type="button"
        >
          <FaBell size={isMobile ? 18 : 20} aria-hidden="true" />
          {notifications.length > 0 && (
            <span className="notification-badge" aria-label={`${notifications.length} unread notifications`}>
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      <div className="filter-bar">
        {eventFilters.map(({ label, key }) => (
          <button
            key={key}
            className={`filter-btn ${selectedFilter === key ? "active" : ""}`}
            onClick={() => handleFilterChange(key)}
            type="button"
            aria-pressed={selectedFilter === key}
          >
            {getFilterLabel(label, key)}
          </button>
        ))}
        {isMobile && <div className="scroll-hint">← scroll →</div>}
      </div>

      <h2 className="section-title">
        {selectedFilter === "all" ? "All Events" : eventFilters.find(f => f.key === selectedFilter)?.label + " Events"}
      </h2>

      <div className="event-list">
        {loadingEvents ? (
          <div className="empty-box loading">Loading your events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-box">
            {selectedFilter === "all"
              ? "You haven't registered for any events yet."
              : `No ${eventFilters.find(f => f.key === selectedFilter)?.label.toLowerCase()} events found.`
            }
          </div>
        ) : (
          filteredEvents.map((item) => (
            <EventCard
              key={item.id}
              event={item}
              navigate={navigate}
              onRateEvent={handleRateEvent}
              onViewTicket={handleViewTicket}
              isMobile={isMobile}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Events;