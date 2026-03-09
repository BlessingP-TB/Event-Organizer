// src/pages/CheckInScreen.jsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast'; // Import toast
import api from '../../utils/api'; // Import the centralized API utility
import '../../styles/pages/_checkinscreen.scss'; // Assuming you create this SCSS file

// Helper to generate QR URL
const getQrCodeUrl = (data) => {
  if (!data) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=180x180`;
};

export default function CheckInScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { ticketData: initialTicketData } = location.state || {}; // Rename to avoid confusion with internal state
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const processTicketData = useCallback((data) => {
    if (!data) {
      // Fallback or error state if no ticketData is provided
      setError("No ticket data provided.");
      toast.error("No ticket data provided to display.");
      return null;
    }

    let qrValue = "";
    if (Array.isArray(data.qrcodeORurl) && data.qrcodeORurl.length > 0) {
      qrValue = data.qrcodeORurl[0];
    } else {
      // Ensure that eventData and ID are available for robust QR code generation
      qrValue = `Event:${data.eventData?.name || data.title || 'Unknown Event'}-Ticket:${data.id || 'Unknown Ticket'}`;
    }

    return {
      eventName: data.eventData?.name || data.title || 'N/A',
      type: data.type || "REGULAR",
      qrCodeUrl: getQrCodeUrl(qrValue),
      status: data.status || "Registered",
      lastSynced: new Date().toLocaleString(),
      eventId: data.eventData?.id || data.eventId || data.id, // Ensure eventId is available for navigation
      fullEventData: data.eventData || data, // Pass full data for robust navigation
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const processedTicket = processTicketData(initialTicketData);
    if (processedTicket) {
      setTicket(processedTicket);
    } else {
      // Handle the error state from processTicketData
      setError("Failed to process ticket information.");
    }
    setLoading(false);
  }, [initialTicketData, processTicketData]);


  if (loading) {
    return (
      <div className="checkin-container center">
        <div className="spinner"></div>
        <p className="loading-text">Loading Ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="checkin-container center">
        <p className="error-text">{error || "No ticket found."}</p>
        <button className="button" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="checkin-container">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">Your QR Code</h1>
      </header>

      {/* Ticket Card */}
      <div className="card">
        <h2 className="title">Event Ticket</h2>
        <p className="subtitle">{ticket.eventName}</p>

        <div className="qr-container">
          <img src={ticket.qrCodeUrl} alt="QR Code" className="qr-code" />
        </div>

        <div className="info-section">
          <p><strong>Type:</strong> {ticket.type}</p>
          <p><strong>Status:</strong> {ticket.status}</p>
        </div>

        <button
          className="button"
          onClick={() =>
            navigate(
              `/attendee/view-event/${ticket.eventId}`,
              {
                state: { eventData: ticket.fullEventData },
              }
            )
          }
        >
          <span className="button-text">View Event Details</span>
        </button>
      </div>

      {/* Sync Info */}
      <div className="sync-container">
        <svg className="icon" viewBox="0 0 512 512" fill="currentColor">
          <path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm0 384c-97 0-176-79-176-176S159 80 256 80s176 79 176 176-79 176-176 176z" />
          <path d="M368 254L244 130c-6-6-16-6-22 0s-6 16 0 22l95 95H140c-8.8 0-16 7.2-16 16s7.2 16 16 16h177l-95 95c-6 6-6 16 0 22s16 6 22 0l124-124c6-6 6-16 0-22z" />
        </svg>
        <span className="sync-text">Last synced: {ticket.lastSynced}</span>
      </div>
    </div>
  );
}