import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaUpload, FaCheck, FaFileImage, FaRedo } from "react-icons/fa";
import { MdError } from "react-icons/md";
import "../../styles/pages/_eventdetails.scss";

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80";

// Helper to convert byte object or array to base64 data URL
const bytesToDataUrl = (bytes, mimeType = 'image/jpeg') => {
  if (!bytes) return null;
  let byteArray;
  if (typeof bytes === 'object' && !Array.isArray(bytes)) {
    byteArray = Object.values(bytes);
  } else if (Array.isArray(bytes)) {
    byteArray = bytes;
  } else {
    return null;
  }
  try {
    const uint8Array = new Uint8Array(byteArray);
    const binary = String.fromCharCode(...uint8Array);
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.error("Failed to convert image bytes to data URL", e);
    return null;
  }
};

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");

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

      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("You must be logged in to view event details.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:3000/events/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setEvent(response.data);

        const currentUserId = localStorage.getItem("userId");
        console.log("✅ DEBUG: Event loaded", response.data);
        console.log("👤 Your user ID (from localStorage):", currentUserId);
        console.log("👑 Event organizer ID:", response.data.organizerId);
        console.log("🔒 Can you upload?", currentUserId && response.data.organizerId === currentUserId);
        if (!currentUserId) {
          console.warn("⚠️ No 'userId' in localStorage! Upload UI will be hidden.");
        }
      } catch (err) {
        console.error("❌ Failed to load event:", err);
        setError("Sorry, we couldn't find the event you were looking for.");
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id, location.state]);

  const formatDate = (isoDate) =>
    isoDate
      ? new Date(isoDate).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

  const formatTime = (isoDate) =>
    isoDate
      ? new Date(isoDate).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

  if (loading)
    return (
      <div className="loading-container">
        <p>Loading event details...</p>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <MdError style={{ color: "#e74c3c", fontSize: "24px", marginRight: "8px" }} />
        <p>{error}</p>
      </div>
    );

  if (!event) return <p>Event not found.</p>;

  const statsAvailable = event._count && typeof event._count.registrations !== "undefined";

  // ✅ CORRECT IMAGE RESOLUTION: use imageUrl OR convert image bytes to data URL
// Use the event-level image URL (uploaded banner)
const bannerSrc = event?.Theme?.image
  ? bytesToDataUrl(event.Theme.image, 'image/jpeg')
  : DEFAULT_BANNER;

  const bannerSrc = themeImageUrl || DEFAULT_BANNER;

  // For demo/testing, always show upload section
  const canUpload = true;

  // --- Handlers ---
  const handleFileChange = (e) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select an image to upload.");
      return;
    }

    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(selectedFile);
    });

    setUploading(true);
    setUploadError("");
    try {
      const token = localStorage.getItem("accessToken");
      const payload = {
        name: `Theme for ${event.name}`,
        description: `Uploaded by organizer for event ${event.name}`,
        image: base64Image,
        eventId: event.id,
      };

      await axios.post("http://localhost:3000/themes/", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const eventRes = await axios.get(`http://localhost:3000/events/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        "Cache-Control": "no-cache",
      });
      setEvent(eventRes.data);
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (err) {
      console.error("Theme upload failed:", err);
      setUploadError(
        err.response?.data?.message || "Upload failed. Try again or check the file size/type."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="event-details-page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h2>Event Details</h2>
      </div>

      <div className="banner">
        <img src={bannerSrc} alt={event.name} onError={(e) => e.target.src = DEFAULT_BANNER} />
        <div className="banner-overlay">
          <h1>{event.name}</h1>
          <p className={`status-badge ${event.status ? event.status.toLowerCase() : ""}`}>
            {event.status}
          </p>
        </div>
      </div>

      <div className="details-container">
        <div className="event-section">
          <h3>About this Event</h3>
          <p>
            <strong>Description:</strong> {event.description || "No description provided."}
          </p>
          <p>
            <strong>Expected Guests:</strong> {event.expectedAttend || "Information not available."}
          </p>

          <hr />

          <h3>When and Where</h3>
          <p>
            <strong>Date:</strong> {formatDate(event.startDateTime)} to {formatDate(event.endDateTime)}
          </p>
          <p>
            <strong>Time:</strong> {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
          </p>
          <p>
            <strong>Venue:</strong> {event.venue?.name || "N/A"}
          </p>
          <p>
            <strong>Location:</strong> {event.venue?.location || "N/A"}
          </p>

          {statsAvailable && event.status !== "DRAFT" && (
            <>
              <hr />
              <h3>Event Statistics</h3>
              <p>Total Registered: {event._count.registrations}</p>
              {event.status === "COMPLETED" && <p>Total Attended: {event._count.attendance || 0}</p>}
            </>
          )}

          {event.requestedResourcesAndServices &&
            Object.keys(event.requestedResourcesAndServices).length > 0 && (
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

          {canUpload && (
            <>
              <hr />
              <h3 className="theme-section-title">Theme Image</h3>
              <p>Upload a custom banner for this event.</p>

              <form onSubmit={handleUploadSubmit} className="theme-upload-form">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                <div className="upload-controls">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="select-image-btn"
                  >
                    {selectedFile ? <FaRedo /> : <FaFileImage />}{" "}
                    {selectedFile ? "Change Image" : "Select Image"}
                  </button>

                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className={`upload-btn ${!selectedFile || uploading ? "disabled" : ""}`}
                  >
                    {uploading ? <FaUpload /> : <FaCheck />}{" "}
                    {uploading ? "Uploading..." : "Upload & Apply"}
                  </button>

                  {selectedFile && (
                    <div className="preview-container">
                      <p className="preview-label">Preview:</p>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="preview-image"
                      />
                    </div>
                  )}
                </div>

                {uploadError && <p className="upload-error">{uploadError}</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
