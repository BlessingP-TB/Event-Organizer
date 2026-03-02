import React, { useState, useEffect } from "react";
import "../../styles/pages/_approvalqueue.scss";
import { FaCalendarAlt, FaTag } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from 'react-router-dom';

const tabs = ["All", "PENDING", "APPROVED", "REJECTED"];

export default function ApprovalScreen() {
  const [approvals, setApprovals] = useState([]);
  const [filteredApprovals, setFilteredApprovals] = useState([]);
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("accessToken");

  /** Fetch Approvals List **/
  const fetchApprovals = async () => {
    if (!token) {
      setLoading(false);
      window.location.href = "/login";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/approvals", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      let approvalArray = [];

      if (Array.isArray(data)) approvalArray = data;
      else if (Array.isArray(data.data)) approvalArray = data.data;
      else if (Array.isArray(data.items)) approvalArray = data.items;
      else approvalArray = [];

      // Normalize base data
      const normalized = approvalArray.map(item => ({
        id: String(item.id),
        eventId: String(item.eventId || item.event?.id || ""),
        title: item.event?.name || `Event ${item.eventId || "N/A"}`,
        venue: item.event?.venue?.name || "Loading...",
        organizer: item.event?.organizer?.name || "Loading...",
        status: (item.status || "PENDING").toUpperCase(),
        cost: Number(item.calculatedCost ?? 0),
        totalPaid: Number(item.totalPaid ?? 0),
        date: item.event?.startDateTime
          ? new Date(item.event.startDateTime).toLocaleString()
          : "Date not set",
      }));

      setApprovals(normalized);

      // 🔁 Fetch extra event data in parallel
      await fetchExtraEventDetails(normalized);
    } catch (err) {
      console.error("Failed to load approvals:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else {
        alert("Failed to load approvals. Check console.");
      }
    } finally {
      setLoading(false);
    }
  };

  /** Fetch event details for each eventId **/
  const fetchExtraEventDetails = async (approvalList) => {
    const updated = await Promise.all(
      approvalList.map(async (item) => {
        if (!item.eventId) return item;

        try {
          const res = await fetch(`http://localhost:3000/admin/events/${item.eventId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          });

          if (!res.ok) throw new Error(`Failed to fetch event ${item.eventId}`);

          const eventData = await res.json();
          const event = eventData.event || eventData || {};

          return {
            ...item,
            title: event.name || item.title,
            venue: event.venue?.name || item.venue,
            organizer: event.organizer?.fullName || event.organizer?.name || item.organizer,
            date: event.startDateTime
              ? new Date(event.startDateTime).toLocaleString()
              : item.date,
            category: event.category || "Uncategorized",
          };
        } catch (err) {
          console.warn("Event fetch failed:", err);
          return item;
        }
      })
    );

    setApprovals(updated);
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  /** Filter Approvals **/
  useEffect(() => {
    let filtered = [...approvals];
    if (selectedTab !== "All") {
      filtered = filtered.filter(item => item.status === selectedTab);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term) ||
          (item.organizer && item.organizer.toLowerCase().includes(term)) ||
          (item.venue && item.venue.toLowerCase().includes(term))
      );
    }
    setFilteredApprovals(filtered);
  }, [approvals, selectedTab, searchTerm]);

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING": return "pending";
      case "APPROVED": return "approved";
      case "REJECTED":
      case "CANCELLED": return "rejected";
      default: return "pending";
    }
  };

  // const formatCurrency = (amount) =>
  //   new Intl.NumberFormat('en-ZA', {
  //     style: 'currency',
  //     currency: 'ZAR',
  //     minimumFractionDigits: 2,
  //   }).format(amount);

  if (loading) {
    return (
      <div className="approval-container">
        <p>Loading approvals...</p>
      </div>
    );
  }

  return (
    <div className="approval-container">
      <h1 className="page-title">Event Approvals</h1>

      <div className="search-container">
        <FiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search by event, venue, or organizer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="tabs-row">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${selectedTab === tab ? "active" : ""}`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <h3 className="tab-heading">
        {selectedTab === "All" ? "All Approvals" : selectedTab.replace(/_/g, ' ')}
      </h3>
      <p className="count">{filteredApprovals.length} items</p>

      <div className="cards">
        {filteredApprovals.length === 0 ? (
          <p className="empty">No approvals found</p>
        ) : (
          filteredApprovals.map((item) => (
            <div key={item.id} className="event-card">
              <div className="event-left">
                <div className="icon-circle">
                  <FaCalendarAlt className="calendar-icon" />
                </div>
                <div className="event-info">
                  <h4 className="title">{item.title}</h4>
                  <p className="meta"><FaTag /> Venue: {item.venue}</p>
                  <p className="meta">Organizer: {item.organizer}</p>
                  <p className="meta"><FaCalendarAlt /> {item.date}</p>
                  <p className={`status ${getStatusColor(item.status)}`}>
                    Status: {item.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="action-buttons">
                <button
                  className="view-btn"
                  onClick={() => {
                    if (item.eventId) {
                      navigate(`/admin/details/${item.eventId}`);
                    } else {
                      alert("Event ID not available for this approval.");
                    }
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
