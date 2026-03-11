// src/pages/OrganizerDashboard/MyEvents.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { deleteEvent } from '../../utils/eventDelete';
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
      const response = await api.get("/events/organizer", {
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
          const userDocsResponse = await api.get("/documents/me/documents");
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
      const response = await api.get(`/documents/documents/${documentId}`, {
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

  // Helper to get effective status for filtering tabs
  const getEffectiveStatus = (event) => {
    if (event.deletedAt) return "DELETED";
    // DRAFT: Not completed, not published, not pending approval, not cancelled
    if (event.status === "DRAFT") return "DRAFT";
    // PENDING: Waiting for approval (status is PENDING or has a pending approval)
    if (event.status === "PENDING" || event.approvals?.some(a => a.status === "PENDING")) return "PENDING";
    // ONGOING: Event is currently taking place
    const now = new Date();
    if (event.status === "ONGOING" || (event.status === "PUBLISHED" && new Date(event.startDateTime) <= now && new Date(event.endDateTime) >= now)) return "ONGOING";
    // PUBLISHED: Approved and upcoming
    if (event.status === "PUBLISHED" && new Date(event.startDateTime) > now) return "PUBLISHED";
    // COMPLETED: End date in the past
    if (event.status === "COMPLETED" || (event.status === "PUBLISHED" && new Date(event.endDateTime) < now)) return "COMPLETED";
    // CANCELLED: Cancelled or soft-deleted
    if (event.status === "CANCELLED") return "CANCELLED";
    return event.status;
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const effectiveStatus = getEffectiveStatus(event);
        if (filter === "All") return effectiveStatus !== "DELETED";
        if (filter === "CANCELLED") return effectiveStatus === "CANCELLED" || effectiveStatus === "DELETED";
        return effectiveStatus === filter;
      })
      .sort((a, b) => {
        let aValue, bValue;
        if (sortBy === "name") {
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
        } else {
          aValue = new Date(a.startDateTime);
          bValue = new Date(b.startDateTime);
        }
        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
        } else {
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
            {["All", "DRAFT", "PENDING", "PUBLISHED", "ONGOING", "CANCELLED", "COMPLETED"].map(btn => (
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
            const displayStatus = event.deletedAt ? 'DELETED' : (event.status || 'NO STATUS');
            const canModifyOrDelete = ["DRAFT", "PENDING"].includes(event.status);
            const canViewDoc = hasDocument;
            const showActionsMenu = canModifyOrDelete || canViewDoc;

            const closeActionsMenu = (clickedElement) => {
              const actionsMenu = clickedElement?.closest('.actions-menu');
              if (actionsMenu) {
                actionsMenu.removeAttribute('open');
              }
            };

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
                  <p className={`status ${displayStatus.toLowerCase()}`}>{displayStatus}</p>
                </div>
                <div className="event-action">
                  {/* Collapsed actions menu for Modify/Delete/View-Doc */}
                  {showActionsMenu && (
                    <details
                      className="actions-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <summary className="action-btn actions-toggle">Actions</summary>
                      <div className="actions-dropdown">
                        {canModifyOrDelete && (
                          <button
                            type="button"
                            className="menu-item modify-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeActionsMenu(e.currentTarget);
                              navigate(`/organizer/event-details-modify/${event.id}`, {
                                state: { eventData: event },
                              });
                            }}
                          >
                            Modify
                          </button>
                        )}

                        {canModifyOrDelete && (
                          <button
                            type="button"
                            className="menu-item delete-item"
                            onClick={async (e) => {
                              e.stopPropagation();
                              closeActionsMenu(e.currentTarget);
                              if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                                try {
                                  await deleteEvent(event.id);
                                  fetchEvents();
                                } catch (err) {
                                  alert('Failed to delete event: ' + (err?.response?.data?.message || err.message));
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        )}

                        {canViewDoc && (
                          <button
                            type="button"
                            className="menu-item view-doc-item"
                            onClick={(e) => {
                              closeActionsMenu(e.currentTarget);
                              handleDownloadDoc(e, event.id);
                            }}
                          >
                            View-Doc
                          </button>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Upload Document Button */}
                  {["DRAFT", "PENDING"].includes(event.status) && (
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
                  {/* Receipt Button for approved/published events */}
                  {["PUBLISHED", "ONGOING", "COMPLETED"].includes(event.status) && (
                    <button
                      className="action-btn receipt-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/organizer/event-receipt/${event.id}`, { state: { eventData: event } });
                      }}
                    >
                      Receipt
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