// EventDetailsModify.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Trash2 } from "lucide-react";
import "../../styles/pages/_eventdetails.scss";

const EventDetailsModify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchEventById = useCallback(async (eventId) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`http://localhost:3000/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvent(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not find the event.");
    }
  }, []);

  useEffect(() => {
    const loadEventData = async () => {
      setLoading(true);
      setError(null);
      const passedEvent = location.state?.eventData;
      if (passedEvent) {
        setEvent(passedEvent);
        setLoading(false);
        return;
      }
      await fetchEventById(id);
      setLoading(false);
    };
    loadEventData();
  }, [id, location.state, fetchEventById]);

  const handleModify = () => navigate(`/organizer/modify-event/${id}`, { state: { eventData: event } });

  const handleCancelEvent = async () => {
    if (!window.confirm("Are you sure?")) return;
    setIsCancelling(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`http://localhost:3000/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Event cancelled!");
      navigate("/organizer/events");
    } catch (err) {
      alert(err.response?.data?.message || "Error cancelling event.");
      setIsCancelling(false);
    }
  };

  const formatDate = (isoDate) => isoDate ? new Date(isoDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "N/A";
  const formatTime = (isoDate) => isoDate ? new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!event) return <p>Event not found.</p>;

  return (
    <div className="event-details-page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate("/organizer/events")}>← Back</button>
        <h2>Event Details</h2>
        {event.status === "DRAFT" && (
          <button className="cancel-btn" onClick={handleCancelEvent} disabled={isCancelling}>
            <Trash2 size={18} /> {isCancelling ? "Cancelling..." : "Cancel Event"}
          </button>
        )}
      </div>

      <div className="banner">
        <img src={"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"} alt={event.name} />
        <div className="banner-overlay">
          <h1>{event.name}</h1>
          <p className={`status-badge ${event.status ? event.status.toLowerCase() : ""}`}>{event.status}</p>
        </div>
      </div>

      <div className="details-container">
        <div className="event-section">
          <h3>Event Information</h3>
          <p><strong>Description:</strong> {event.description || "No description provided."}</p>
          <p><strong>Purpose:</strong> {event.purposeOfFunction || "Not specified."}</p>
          <p><strong>Expected Guests:</strong> {event.expectedAttend || 0}</p>

          <hr />

          <h3>Venue Details</h3>
          <p><strong>Venue:</strong> {event.venue?.name || "N/A"}</p>
          <p><strong>Location:</strong> {event.venue?.location || "N/A"}</p>

          <hr />

          <h3>Schedule</h3>
          <p><strong>Start:</strong> {formatDate(event.startDateTime)} at {formatTime(event.startDateTime)}</p>
          <p><strong>End:</strong> {formatDate(event.endDateTime)} at {formatTime(event.endDateTime)}</p>

          {/* --- SERVICES & RESOURCES --- */}
             {event.requestedResourcesAndServices && Object.keys(event.requestedResourcesAndServices).length > 0 && (
              <>
                <hr />
                <h3>Services & Resources</h3>
                <ul className="services-resources-list">
                  {Object.entries(event.requestedResourcesAndServices).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
                    </li>
                  ))}
                </ul>
              </>
            )}
        </div>
      </div>

      <div className="actions">
        {event.status === "DRAFT" ? (
          <button className="modify-btn" onClick={handleModify}>Modify Details</button>
        ) : (
          <p>This event is not in DRAFT status and cannot be modified.</p>
        )}
      </div>
    </div>
  );
};

export default EventDetailsModify;
