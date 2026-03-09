import React, { useState, useEffect } from "react";
import "../../styles/pages/_eventmanagement.scss";

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDateTime: "",
    endDateTime: "",
    status: "ONGOING",
    expectedAttend: "",
    totalTickets: "",
    isFree: false,
    ticketRequired: true,
    autoDistribute: false,
    allowAttendeePurchase: true,
    venueId: "",
    organizerId: "",
    organizerName: "",
    themeId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 5;

  // Load events from localStorage
  useEffect(() => {
    const storedEvents = JSON.parse(localStorage.getItem("events") || "[]");
    setEvents(storedEvents);
  }, []);

  // Save events and re-filter whenever data or filters change
  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
    filterEvents();
  }, [events, search, statusFilter]);

  // Filter events by search (name, description) and selected status filter
  const filterEvents = () => {
    let temp = [...events];

    // 🔍 Search by name or description
    if (search) {
      temp = temp.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🎭 Filter by selected status
    if (statusFilter !== "all") {
      temp = temp.filter((e) => e.status === statusFilter);
    }

    setFilteredEvents(temp);
    setCurrentPage(1);
  };

  // Pagination logic
  const indexOfLast = currentPage * eventsPerPage;
  const indexOfFirst = indexOfLast - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Edit event
  const handleEdit = (event) => {
    setSelectedEvent(event);
    setFormData({
      name: event.name,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      status: event.status,
      expectedAttend: event.expectedAttend || "",
      totalTickets: event.totalTickets || "",
      isFree: event.isFree,
      ticketRequired: event.ticketRequired,
      autoDistribute: event.autoDistribute,
      allowAttendeePurchase: event.allowAttendeePurchase,
      venueId: event.venueId,
      organizerId: event.organizerId,
      organizerName: event.organizerName || "",
      themeId: event.themeId || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.description || !formData.startDateTime || !formData.endDateTime) {
      alert("Name, Description, Start Date, and End Date are required");
      return;
    }
    const updatedEvents = events.map((e) =>
      e.id === selectedEvent.id ? { ...e, ...formData } : e
    );
    setEvents(updatedEvents);
    setIsEditing(false);
    setSelectedEvent(null);
  };

  // Delete a single event
  const handleDelete = (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;
    setEvents(events.filter((e) => e.id !== id));
  };

  // View event details
  const handleView = (event) => {
    alert(`Name: ${event.name}\nDescription: ${event.description}\nStatus: ${event.status}\nStart: ${event.startDateTime}\nEnd: ${event.endDateTime}`);
  };

  return (
    <div className="event-management-page">
      <h1>Event Management</h1>

      {/* Filters and Actions */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="ONGOING">Ongoing</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
          <option value="ENDED">Ended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>


      </div>

      {/* Events Table */}
      <table className="events-table">
        <thead>
          <tr>
            <th>Organizer ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentEvents.length > 0 ? (
            currentEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.organizerId}</td>
                <td>{event.name}</td>
                <td>{event.description}</td>
                <td>{event.status}</td>
                <td>{new Date(event.startDateTime).toLocaleString()}</td>
                <td>{new Date(event.endDateTime).toLocaleString()}</td>
                <td>
                  <button className="view-btn" onClick={() => handleView(event)}>
                    View
                  </button>
                  <button className="edit-btn" onClick={() => handleEdit(event)}>
                    Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(event.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                No events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Event</h2>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                name="startDateTime"
                value={formData.startDateTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                name="endDateTime"
                value={formData.endDateTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="ONGOING">Ongoing</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PUBLISHED">Published</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Expected Attendees</label>
              <input
                type="number"
                name="expectedAttend"
                value={formData.expectedAttend}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Total Tickets</label>
              <input
                type="number"
                name="totalTickets"
                value={formData.totalTickets}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isFree"
                  checked={formData.isFree}
                  onChange={handleInputChange}
                />
                Is Free
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="ticketRequired"
                  checked={formData.ticketRequired}
                  onChange={handleInputChange}
                />
                Ticket Required
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="autoDistribute"
                  checked={formData.autoDistribute}
                  onChange={handleInputChange}
                />
                Auto Distribute
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="allowAttendeePurchase"
                  checked={formData.allowAttendeePurchase}
                  onChange={handleInputChange}
                />
                Allow Attendee Purchase
              </label>
            </div>
            <div className="form-group">
              <label>Venue ID</label>
              <input
                type="text"
                name="venueId"
                value={formData.venueId}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Organizer ID</label>
              <input
                type="text"
                name="organizerId"
                value={formData.organizerId}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Organizer Name</label>
              <input
                type="text"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Theme ID</label>
              <input
                type="text"
                name="themeId"
                value={formData.themeId}
                onChange={handleInputChange}
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleSave}>Save</button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // setSelectedUser(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default EventManagement;
