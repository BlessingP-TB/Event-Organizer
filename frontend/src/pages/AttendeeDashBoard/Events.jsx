// src/pages/AttendeeDashBoard/Events.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaBell } from "react-icons/fa";
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

// Helper to map backend status to a more user-friendly frontend status using sysdate
const getFrontendStatus = (event, registrationStatus) => {
  // Support both (event, regStatus) and legacy (eventStatus string, regStatus)
  const eventObj = typeof event === 'object' && event !== null ? event : null;
  const eventStatus = eventObj ? eventObj.status : event;

  if (registrationStatus === "PENDING") return "Pending Approval";

  // Use real dates to determine Missed/Ongoing/Upcoming
  if (eventObj) {
    const now = Date.now();
    const end = eventObj.endDateTime ? new Date(eventObj.endDateTime).getTime() : null;
    const start = eventObj.startDateTime ? new Date(eventObj.startDateTime).getTime() : null;

    if (eventStatus === "CANCELLED") return "Missed";
    if (end && now > end) return "Missed";
    if (start && end && now >= start && now <= end) return "Ongoing";
    if (start && now < start) return "Upcoming";
  }

  switch (eventStatus) {
    case "PUBLISHED": return "Upcoming";
    case "ONGOING": return "Ongoing";
    case "COMPLETED": return "Attended";
    case "CANCELLED": return "Missed";
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

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [passedPublicEvents, setPassedPublicEvents] = useState([]);
  const [missedUnregisteredEvents, setMissedUnregisteredEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
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
          const status = getFrontendStatus(event, reg.status);

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

  useEffect(() => {
    const fetchAvailableEvents = async () => {
      try {
        const response = await api.get('/events/public?page=1&pageSize=100');
        const items = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        const now = new Date();
        setAvailableEvents(
          items.filter((event) => {
            const end = event.endDateTime ? new Date(event.endDateTime) : null;
            if (end && now > end) return false;
            return true;
          })
        );
        setPassedPublicEvents(
          items.filter((event) => {
            const end = event.endDateTime ? new Date(event.endDateTime) : null;
            return end && now > end;
          })
        );
      } catch (err) {
        console.error('Failed to fetch available events:', err);
        setAvailableEvents([]);
      }
    };

    fetchAvailableEvents();
  }, []);

  // Derive unregistered missed events: public events that passed but user never registered for
  useEffect(() => {
    const registeredIds = new Set(events.map((e) => e.id));
    setMissedUnregisteredEvents(passedPublicEvents.filter((e) => !registeredIds.has(e.id)));
  }, [passedPublicEvents, events]);

  // Load notifications from shared admin feed.
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
        setNotifications(Array.isArray(stored) ? stored : []);
      } catch {
        setNotifications([]);
      }
    };

    const handleNotificationsUpdated = () => loadNotifications();

    loadNotifications();
    window.addEventListener('adminNotificationsUpdated', handleNotificationsUpdated);

    return () => {
      window.removeEventListener('adminNotificationsUpdated', handleNotificationsUpdated);
    };
  }, [user]);

  // Apply filters to events
  useEffect(() => {
    const filterKeyToStatus = {
      PUBLISHED: 'Upcoming',
      ONGOING: 'Ongoing',
      COMPLETED: 'Attended',
      CANCELLED: 'Missed',
    };
    setFilteredEvents(
      selectedFilter === 'all'
        ? events
        : events.filter((event) => event.status === (filterKeyToStatus[selectedFilter] || selectedFilter))
    );
  }, [selectedFilter, events]);

  const handleRateEvent = useCallback((eventData) => {
    const ratingKey = `event_rating_${eventData.id}`;
    const existingRating = localStorage.getItem(ratingKey);
    if (existingRating) {
      toast.info("You have already rated this event.");
    } else {
      navigate("/attendee/ratings", { state: { eventData: eventData } });
    }
  }, [navigate]);

  const handleViewTicket = useCallback((ticketData) => {
    navigate("/attendee/qr-code", { state: { ticketData: ticketData } });
  }, [navigate]);

  const handleFilterChange = useCallback((filterKey) => {
    setSelectedFilter(filterKey);
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
      <div className="header-row">
        <h1>My Events</h1>
        <button
          className="notification-btn"
          onClick={() => navigate("/attendee/notifications")}
          aria-label="Open notifications page"
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

        {selectedFilter === "CANCELLED" && missedUnregisteredEvents.length > 0 && (
          <div style={{ marginTop: filteredEvents.length > 0 ? '1rem' : 0 }}>
            {filteredEvents.length > 0 && (
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Events you missed without registering</p>
            )}
            {missedUnregisteredEvents.map((event) => (
              <div
                key={`unregistered-${event.id}`}
                className="event-row"
                style={{ opacity: 0.85, cursor: 'default' }}
                role="listitem"
              >
                <div className="event-left">
                  <FaCalendarAlt size={isMobile ? 24 : 26} color="#b45309" aria-hidden="true" />
                </div>
                <div className="event-info">
                  <h4>{isMobile && event.name.length > 30 ? `${event.name.substring(0, 30)}...` : event.name}</h4>
                  <p className="event-date">{new Date(event.startDateTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="event-status" style={{ color: '#b45309' }}>Missed · Not Registered</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section style={{ marginTop: '1.2rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, color: '#1f2937' }}>Available Events</h3>
          <button
            type="button"
            onClick={() => navigate('/attendee/discover')}
            style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
          >
            View all
          </button>
        </div>

        {availableEvents.length === 0 ? (
          <p style={{ margin: 0, color: '#6b7280' }}>No approved events available yet.</p>
        ) : (
          <div>
            {availableEvents.slice(0, 5).map((event) => {
              const isPassed = event.endDateTime ? new Date(event.endDateTime) < new Date() : false;
              return (
                <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderTop: '1px solid #f3f4f6' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{event.name}</p>
                    <small style={{ color: '#6b7280' }}>{new Date(event.startDateTime).toLocaleString()}</small>
                    {isPassed && <small style={{ display: 'block', color: '#b45309', fontWeight: 600 }}>Event Passed</small>}
                  </div>
                  {isPassed ? (
                    <span style={{ border: '1px solid #d97706', background: '#fff8e1', color: '#b45309', borderRadius: '8px', padding: '0.35rem 0.55rem', fontSize: '0.8rem', fontWeight: 600 }}>Passed</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/attendee/register/${event.id}`, { state: { eventData: event } })}
                      style={{ border: '1px solid #0284c7', background: '#eff8ff', color: '#0369a1', borderRadius: '8px', padding: '0.35rem 0.55rem', cursor: 'pointer' }}
                    >
                      Register
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Events;