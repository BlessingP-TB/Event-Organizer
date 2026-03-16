// src/pages/OrganizerDashboard/MyEvents.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { deleteEvent } from '../../utils/eventDelete';
import '../../styles/pages/_myevents.scss';

const FACULTY_LABELS = {
  ALL_STUDENTS: 'All Students',
  MANAGEMENT_SCIENCE: 'Management Science',
  ICT: 'ICT',
  ENGINEERING_FEBE: 'Engineering (FEBE)',
};

const getAudienceLabel = (event) => {
  const audience = event?.requestedResourcesAndServices?.__audienceFaculty;
  return FACULTY_LABELS[audience] || 'All Students';
};

const MyEvents = () => {
  // --- STATE MANAGEMENT ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [nowMs, setNowMs] = useState(Date.now());
  const [popDocuments, setPopDocuments] = useState({}); // State to store POP document IDs

  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");

  const bytesToDataUrl = (bytes, mimeType = 'image/jpeg') => {
    if (!bytes) return null;

    if (typeof bytes === 'string') {
      if (bytes.startsWith('data:image/')) return bytes;
      return `data:${mimeType};base64,${bytes}`;
    }

    let byteArray;
    if (Array.isArray(bytes)) {
      byteArray = bytes;
    } else if (bytes?.type === 'Buffer' && Array.isArray(bytes.data)) {
      byteArray = bytes.data;
    } else if (typeof bytes === 'object') {
      byteArray = Object.values(bytes);
    } else {
      return null;
    }

    try {
      // Convert in chunks to avoid call stack errors on large images.
      const chunkSize = 0x8000;
      const uint8 = Uint8Array.from(byteArray);
      let binary = '';

      for (let i = 0; i < uint8.length; i += chunkSize) {
        const chunk = uint8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }

      const base64 = btoa(binary);
      return `data:${mimeType};base64,${base64}`;
    } catch (conversionError) {
      console.warn('Could not convert theme image bytes:', conversionError);
      return null;
    }
  };

  const getThemeImageSrc = (event) => {
    const theme = event?.Theme;
    if (!theme) return null;

    if (theme.image) {
      return bytesToDataUrl(theme.image, theme.mimeType || 'image/jpeg');
    }

    return theme.imageUrl || null;
  };

  // --- DATA FETCHING ---
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/events/organizer", {
        params: {
          page: 1,
          pageSize: 100,
          includeThemeImage: true,
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

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleCancelApprovedEvent = useCallback(async (eventItem, e) => {
    e.stopPropagation();

    const reason = window.prompt("Enter a cancellation reason (min 5 characters):", "");
    if (!reason) return;

    if (reason.trim().length < 5) {
      alert("Cancellation reason must be at least 5 characters.");
      return;
    }

    const confirmed = window.confirm(`Cancel event \"${eventItem.name}\"?`);
    if (!confirmed) return;

    try {
      const response = await api.post(`/events/${eventItem.id}/cancel`, { reason: reason.trim() });
      await fetchEvents();
      const refundPurchaseCount = response?.data?.refundPurchaseCount || 0;
      alert(
        refundPurchaseCount > 0
          ? `Event cancelled and removed from listings. Admin has been notified. Refund processing is pending for ${refundPurchaseCount} completed purchase${refundPurchaseCount === 1 ? '' : 's'}.`
          : "Event cancelled and removed from listings. Admin has been notified."
      );
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to cancel event.");
    }
  }, [fetchEvents]);

  const handleRequestReschedule = useCallback((eventItem, e) => {
    e.stopPropagation();
    navigate(`/organizer/reschedule-event/${eventItem.id}`, {
      state: { eventData: eventItem },
    });
  }, [navigate]);

  // --- FILTERING AND SORTING ---

  // Helper to get effective status for filtering tabs
  const getEffectiveStatus = (event) => {
    if (event.deletedAt) return "DELETED";
    return event.status || "UNKNOWN";
  };

  const getCancelledTimestamp = (event) => {
    if (event.deletedAt) return new Date(event.deletedAt).getTime();
    if (event.status === "CANCELLED") {
      const fallbackDate = event.updatedAt || event.createdAt;
      return fallbackDate ? new Date(fallbackDate).getTime() : null;
    }
    return null;
  };

  const isExpiredFromCancelledTab = (event) => {
    const cancelledAtMs = getCancelledTimestamp(event);
    if (!cancelledAtMs || Number.isNaN(cancelledAtMs)) return false;
    return nowMs - cancelledAtMs >= 20 * 60 * 1000;
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const effectiveStatus = getEffectiveStatus(event);
        if (filter === "All") return effectiveStatus !== "DELETED";
        if (filter === "CANCELLED") {
          const isCancelledLike = effectiveStatus === "CANCELLED" || effectiveStatus === "DELETED";
          return isCancelledLike && !isExpiredFromCancelledTab(event);
        }
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
  }, [events, filter, sortBy, sortOrder, nowMs]);

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
            const isDeletedEvent = Boolean(event.deletedAt);
            const effectiveStatus = getEffectiveStatus(event);
            const isCancelledLike = effectiveStatus === "CANCELLED" || effectiveStatus === "DELETED";
            const isApprovedEvent = event.status === "PUBLISHED";
            const canModifyOrDelete = ["DRAFT", "PENDING"].includes(event.status);
            const canViewDoc = hasDocument;
            const showActionsMenu = !isCancelledLike && (canModifyOrDelete || canViewDoc || isApprovedEvent);
            const eventImage = getThemeImageSrc(event);

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
                onClick={() => {
                  if (isDeletedEvent) return;
                  navigate(`/organizer/event/${event.id}`, { state: { eventData: event } });
                }}
                tabIndex={isDeletedEvent ? -1 : 0}
              >
                <div className="event-info">
                  <div className="event-poster">
                    {eventImage ? (
                      <img src={eventImage} alt={`${event.name} theme`} loading="lazy" />
                    ) : (
                      <div className="event-poster-placeholder">No image</div>
                    )}
                  </div>
                  <h4>{event.name}</h4>
                  <p className="date">Starts: {formattedStartDate}</p>
                  <p className="date">Audience: {getAudienceLabel(event)}</p>
                  <p className={`status ${displayStatus.toLowerCase()}`}>{displayStatus}</p>
                </div>
                <div className="event-action">
                  {isCancelledLike && (
                    <button
                      type="button"
                      className="action-btn delete-now-btn"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm('Delete this cancelled event now? This action cannot be undone.')) return;
                        try {
                          await api.post(`/events/${event.id}/delete-now`);
                          fetchEvents();
                        } catch (err) {
                          alert('Failed to delete event: ' + (err?.response?.data?.message || err.message));
                        }
                      }}
                    >
                      Delete Now
                    </button>
                  )}

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

                        {isApprovedEvent && (
                          <button
                            type="button"
                            className="menu-item written-assign-item"
                            onClick={(e) => {
                              closeActionsMenu(e.currentTarget);
                              navigate(`/organizer/written-assign/${event.id}`, {
                                state: { eventData: event },
                              });
                            }}
                          >
                            Written Assign
                          </button>
                        )}

                        {isApprovedEvent && (
                          <button
                            type="button"
                            className="menu-item reschedule-item"
                            onClick={(e) => {
                              closeActionsMenu(e.currentTarget);
                              handleRequestReschedule(event, e);
                            }}
                          >
                            Reschedule
                          </button>
                        )}

                        {isApprovedEvent && (
                          <button
                            type="button"
                            className="menu-item cancel-event-item"
                            onClick={(e) => {
                              closeActionsMenu(e.currentTarget);
                              handleCancelApprovedEvent(event, e);
                            }}
                          >
                            Cancel Event
                          </button>
                        )}

                      </div>
                    </details>
                  )}

                  {!isCancelledLike && ["DRAFT", "PENDING"].includes(event.status) && (
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