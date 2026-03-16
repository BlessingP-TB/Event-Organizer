// src/pages/CheckInScreen.jsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast'; // Import toast
import '../../styles/pages/_checkinscreen.scss'; // Assuming you create this SCSS file

// Helper to generate QR URL
const getQrCodeUrl = (data) => {
  if (!data) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=180x180`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString();
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `R${numeric.toFixed(2)}`;
  }

  return String(value);
};

const buildTicketHtml = (ticket) => {
  const details = [
    ["Event Name", ticket.eventName],
    ["Event ID", ticket.eventId],
    ["Ticket ID", ticket.ticketId],
    ["Registration ID", ticket.registrationId],
    ["Ticket Type", ticket.type],
    ["Status", ticket.status],
    ["Price", formatPrice(ticket.price)],
    ["Event Date", formatDateTime(ticket.eventDateTime)],
    ["Issued At", formatDateTime(ticket.issuedAt)],
    ["Redeemed At", formatDateTime(ticket.redeemedAt)],
    ["Last Synced", ticket.lastSynced],
    ["QR Text", ticket.qrText],
  ];

  const rows = details
    .map(
      ([label, value]) => `
        <tr>
          <td class="label">${escapeHtml(label)}</td>
          <td class="value">${escapeHtml(toDisplayValue(value))}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>SmartEvents Ticket</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          .header { margin-bottom: 18px; }
          .title { font-size: 22px; margin: 0; color: #0f172a; }
          .sub { margin: 6px 0 0; color: #475569; font-size: 13px; }
          .card { border: 1px solid #dbe3ee; border-radius: 10px; padding: 18px; }
          .qr-wrap { text-align: center; margin: 8px 0 14px; }
          .qr { width: 190px; height: 190px; border: 1px solid #e2e8f0; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; vertical-align: top; font-size: 13px; }
          td.label { width: 34%; color: #334155; font-weight: 700; }
          td.value { color: #0f172a; word-break: break-word; }
          .footer { margin-top: 16px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">SmartEvents Ticket</h1>
          <p class="sub">Generated on ${escapeHtml(new Date().toLocaleString())}</p>
        </div>

        <div class="card">
          <div class="qr-wrap">
            <img class="qr" src="${escapeHtml(ticket.qrCodeUrl || "")}" alt="Ticket QR Code" />
          </div>
          <table>${rows}</table>
        </div>

        <div class="footer">
          Keep this ticket safe. Present this QR code at event check-in.
        </div>
      </body>
    </html>
  `;
};

const toSafeFilePart = (value) =>
  String(value || "ticket")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function CheckInScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { ticketData: initialTicketData } = location.state || {}; // Rename to avoid confusion with internal state
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

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
      eventName: data.eventData?.name || data.event?.name || data.title || 'N/A',
      type: data.type || "REGULAR",
      qrCodeUrl: getQrCodeUrl(qrValue),
      qrText: qrValue,
      status: data.redeemed ? "Redeemed" : (data.status || "Registered"),
      lastSynced: new Date().toLocaleString(),
      eventId: data.eventData?.id || data.event?.id || data.eventId || null,
      eventDateTime: data.eventData?.startDateTime || data.event?.startDateTime || null,
      ticketId: data.id || null,
      registrationId: data.registrationId || null,
      issuedAt: data.issuedAt || null,
      redeemedAt: data.redeemedAt || null,
      price: data.price ?? null,
      fullEventData: data.eventData || data.event || data,
    };
  }, []);

  const handleDownloadTicket = useCallback(() => {
    if (!ticket || downloading) {
      return;
    }

    try {
      setDownloading(true);
      const html = buildTicketHtml(ticket);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);

      const eventPart = toSafeFilePart(ticket.eventName);
      const ticketPart = toSafeFilePart(ticket.ticketId || ticket.eventId || "ticket");
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${eventPart || "event"}-${ticketPart || "ticket"}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      window.URL.revokeObjectURL(url);
      toast.success("Ticket file downloaded. Open it in your browser to print or save as PDF.");
    } catch (downloadError) {
      console.error("Failed to download ticket:", downloadError);
      toast.error("Could not download ticket. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [downloading, ticket]);

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

        <div className="qr-section">
          <div className="qr-container">
            <img src={ticket.qrCodeUrl} alt="QR Code" className="qr-code" />
          </div>

          <div className="qr-actions">
            <button
              className="button download-button"
              onClick={handleDownloadTicket}
              disabled={downloading}
              type="button"
            >
              <span className="button-text">{downloading ? "Preparing..." : "Download Ticket"}</span>
            </button>
          </div>
        </div>

        <div className="qr-text-wrapper">
          <p className="qr-text-label">QR Text (Fallback)</p>
          <code className="qr-text-value">{ticket.qrText || 'N/A'}</code>
        </div>

        <div className="info-section">
          <p><strong>Ticket ID:</strong> {ticket.ticketId || 'N/A'}</p>
          <p><strong>Event ID:</strong> {ticket.eventId || 'N/A'}</p>
          <p><strong>Registration ID:</strong> {ticket.registrationId || 'N/A'}</p>
          <p><strong>Type:</strong> {ticket.type}</p>
          <p><strong>Price:</strong> {formatPrice(ticket.price)}</p>
          <p><strong>Status:</strong> {ticket.status}</p>
          <p><strong>Event Date:</strong> {formatDateTime(ticket.eventDateTime)}</p>
          <p><strong>Issued At:</strong> {formatDateTime(ticket.issuedAt)}</p>
          <p><strong>Redeemed At:</strong> {formatDateTime(ticket.redeemedAt)}</p>
        </div>

        <button
          className="button"
          type="button"
          disabled={!ticket.eventId}
          onClick={() =>
            ticket.eventId && navigate(
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