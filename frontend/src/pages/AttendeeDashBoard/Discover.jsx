import React, { useState, useEffect } from "react";
import "../../styles/pages/_discover.scss";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

// Helper: Map backend/registration status → frontend label
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

const Discover = ({ role }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showSharePopup, setShowSharePopup] = useState(null);

  const navigate = useNavigate();

  // Helper: Check if an event is past
  const isPastEvent = (eventDate) => new Date(eventDate) < new Date();

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Add cache control header to the API request
        const response = await api.get('events/public', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        console.log(response.data);
        const apiEvents = response.data.data.map((event) => ({
          id: event.id,
          title: event.name,
          date: event.startDateTime,
          location: event.venue?.location || "TUT Polokwane Campus",
          image: event.Theme?.imageUrl ||
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
          tags: [event.Theme?.name || "Event"],
          backendStatus: event.status,
          registrationStatus: event.registrationStatus ?? null,
          frontendStatus: getFrontendStatus(event.status, event.registrationStatus),
        }));

        setEvents(apiEvents);
        setFilteredEvents(apiEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Define role-based filters
  const statusFilters =
    role === "organiser"
      ? ["All", "Upcoming", "Ongoing"]
      : ["All", "Upcoming", "Ongoing", "Attended"];

  // Filtering logic
  useEffect(() => {
    let filtered = [...events];

    // Filter out past events
    filtered = filtered.filter((event) => !isPastEvent(event.date));

    // Filter by status
    if (selectedStatus !== "All") {
      filtered = filtered.filter(
        (event) => event.frontendStatus === selectedStatus
      );
    }

    // Filter by search
    if (search.trim()) {
      filtered = filtered.filter((event) => {
        const text = search.toLowerCase();
        return (
          event.title.toLowerCase().includes(text) ||
          event.location.toLowerCase().includes(text) ||
          event.tags.some((tag) => tag.toLowerCase().includes(text))
        );
      });
    }

    setFilteredEvents(filtered);
  }, [search, selectedStatus, events]);

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
      // Navigate to the view-only event details page
      navigate(`/organizer/view-event/${event.id}`, { state: { eventData: event } });
    } else {
      // Normal attendee flow — go to registration page
      navigate(`/attendee/register/${event.id}`, { state: { eventData: event } });
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
          {statusFilters.map((status) => (
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