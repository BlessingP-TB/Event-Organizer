// src/pages/OrganizerDashboard/MyEvents.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/pages/_myevents.scss';

const MyEvents = () => {
  // --- STATE MANAGEMENT ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [popDocuments, setPopDocuments] = useState({}); // State to store POP document IDs

  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");

  // --- DATA FETCHING ---
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:3000/events/organizer", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: 1,
          pageSize: 100
        }
      });

      console.log("API Response:", response.data);

      const eventsArray = Array.isArray(response.data.data) ? response.data.data : [];
      setEvents(eventsArray);

      // Fetch Document IDs for each event (looking for type 'OTHER')
      const docIds = {};
      for (const event of eventsArray) {
        try {
          const userDocsResponse = await axios.get("http://localhost:3000/documents/me/documents", { // Ensure this endpoint is correct
            headers: { Authorization: `Bearer ${token}` }
          });
          // Filter for documents of type 'OTHER' that are linked to the current event
          const relevantDoc = userDocsResponse.data.find(
            doc => doc.type === 'OTHER' && doc.eventId === event.id // Changed from 'PROOF_OF_PAYMENT' to 'OTHER'
          );
          if (relevantDoc) {
            docIds[event.id] = relevantDoc.id;
          }
        } catch (docErr) {
          console.warn(`Could not fetch documents for event ${event.id}:`, docErr);
        }
      }
      setPopDocuments(docIds);

    } catch (err) {
      console.error("Error fetching events:", err);

      if (err.response) {
        if (err.response.status === 403) {
          setError("Access Forbidden. Please ensure your email is verified and you have the correct permissions.");
        } else {
          setError(`Error: ${err.response.data.message || 'The server returned an error.'}`);
        }
      } else if (err.request) {
        setError("Network Error: Could not connect to the server. Please check your connection.");
      } else {
        setError("An unexpected error occurred while fetching events.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchEvents();
    } else {
      setError("You must be logged in to view your events.");
      setLoading(false);
    }
  }, [fetchEvents, token]);

  // --- HANDLER FOR DOWNLOADING DOCUMENT ---
  const handleDownloadDoc = useCallback(async (e, eventId) => {
    e.stopPropagation(); // Prevent the card's onClick from firing

    const documentId = popDocuments[eventId];

    if (!documentId) {
      alert("No document found for this event.");
      return;
    }

    try {
      const response = await axios.get(`http://localhost:3000/documents/documents/${documentId}`, { // Ensure this endpoint is correct
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // Important: Receive the response as a Blob

      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `document_${eventId}.pdf`; // Default filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create a URL for the blob and trigger a download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up the URL

    } catch (err) {
      console.error("Error downloading document:", err);
      alert(`Failed to download document: ${err.response?.data?.message || err.message}`);
    }
  }, [token, popDocuments]);

  // --- FILTERING AND SORTING ---
  const filteredEvents = useMemo(() => {
    return events
      .filter(event => filter === "All" || event.status === filter)
      .sort((a, b) => {
        let aValue, bValue;

        if (sortBy === "name") {
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
        } else { // Default to sorting by date
          aValue = new Date(a.startDateTime);
          bValue = new Date(b.startDateTime);
        }

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
        } else { // desc
          return aValue < bValue ? 1 : (aValue > bValue ? -1 : 0);
        }
      });
  }, [events, filter, sortBy, sortOrder]);

  // --- RENDER LOGIC ---

  if (loading) {
    return <div className="loading-message">Loading your events...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="my-events-page">
      <div className="header">
        <h2>My Events</h2>
        <div className="filter-sort">
          <div className="filters">
            {["All", "DRAFT", "PUBLISHED", "ONGOING", "CANCELLED", "COMPLETED"].map(btn => (
              <button
                key={btn}
                className={filter === btn ? 'active' : ''}
                onClick={() => setFilter(btn)}
              >
                {btn.charAt(0).toUpperCase() + btn.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="sort-dropdown">
            <label htmlFor="sort-select" className="visually-hidden">Sort events</label>
            <select
              id="sort-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="event-list">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events found for the selected filter.</p>
            {filter === 'All' && <p>Why not <a href="/organizer/create-event">create a new event</a>?</p>}
          </div>
        ) : (
          filteredEvents.map(event => {
            const formattedStartDate = new Date(event.startDateTime).toLocaleDateString();
            const hasDocument = !!popDocuments[event.id]; // Check if a document ID exists for this event

            return (
              <div
                key={event.id}
                className="event-card"
                onClick={() => navigate(`/organizer/event/${event.id}`, { state: { eventData: event } })}
                tabIndex="0"
              >
                <div className="event-info">
                  <h4>{event.name}</h4>
                  <p className="date">Starts: {formattedStartDate}</p>
                  <p className={`status ${event.status ? event.status.toLowerCase() : 'unknown'}`}>{event.status || 'NO STATUS'}</p>
                </div>
                <div className="event-action">
                  {/* Modify Button */}
                  {event.status === "DRAFT" && (
                    <button
                      className="action-btn modify-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/organizer/event-details-modify/${event.id}`, { state: { eventData: event } });
                      }}
                    >
                      Modify
                    </button>
                  )}
                  {/* Upload Document Button */}
                  {event.status === "DRAFT" && (
                    <button
                      className="action-btn upload-pop-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/organizer/upload-pop/${event.id}`, { state: { eventId: event.id, eventName: event.name } });
                      }}
                    >
                      Upload-PoP
                    </button>
                  )}
                  {/* Download Document Button */}
                  {hasDocument && ( // Only show if a document exists for this event
                    <button
                      className="action-btn download-pop-btn"
                      onClick={(e) => handleDownloadDoc(e, event.id)} // Use the generic download handler
                    >
                      View-Doc
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyEvents;