// src/pages/ConfirmEventDetails.jsx
import React, { useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import "../../styles/pages/_confirmevent.scss"; // Ensure this path is correct
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export default function ConfirmEventDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  // Receive the complete formData from the CreateEvent page
  const { formData, selectedVenue, termsAccepted, themeImage } = location.state || {};

  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef(null);

  // --- HELPERS ---
  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 5000);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return { date: "Not set", time: "" };
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  // --- SUBMISSION ---
  const handleSubmit = async () => {
    if (!termsAccepted) {
      showToastMessage("You must accept the terms before submitting.");
      return;
    }
    if (!selectedVenue || !formData.venueId) {
      showToastMessage("A venue must be selected before submitting.");
      return;
    }
    setLoading(true);
    try {
      let themeId = null;
      if (themeImage) {
          const base64Image = themeImage.split(',')[1];
          const imageType = themeImage.split(';')[0].split('/')[1];
          const themeResponse = await fetch('http://localhost:3000/themes/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
              },
              body: JSON.stringify({
                  name: `Theme for ${formData.name}`,
                  description: `Theme for event: ${formData.name}`,
                  image: base64Image,
                  filename: `theme-${Date.now()}.${imageType}`
              })
          });
          if (!themeResponse.ok) {
              throw new Error(`HTTP error! status: ${themeResponse.status}`);
          }
          const themeResult = await themeResponse.json();
          themeId = themeResult.id || themeResult.data?.id;
          if (!themeId) {
              throw new Error('Failed to get theme ID from response');
          }
      }

      // ✅ MERGE eventContext INTO services
      // const baseServices = formData.services || {};
      // const enhancedServices = {
      //   ...baseServices,
      //   "Type of Function": formData.eventContext?.eventTypes || [],
      //   "Type of Guest": formData.eventContext?.guestTypes || [],
      // };

      const submissionData = {
        name: formData.name,
        description: formData.description,
        expectedAttend: formData.expectedAttend,
        venueId: formData.venueId,
        organizerId: formData.organizerId,
        purposeOfFunction: formData.purposeOfFunction,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        isFree: formData.isFree,
        ticketRequired: formData.ticketRequired,
        autoDistribute: formData.autoDistribute,
        resources: formData.resources || [],
        services: formData.services || {}, // ✅ Already has boolean flags
        themeId: themeId ?? null,
        status: formData.status ?? "DRAFT",
      };

      console.log("DEBUG: Submitting formData to backend:", submissionData);

      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        "http://localhost:3000/events",
        submissionData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Event submitted successfully:", response.data);
      showToastMessage("Event booking request submitted successfully!");
      setTimeout(() => navigate("/organizer/events"), 2000);
    } catch (error) {
      console.error("Error submitting event:", error);
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
      showToastMessage(`Failed to submit event: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER LOGIC ---
  if (!formData || !selectedVenue) {
    return (
      <div className="confirm-event-page">
         <div className="confirm-event-container">
            <div className="confirm-event-header">
                <button className="back-button" onClick={() => navigate('/organizer/create-event')}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Error</h1>
            </div>
            <p style={{textAlign: 'center', marginTop: '20px'}}>
                No event data found. Please <a href="/organizer/create-event">create an event</a> first.
            </p>
        </div>
      </div>
    );
  }

  const start = formatDateTime(formData.startDateTime);
  const end = formatDateTime(formData.endDateTime);
  const resourceList = formData.resources || [];
  const baseServiceList = formData.services || {};
  const eventContext = formData.eventContext || {};

  return (
    <div className="confirm-event-page">
      <div className="confirm-event-container">
        <div className="confirm-event-header">
          <button className="back-button" onClick={() => window.history.back()}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="page-title">Confirm Event Details</h1>
        </div>
        <div className="confirm-event-card">
          <div className="confirm-event-content">
            <section className="confirm-section">
              <h2>Event Details</h2>
              <p><strong>Title:</strong> {formData.name}</p>
              <p><strong>Description:</strong> {formData.description || "No description provided"}</p>
              <p><strong>Purpose:</strong> {formData.purposeOfFunction || "Not specified"}</p>
              <p><strong>Expected Guests:</strong> {formData.expectedAttend}</p>
              <p><strong>Starts:</strong> {start.date} at {start.time}</p>
              <p><strong>Ends:</strong> {end.date} at {end.time}</p>
            </section>
            <section className="confirm-section">
              <h2>Selected Venue</h2>
              <p><strong>Name:</strong> {selectedVenue.name}</p>
              <p><strong>Location:</strong> {selectedVenue.location}</p>
              <p><strong>Type:</strong> {selectedVenue.type}</p>
              <p><strong>Capacity:</strong> {selectedVenue.capacity}</p>
            </section>

            {/* Event Context */}
            {(eventContext.eventTypes?.length > 0 || eventContext.guestTypes?.length > 0) && (
              <section className="confirm-section">
                <h2>Event Context</h2>
                {eventContext.eventTypes?.length > 0 && (
                  <p><strong>Type of Function:</strong> {eventContext.eventTypes.join(', ')}</p>
                )}
                {eventContext.guestTypes?.length > 0 && (
                  <p><strong>Type of Guest:</strong> {eventContext.guestTypes.join(', ')}</p>
                )}
              </section>
            )}

            {/* Resources and Services (excluding the new context fields) */}
            {(resourceList.length > 0 || Object.keys(baseServiceList).length > 0) && (
              <section className="confirm-section">
                <h2>Requested Resources & Services</h2>
                {resourceList.length > 0 && (
                  <div>
                    <p><strong>Resources:</strong></p>
                    <ul>
                      {resourceList.map((res, index) => (
                        <li key={index}>{res.name}: {res.quantity}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Object.keys(baseServiceList).length > 0 && (
                  <div>
                    <p><strong>Services:</strong></p>
                    <ul>
                      {Object.entries(baseServiceList).map(([name, enabled]) => (
                        <li key={name}>{name}: {enabled ? 'Yes' : 'No'}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {themeImage && (
              <section className="confirm-section">
                <h2>Theme Image</h2>
                <p><strong>Status:</strong> Will be uploaded and a new theme created.</p>
                <div className="preview-image">
                  <p>Preview:</p>
                  <img src={themeImage} alt="Theme Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                </div>
              </section>
            )}

            <div className="submit-button-container">
              <button className="btn-submit" type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Confirm & Submit Request"}
              </button>
            </div>
          </div>
        </div>
        {showToast && (
          <div className="bottom-toast" role="status" aria-live="polite">
            <div className="bottom-toast-inner">
              <span className="toast-message">{toastMessage}</span>
              <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setShowToast(false)}>×</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}