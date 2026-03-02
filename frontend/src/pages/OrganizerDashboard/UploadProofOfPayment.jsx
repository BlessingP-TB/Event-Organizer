// src/pages/OrganizerDashboard/UploadProofOfPayment.jsx
import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import '../../styles/pages/_uploadpop.scss'; // You'll create this SCSS file

export default function UploadProofOfPayment() {
  const navigate = useNavigate();
  const { id: eventId } = useParams(); // Destructure and rename 'id' to 'eventId' for clarity
  const location = useLocation();
  const { eventName } = location.state || {}; // Get eventName from state, if passed

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file input

  const token = localStorage.getItem("accessToken");

  // Redirect if eventId is missing or no token
  useEffect(() => {
    if (!eventId) {
      showToastMessage("No event specified for document upload. Redirecting.");
      setTimeout(() => navigate("/organizer/events"), 2000);
    }
    if (!token) {
      showToastMessage("You must be logged in to upload documents.");
      setTimeout(() => navigate("/login"), 2000);
    }
  }, [eventId, token, navigate]);

  const showToastMessage = (msg) => {
    setToastMessage(msg);
    setShowToast(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 5000);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
    });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Basic validation: Check file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5 MB

      if (!allowedTypes.includes(selectedFile.type)) {
        showToastMessage("Only PDF, JPG, JPEG, PNG files are allowed.");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
        return;
      }

      if (selectedFile.size > maxSize) {
        showToastMessage(`File size exceeds 5MB limit. Your file is ${Math.round(selectedFile.size / (1024 * 1024))} MB.`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
        return;
      }

      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      return showToastMessage("Please select a file.");
    }
    if (!eventId) {
      return showToastMessage("Event ID is missing.");
    }
    console.log("Submitting document for event:", eventId);
    setLoading(true);

    try {
      const base64Content = await fileToBase64(file);

      const docBody = {
        filename: file.name,
        size: file.size,
        mimetype: file.type,
        content: base64Content,
        type: "OTHER", // Changed to match backend validation
        eventId: eventId // Include the event ID to link the document
      };

      await axios.post(
        "http://localhost:3000/documents/me/documents", // Ensure this endpoint matches your backend
        docBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Document uploaded successfully for event:", eventId);
      showToastMessage("Document uploaded successfully!");

      // Navigate back to organizer events after a short delay
      setTimeout(() => navigate("/organizer/events"), 2000);

    } catch (err) {
      console.error("Upload error:", err.response || err);

      const msg =
        err.response?.data?.message || "Something went wrong during upload. Try again.";
      showToastMessage(msg); // Show error message
    } finally {
      setLoading(false);
    }
  };

  if (!eventId) {
    return (
      <div className="upload-pop-page">
        <div className="upload-pop-container">
          <div className="upload-pop-header">
            <button onClick={() => navigate("/organizer/events")} className="back-button">
              <ArrowLeft size={20} />
            </button>
            <h1>Upload Document</h1>
          </div>
          <p className="error-message">Error: Event ID not found. Please go back to My Events.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-pop-page">
      <div className="upload-pop-container">

        <div className="upload-pop-header">
          <button onClick={() => navigate(-1)} className="back-button">
            <ArrowLeft size={20} />
          </button>
          <h1>Upload Document</h1>
        </div>

        <div className="upload-pop-card">
          <div className="upload-pop-content">
            <p>Please upload your document for event: <strong>{eventName || eventId}</strong>.</p>
            <p className="note">Accepted formats: PDF, JPG, PNG (Max 5MB)</p>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file-input"
              disabled={loading}
            />

            {file && <p className="selected-file">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</p>}

            <button
              className="btn-upload"
              onClick={handleSubmit}
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className={`bottom-toast ${toastMessage.includes("Error") || toastMessage.includes("missing") || toastMessage.includes("Something") ? 'error' : ''}`}>
            <div className="bottom-toast-inner">
              <span>{toastMessage}</span>
              <button onClick={() => setShowToast(false)}>×</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}