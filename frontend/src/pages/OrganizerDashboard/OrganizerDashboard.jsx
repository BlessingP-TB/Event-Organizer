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

const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
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
      // Fetch organizer events for totalEvents (and fallback stats)
      const responseEvents = await api.get("/events/organizer", {
        params: { page: 1, pageSize: 100 }
      });

      const eventsData = responseEvents?.data || {};
      const eventsList = Array.isArray(eventsData.data) ? eventsData.data : [];
      const meta = eventsData.meta || {};
      const totalEvents = Number.isFinite(meta.totalItems)
        ? meta.totalItems
        : eventsList.length;

      // Start with local sum from loaded events (always available)
      let totalRegistrations = eventsList.reduce(
        (sum, event) => sum + (event?._count?.registrations || 0),
        0
      );

      // Try authoritative registrations endpoint, but do not fail dashboard if it errors
      try {
        const responseRegistrations = await api.get("/registrations/total", {
          params: { organizerId }
        });
        if (Number.isFinite(responseRegistrations?.data?.count)) {
          totalRegistrations = responseRegistrations.data.count;
        }
      } catch (registrationErr) {
        console.warn("Dashboard registrations total unavailable, using fallback.", registrationErr);
      }

      // You can compute attendance if backend provides it, otherwise keep 0
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
