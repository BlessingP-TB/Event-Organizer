import React, { useState, useEffect, useMemo } from "react";
import "../../styles/pages/_discover.scss";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const STATUS_FILTERS = ["All", "Upcoming", "Ongoing", "Attended"];

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Derive user-facing status from date window with backend status fallback.
const getFrontendStatus = (event) => {
  const nowMs = Date.now();
  const start = parseDate(event.startDateTime);
  const end = parseDate(event.endDateTime);

  if (event.status === "CANCELLED") return "Cancelled";
  if (start && nowMs < start.getTime()) return "Upcoming";
  if (start && end && nowMs >= start.getTime() && nowMs <= end.getTime()) {
    return "Ongoing";
  }
  if (end && nowMs > end.getTime()) return "Attended";

  if (event.status === "ONGOING") return "Ongoing";
  if (event.status === "COMPLETED") return "Attended";

  return "Upcoming";
};

const Discover = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showSharePopup, setShowSharePopup] = useState(null);

  const navigate = useNavigate();

  const normalizeEvent = (event) => ({
    id: event.id,
    title: event.name,
    date: event.startDateTime,
    endDate: event.endDateTime,
    location: event.venue?.location || "TUT Polokwane Campus",
    image:
      event.Theme?.imageUrl ||
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    tags: [event.Theme?.name || "Event"],
    backendStatus: event.status,
    frontendStatus: getFrontendStatus(event),
    rawEventData: event,
  });

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const collectedEvents = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
          const response = await api.get("/events/public", {
            params: { page, pageSize: 100 },
            headers: { "Cache-Control": "no-cache" },
          });

          const pageEvents = Array.isArray(response.data?.data)
            ? response.data.data
            : [];

          collectedEvents.push(...pageEvents);

          hasNextPage = Boolean(response.data?.meta?.hasNextPage);
          page += 1;

          if (pageEvents.length === 0) {
            break;
          }
        }

        const normalizedEvents = collectedEvents
          .map(normalizeEvent)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setEvents(normalizedEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setError("Could not load discover events. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return events.filter((event) => {
      if (selectedStatus !== "All" && event.frontendStatus !== selectedStatus) {
        return false;
      }

      if (!searchText) {
        return true;
      }

      return (
        event.title.toLowerCase().includes(searchText) ||
        event.location.toLowerCase().includes(searchText) ||
        event.tags.some((tag) => tag.toLowerCase().includes(searchText))
      );
    });
  }, [events, search, selectedStatus]);

  // Navigation: organisers should only view event details (no registration)
  const handleCardClick = (event) => {


    const rawUser = localStorage.getItem('user');
    let storedUser;
    try {
      storedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch (err) {
      // value is not JSON (maybe a plain string like "organiser")
      storedUser = rawUser;
    }
    const storedRole = storedUser?.role || storedUser?.ROLE || (typeof storedUser === 'string' ? storedUser : null);

    const isOrganiser = storedRole === "ORGANIZER";

    console.log("User role:", storedRole, "Is organiser:", isOrganiser);

    if (isOrganiser) {
      navigate(`/organizer/view-event/${event.id}`, {
        state: { eventData: event.rawEventData },
      });
    } else {
      if (event.frontendStatus === "Attended") {
        navigate(`/attendee/view-event/${event.id}`, {
          state: { eventData: event.rawEventData },
        });
        return;
      }

      navigate(`/attendee/register/${event.id}`, {
        state: { eventData: event.rawEventData },
      });
    }
  };

  // Share popup toggle
  const handleShareClick = (e, id) => {
    e.stopPropagation();
    setShowSharePopup(showSharePopup === id ? null : id);
  };

  const shareLinks = (event) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this event: ${event.title}`);

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${text}`,
      whatsapp: `https://api.whatsapp.com/send?text=${text} ${url}`,
    };
  };

  if (loading) return <div>Loading events...</div>;
  if (error) return <div className="empty-container"><p className="empty-text">{error}</p></div>;

  return (
    <div className="discover-container">
      {/* Header */}
      <div className="discover-header">
        <h1 className="discover-title">Discover Events</h1>
        <input
          type="text"
          className="discover-search"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status Filter Buttons */}
      <div className="categories-container">
        <div className="categories-scroll">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              className={`category-button ${selectedStatus === status ? "active" : ""
                }`}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="events-list">
        {filteredEvents.map((event) => {
          const links = shareLinks(event);

          return (
            <div
              key={event.id}
              className="event-card"
              onClick={() => handleCardClick(event)}
            >
              <img src={event.image} alt={event.title} className="event-image" />
              <div className="event-content">
                <h3 className="event-title">{event.title}</h3>

                <div className="event-meta">
                  <i className="fas fa-calendar"></i>
                  <span>{new Date(event.date).toLocaleString()}</span>
                </div>

                <div className="event-meta">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{event.location}</span>
                </div>

                <div className="event-status-badge">{event.frontendStatus}</div>

                <button
                  className="share-button"
                  onClick={(e) => handleShareClick(e, event.id)}
                >
                  <i className="fas fa-share-alt"></i>
                  <span>Share</span>
                </button>

                {showSharePopup === event.id && (
                  <div
                    className="share-popup"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={links.facebook} target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-facebook"></i>
                    </a>
                    <a href={links.twitter} target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a href={links.linkedin} target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin"></i>
                    </a>
                    <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-whatsapp"></i>
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredEvents.length === 0 && (
        <div className="empty-container">
          <i className="fas fa-search"></i>
          <p className="empty-text">No events found</p>
          <p className="empty-subtext">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default Discover;