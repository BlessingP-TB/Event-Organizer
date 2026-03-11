import React, { useEffect, useState } from "react";
import api from "../../utils/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizerEvents = async () => {
    try {
      const res = await api.get("/admin/events", {
        headers: { "Cache-Control": "no-cache" }
      });

      const payload = res.data;
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : [];

      setEvents(items);
    } catch (error) {
      console.error("Failed to fetch admin events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  if (loading) return <p style={{ textAlign: "center" }}>Loading events...</p>;

  return (
    <div className="admin-events-container">
      <h1 className="admin-title">All Events</h1>

      {events.length === 0 ? (
        <p style={{ textAlign: "center" }}>No events found.</p>
      ) : (
        <table className="admin-events-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Event Name</th>
              <th>Category</th>
              <th>Date</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={event.id}>
                <td>{index + 1}</td>
                <td>{event.name}</td>
                <td>{event.Theme?.name || "General"}</td>
                <td>{new Date(event.startDateTime).toLocaleDateString()}</td>
                <td>{event.venue?.name || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminEvents;
