import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const organizerId = localStorage.getItem("userId"); // <--- IMPORTANT

  const fetchOrganizerEvents = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/events/organizer/${organizerId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setEvents(res.data);
    } catch (error) {
      console.error("Failed to fetch organizer events", error);
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
      <h1 className="admin-title">My Created Events</h1>

      {events.length === 0 ? (
        <p style={{ textAlign: "center" }}>You have not created any events yet.</p>
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
                <td>{event.category}</td>
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
