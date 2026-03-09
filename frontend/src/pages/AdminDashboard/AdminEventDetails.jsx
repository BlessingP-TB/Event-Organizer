import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaCalendarAlt, FaUsers, FaGlobe, FaMapMarkerAlt,
  FaBuilding, FaWineGlassAlt, FaUtensils, FaBroom, FaShieldAlt, FaMoneyBillWave,
  FaFilePdf, FaFileImage, FaFile, FaDownload, FaEdit, FaSave, FaTimes
} from "react-icons/fa";
import axios from 'axios'; // Import axios
import eventPic from "../../assets/images/eventPic.PNG";
import "../../styles/pages/EventDetails.scss";

export default function AdminEventDetails() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [eventDocuments, setEventDocuments] = useState([]); // State for documents linked to the event
  const [event, setEvent] = useState(null);
  const [approval, setApproval] = useState(null);
  const [booking, setBooking] = useState(null);
  const [bookingUpdate, setBookingUpdate] = useState({ status: '', depositPaid: false, totalPaid: 0 });
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  // --- NEW STATE FOR DOCUMENT STATUS EDITING ---
  const [editingDocStatus, setEditingDocStatus] = useState(null); // ID of the doc being edited
  const [newDocStatus, setNewDocStatus] = useState(''); // New status value
  // --- END OF NEW STATE ---

  const token = localStorage.getItem("accessToken");

  // --- Fetch event, approval, booking, and event documents ---
  const fetchData = async () => {
    if (!token) {
      alert("Session expired. Please log in again.");
      navigate("/login");
      return;
    }

    try {
      // Fetch event details
      const eventRes = await fetch(`http://localhost:3000/admin/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      });
      if (!eventRes.ok) throw new Error(`Event HTTP ${eventRes.status}`);
      const eventData = await eventRes.json();
      setEvent(eventData);

      // Fetch approvals and match event
      const approvalRes = await fetch(`http://localhost:3000/approvals`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      });
      if (!approvalRes.ok) throw new Error(`Approval HTTP ${approvalRes.status}`);
      const approvalData = await approvalRes.json();
      const matchingApproval = approvalData.data.find((a) => a.eventId === eventId);
      setApproval(matchingApproval || null);

      // Fetch bookings and match event
      const bookingRes = await fetch(`http://localhost:3000/bookings/bookings`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
      });
      if (!bookingRes.ok) throw new Error(`Booking HTTP ${bookingRes.status}`);
      const bookingData = await bookingRes.json();
      const allBookings =
        bookingData.data || bookingData.bookings || bookingData.items || bookingData;
      const matchingBooking = Array.isArray(allBookings)
        ? allBookings.find((b) => b.eventId === eventId)
        : null;
      setBooking(matchingBooking || null);
      // Initialize the update state with the current booking data
      if (matchingBooking) {
          setBookingUpdate({
              status: matchingBooking.status,
              depositPaid: matchingBooking.depositPaid,
              totalPaid: parseFloat(matchingBooking.totalPaid) // Ensure it's a number
          });
      }

      // --- NEW: Fetch documents for the organizer of this event ---
      if (eventData && eventData.organizerId) {
          try {
              const docsRes = await axios.get(`http://localhost:3000/admin/users/${eventData.organizerId}/documents`, {
                  headers: {
                      Authorization: `Bearer ${token}`,
                      "Cache-Control": "no-cache" // Add cache control
                  }
              });
              // Filter documents by the current event ID
              const eventDocs = docsRes.data.filter(doc => doc.eventId === eventId);
              setEventDocuments(eventDocs);
          } catch (docsErr) {
              console.error(`Failed to fetch documents for organizer ${eventData.organizerId}:`, docsErr);
              setEventDocuments([]); // Set to empty array on failure
          }
      } else {
          console.warn("Event or organizer ID not found, skipping document fetch.");
          setEventDocuments([]);
      }


    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Failed to load event or related details.");
      navigate("/admin/approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchData();
  }, [eventId]);

  // --- Approve / Reject Approval ---
  const handleApprove = () => updateApprovalStatus("APPROVED");
  const handleRejectClick = () => setShowRejectReason(true);

  const submitRejection = () => {
    const reasonToSave = rejectReason === "Other" ? customReason.trim() : rejectReason.trim();
    if (!reasonToSave) {
      setError("Please provide a reason for rejecting the event");
      return;
    }
    updateApprovalStatus("REJECTED", reasonToSave);
  };

  const updateApprovalStatus = async (newStatus, reason = null) => {
    if (!approval) {
      alert("No approval record found for this event.");
      return;
    }
    try {
      const body = { status: newStatus };
      if (reason) body.notes = reason;

      const res = await fetch(`http://localhost:3000/approvals/${approval.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setApproval(updated);
      setShowRejectReason(false);
      setRejectReason("");
      setCustomReason("");
      setError("");
      alert(`Approval ${newStatus.toLowerCase()} successfully`);
    } catch (err) {
      console.error("Failed to update approval status:", err);
      alert(`Failed to ${newStatus.toLowerCase()} approval`);
    }
  };

  // --- Update Booking Details (ADMIN) ---
  const handleBookingUpdate = async () => {
    if (!booking) {
      alert("No booking record found for this event.");
      return;
    }

    try {
      // Use the NEW admin endpoint for updating booking details
      const res = await fetch(`http://localhost:3000/admin/bookings/${booking.id}`, { // Changed endpoint
        method: "PATCH", // Changed method to PATCH
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: bookingUpdate.status,
          depositPaid: bookingUpdate.depositPaid,
          totalPaid: bookingUpdate.totalPaid,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const updatedBooking = await res.json();
      setBooking(updatedBooking); // Update the main booking state
      // Update the bookingUpdate state to reflect the saved values
      setBookingUpdate({
          status: updatedBooking.status,
          depositPaid: updatedBooking.depositPaid,
          totalPaid: parseFloat(updatedBooking.totalPaid)
      });
      setIsEditingBooking(false); // Exit edit mode after successful update
      alert("Booking details updated successfully");
    } catch (err) {
      console.error("Failed to update booking:", err);
      alert("Failed to update booking details");
    }
  };

  const handleBookingInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBookingUpdate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    }));
  };

  // --- Update Document Status ---
  const startEditingStatus = (docId, currentStatus) => {
    setEditingDocStatus(docId);
    setNewDocStatus(currentStatus);
  };

  const cancelEditingStatus = () => {
    setEditingDocStatus(null);
    setNewDocStatus('');
  };

  const saveDocumentStatus = async (docId) => {
    if (!docId || !newDocStatus) {
      setError("Document ID and new status are required.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/admin/documents/${docId}/status`, { // Use the correct admin endpoint
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newDocStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const updatedDoc = await res.json();

      // Update the document status in the local state
      setEventDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === docId ? { ...doc, status: updatedDoc.status, reviewedAt: updatedDoc.reviewedAt } : doc
        )
      );

      cancelEditingStatus(); // Exit edit mode after successful update
      alert("Document status updated successfully");
    } catch (err) {
      console.error("Failed to update document status:", err);
      alert("Failed to update document status");
    }
  };

  // --- Download Document (Updated using Axios) - Works with docId directly ---
  const handleDownloadDoc = useCallback(async (docId, filename) => {
    if (!docId) {
      alert("Document ID is missing.");
      return;
    }

    try {
      const response = await axios.get(`http://localhost:3000/documents/documents/${docId}`, { // Use the correct endpoint for admin
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // Important: Receive the response as a Blob
      });

      const contentDisposition = response.headers['content-disposition'];
      let downloadFilename = filename; // Default to the provided filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1]; // Use filename from header if available
        }
      }

      // Create a URL for the blob and trigger a download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up the URL

    } catch (err) {
      console.error("Error downloading document:", err);
      alert(`Failed to download document: ${err.response?.data?.message || err.message}`);
    }
  }, [token]); // Include token in dependencies if it's stable, otherwise manage carefully

  // --- Formatting helpers ---
  const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleString() : "Date not set");
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount || 0);
  const formatStatus = (status) => (status ? status.replace(/_/g, " ").toLowerCase() : "Unknown");
  const getDocumentIcon = (mimetype) => {
    if (mimetype?.includes('pdf')) return <FaFilePdf className="doc-icon pdf" />;
    if (mimetype?.includes('image')) return <FaFileImage className="doc-icon image" />;
    return <FaFile className="doc-icon generic" />;
  };

  if (loading) return <p>Loading event details...</p>;
  if (!event) return <p>Event not found.</p>;

  return (
    <div className="event-details">
      <h2 className="header-title">Event Details</h2>
      <img className="event-image" src={eventPic} alt="Event" />

      {/* --- Event Info --- */}
      <section className="info-section">
        <h3>Event Information</h3>
        <p className="subtitle">{event.name}</p>
        <ul>
          <li><FaGlobe /> Status: {formatStatus(approval?.status || "pending")}</li>
          <li><FaUsers /> Expected Attendees: {event.expectedAttend || "N/A"}</li>
          <li><FaCalendarAlt /> {formatDate(event.startDateTime)} to {formatDate(event.endDateTime)}</li>
          <li><FaMapMarkerAlt /> {event.venue?.name || "N/A"}, {event.venue?.location || "N/A"}</li>
        </ul>
      </section>

      {/* --- Booking Info (Editable) --- */}
      {booking && (
        <section className="info-section">
          <h3>Booking & Payment Details</h3>
          {isEditingBooking ? (
            <div className="booking-edit-form">
              <label>
                Status:
                <select
                  name="status"
                  value={bookingUpdate.status}
                  onChange={handleBookingInputChange}
                >
                  <option value="PENDING_DEPOSIT">PENDING_DEPOSIT</option>
                  <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
              <label>
                Deposit Paid:
                <input
                  type="checkbox"
                  name="depositPaid"
                  checked={bookingUpdate.depositPaid}
                  onChange={handleBookingInputChange}
                />
              </label>
              <label>
                Total Paid (ZAR):
                <input
                  type="number"
                  step="0.01"
                  name="totalPaid"
                  value={bookingUpdate.totalPaid}
                  onChange={handleBookingInputChange}
                />
              </label>
              <div className="edit-buttons">
                <button className="approve" onClick={handleBookingUpdate}><FaSave /> Save</button>
                <button className="reject" onClick={() => setIsEditingBooking(false)}><FaTimes /> Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <ul>
                <li>Status: {formatStatus(booking.status)}</li>
                <li>Calculated Cost: {formatCurrency(booking.calculatedCost)}</li>
                <li>Deposit Required: {booking.depositRequired ? formatCurrency(booking.depositRequired) : "N/A"}</li>
                <li>Deposit Paid: {booking.depositPaid ? "Yes" : "No"}</li>
                <li>Total Paid: {formatCurrency(booking.totalPaid)}</li>
              </ul>
              <button className="edit-booking-btn" onClick={() => setIsEditingBooking(true)}><FaEdit /> Edit Booking</button>
            </>
          )}
        </section>
      )}

      {/* --- Event Documents (NEW SECTION) - Shows documents linked to the event via organizer - */}
      <section className="info-section">
          <h3>Event Documents</h3>
          {eventDocuments.length > 0 ? (
            <div className="documents-list">
              {eventDocuments.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div className="doc-info">
                    {getDocumentIcon(doc.mimetype)}
                    <span className="doc-filename">{doc.filename}</span>
                    <span className="doc-type">{doc.type}</span>
                    {/* --- Document Status Edit --- */}
                    {editingDocStatus === doc.id ? (
                      <div className="doc-status-edit">
                        <select
                          value={newDocStatus}
                          onChange={(e) => setNewDocStatus(e.target.value)}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                        <button onClick={() => saveDocumentStatus(doc.id)}><FaSave /></button>
                        <button onClick={cancelEditingStatus}><FaTimes /></button>
                      </div>
                    ) : (
                      <span className="doc-status" onClick={() => startEditingStatus(doc.id, doc.status)}>
                        {formatStatus(doc.status)}
                      </span>
                    )}
                    {/* --- End of Document Status Edit --- */}
                  </div>
                  <button
                    className="download-btn"
                    onClick={() => handleDownloadDoc(doc.id, doc.filename)} // Pass docId and filename
                    title={`Download ${doc.filename}`}
                  >
                    <FaDownload /> Download
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>No documents found for this event.</p>
          )}
        </section>

      {/* --- Description --- */}
      <section className="info-section">
        <h3>Description</h3>
        <p>{event.description || "No description provided."}</p>
      </section>

      {/* --- Organizer --- */}
      <section className="info-section">
        <h3>Organizer</h3>
        <p>{event.organizer?.name || "N/A"} ({event.organizer?.email || "N/A"})</p>
      </section>

      {/* --- Venue --- */}
      <section className="info-section">
        <h3>Venue</h3>
        <p><FaBuilding /> {event.venue?.name || "Not assigned"}</p>
      </section>

      {/* --- Services --- */}
      {/* --- Services & Resources (DYNAMIC) --- */}
<section className="info-section">
  <h3>Services & Resources</h3>
  {event.requestedResourcesAndServices && Object.keys(event.requestedResourcesAndServices).length > 0 ? (
    <ul className="resources-list">
      {Object.entries(event.requestedResourcesAndServices).map(([key, value]) => {
        // Skip internal fields if any (unlikely)
        if (key.startsWith('_')) return null;

        // Determine icon based on key (optional but nice)
        let Icon = FaUtensils; // default
        if (key.toLowerCase().includes('liquor')) Icon = FaWineGlassAlt;
        else if (key.toLowerCase().includes('security')) Icon = FaShieldAlt;
        else if (key.toLowerCase().includes('clean')) Icon = FaBroom;
        else if (key.toLowerCase().includes('chair') || key.toLowerCase().includes('table')) Icon = FaBuilding;

        return (
          <li key={key} className="resource-item">
            <Icon className="resource-icon" />
            <strong>{key}:</strong>{' '}
            {typeof value === 'boolean' ? (
              value ? '✅ Yes' : '❌ No'
            ) : Array.isArray(value) ? (
              value.length > 0 ? value.join(', ') : 'None'
            ) : typeof value === 'number' ? (
              value
            ) : (
              String(value) || 'N/A'
            )}
          </li>
        );
      })}
    </ul>
  ) : (
    <p>No services or resources requested.</p>
  )}
</section>

      {/* --- Reject Approval Modal --- */}
      {showRejectReason && (
        <div className="reject-container">
          <label>Select a reason for rejection:</label>
          <select
            value={rejectReason}
            onChange={(e) => { setRejectReason(e.target.value); setError(""); }}
          >
            <option value="">-- Select a reason --</option>
            <option value="Incomplete event details">Incomplete event details</option>
            <option value="Venue not available">Venue not available</option>
            <option value="Conflict with another event">Conflict with another event</option>
            <option value="Budget or resource constraints">Budget or resource constraints</option>
            <option value="Event does not meet policy requirements">Event does not meet policy requirements</option>
            <option value="Other">Other</option>
          </select>

          {rejectReason === "Other" && (
            <textarea
              placeholder="Enter custom reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}

          {error && <p className="error-text">{error}</p>}

          <button className="approve" onClick={submitRejection}>Confirm Reject</button>
          <button className="reject" onClick={() => setShowRejectReason(false)}>Cancel</button>
        </div>
      )}

      {/* --- Approval Action Buttons --- */}
      <div className="buttons">
        {approval?.status === "PENDING" && !showRejectReason && (
          <>
            <button className="approve" onClick={handleApprove}>Approve</button>
            <button className="reject" onClick={handleRejectClick}>Reject</button>
          </>
        )}
        {approval?.status === "REJECTED" && (
          <button className="approve" onClick={handleApprove}>Approve</button>
        )}
      </div>
    </div>
  );
}