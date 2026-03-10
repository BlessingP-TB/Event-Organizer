import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import DashboardHeader from "../../components/DashBoardHeader";
import OverviewCard from "../../components/OverviewCard";
import QuickActions from "../../components/QuickActions";
import "../../styles/pages/_organizer_dashboard.scss";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem("user")); // <-- parse the object
  const organizerId = user?.id; // <-- extract organizer ID

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!organizerId) {
      setError("User ID not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      // Fetch organizer events for totalEvents and aggregate counts
      const responseEvents = await api.get("/events/organizer", {
        params: { page: 1, pageSize: 100 }
      });

      const eventsData = responseEvents.data;
      const meta = eventsData.meta || {};
      const totalEvents = meta.totalItems || 0;

      const eventRows = Array.isArray(eventsData.data) ? eventsData.data : [];
      const totalRegistrations = eventRows.reduce(
        (sum, eventItem) => sum + (eventItem?._count?.registrations || 0),
        0
      );

      setStats({
        totalEvents,
        totalRegistrations,
        totalAttendance: 0,
      });

    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setError("Could not load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [organizerId]);

  useEffect(() => {
    fetchDashboardStats();
    window.addEventListener('focus', fetchDashboardStats);
    return () => window.removeEventListener('focus', fetchDashboardStats);
  }, [fetchDashboardStats]);

  return (
    <div className="dashboard-container">
      <DashboardHeader user={user?.name || "Organizer"} />

      {error && <div className="error-message">{error}</div>}

      <section className="overview-section">
        <OverviewCard
          title="Total Events"
          value={loading ? '...' : stats.totalEvents.toLocaleString()}
          icon="fas fa-calendar"
        />
        <OverviewCard
          title="Total Registrations"
          value={loading ? '...' : stats.totalRegistrations.toLocaleString()}
          icon="fas fa-user-check"
        />
        <OverviewCard
          title="Total Attendance"
          value={loading ? '...' : stats.totalAttendance.toLocaleString()}
          icon="fas fa-users"
        />
        <OverviewCard
          title="Average Rating"
          value="0"
          icon="fas fa-star"
        />
      </section>

      <QuickActions />
    </div>
  );
};

export default Dashboard;
