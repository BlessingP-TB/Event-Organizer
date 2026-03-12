// EventDetailsModify.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/api";
import { Send, Trash2 } from "lucide-react";
import "../../styles/pages/_eventdetails.scss";

const bytesToDataUrl = (bytes, mimeType = "image/jpeg") => {
  if (!bytes) return null;
  const byteArray = Array.isArray(bytes) ? bytes : Object.values(bytes);
  try {
    const uint8Array = new Uint8Array(byteArray);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < uint8Array.length; index += chunkSize) {
      const chunk = uint8Array.subarray(index, index + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
};

const parseApprovalNotes = (notes) => {
  if (typeof notes !== "string") return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
};

const getPendingRescheduleApproval = (event) => {
  if (!Array.isArray(event?.approvals)) return null;

  return event.approvals.find(
    (approval) => approval.targetType === "EventReschedule" && approval.status === "PENDING"
  ) || null;
};

const getRequestedRescheduleValue = (payload, legacyKey, compactKey) => {
  if (!payload || typeof payload !== "object") return null;
  return payload[legacyKey] ?? payload[compactKey] ?? null;
};

const EventDetailsModify = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);

  const fetchEventById = useCallback(async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}`);
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
      if (passedEvent && String(passedEvent.id) === String(id)) {
        setEvent(passedEvent);
        setLoading(false);
        return;
      }

      try {
        await fetchEventById(id);
      } finally {
        setLoading(false);
      }
    };
    loadEventData();
  }, [id, location.state, fetchEventById]);

  const handleModify = () => navigate(`/organizer/modify-event/${id}`, { state: { eventData: event } });

  const handleCancelEvent = async () => {
    if (!window.confirm("Are you sure?")) return;
    setIsCancelling(true);
    try {
      await api.delete(`/events/${id}`);
      window.dispatchEvent(new Event("organizerEventsUpdated"));
      alert("Event cancelled!");
      navigate("/organizer/events");
    } catch (err) {
      alert(err.response?.data?.message || "Error cancelling event.");
      setIsCancelling(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!window.confirm("Submit this draft for admin approval?")) return;

    setIsSubmittingDraft(true);
    try {
      await api.post(`/events/${id}/submit`);
      alert("Draft submitted for admin approval.");
      await fetchEventById(id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit draft.");
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  const formatDate = (isoDate) => isoDate ? new Date(isoDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "N/A";
  const formatTime = (isoDate) => isoDate ? new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";
  const bannerImage =
    bytesToDataUrl(event?.Theme?.image, "image/jpeg") ||
    event?.Theme?.imageUrl ||
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80";

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!event) return <p>Event not found.</p>;

  const pendingRescheduleApproval = getPendingRescheduleApproval(event);
  const pendingReschedulePayload = parseApprovalNotes(pendingRescheduleApproval?.notes);
  const effectiveStartDateTime =
    getRequestedRescheduleValue(pendingReschedulePayload, "requestedStartDateTime", "s") ||
    event.startDateTime;
  const effectiveEndDateTime =
    getRequestedRescheduleValue(pendingReschedulePayload, "requestedEndDateTime", "e") ||
    event.endDateTime;

  return (
    <div className="event-details-page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate("/organizer/events")}>← Back</button>
        <h2>Event Details</h2>
      </div>

      <div className="banner">
        <img src={bannerImage} alt={event.name} />
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
          {pendingRescheduleApproval && (
            <p>
              <strong>Pending Reschedule:</strong> Showing the requested schedule while approval is pending.
            </p>
          )}
          <p><strong>Start:</strong> {formatDate(effectiveStartDateTime)} at {formatTime(effectiveStartDateTime)}</p>
          <p><strong>End:</strong> {formatDate(effectiveEndDateTime)} at {formatTime(effectiveEndDateTime)}</p>

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
        {["DRAFT", "PENDING"].includes(event.status) ? (
          <div className="action-buttons">
            <button className="modify-btn" onClick={handleModify}>Modify Details</button>
            {event.status === "DRAFT" && (
              <>
                <button className="submit-draft-btn" onClick={handleSubmitDraft} disabled={isSubmittingDraft}>
                  <Send size={16} /> {isSubmittingDraft ? "Submitting..." : "Submit Draft"}
                </button>
                <button className="cancel-event-btn" onClick={handleCancelEvent} disabled={isCancelling}>
                  <Trash2 size={16} /> {isCancelling ? "Cancelling..." : "Cancel Event"}
                </button>
              </>
            )}
          </div>
        ) : (
          <p>This event cannot be modified in its current status.</p>
        )}
      </div>
    </div>
  );
};

export default EventDetailsModify;
