// src/pages/AdminAnalyticsDashboard.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { TrendingUp, Users, Calendar, CalendarCheck, Settings } from 'lucide-react';
import '../../styles/pages/_analyticsdashboard.scss';
import { useNavigate } from 'react-router-dom';
import useAdminDashboard from '../../hooks/Admin/adminDashBoard';

const AnalyticsDashboard = () => {
  const { dashboardData, loading, error } = useAdminDashboard();
  const navigate = useNavigate();

  /* ------------------- Navigation ------------------- */
  const handleExportClick = useCallback(() => navigate('/admin/export'), [navigate]);
  const handleApproveClick = useCallback(() => navigate('/admin/approvals'), [navigate]);
  const handleCalendarClick = useCallback(() => navigate('/admin/calendar'), [navigate]);
  const handleAddVenueClick = useCallback(() => navigate('/admin/venue-management'), [navigate]);
  const handleAddToolsClick = useCallback(() => navigate('/admin/tools'), [navigate]);

  /* ------------------- Data ------------------- */
  const occupancyData = dashboardData.topVenues || [];
  const revenueData = dashboardData.revenueData || [];

  const statsData = [
    {
      title: 'Registered Users',
      value: dashboardData.registeredUsers || 0,
      subtitle: 'Across all departments',
      icon: Users,
      iconColor: '#03A9F4'
    },
    {
      title: 'Active Events',
      value: dashboardData.activeEvents || 0,
      subtitle: 'Currently running or upcoming',
      icon: Calendar,
      iconColor: '#333'
    },
    {
      title: 'Event Bookings',
      value: dashboardData.eventBookings || 0,
      subtitle: 'New bookings this month',
      icon: CalendarCheck,
      iconColor: '#03A9F4'
    },
    {
      title: 'Total Venues',
      value: dashboardData.totalVenues || 0,
      subtitle: 'Spaces in the system',
      icon: Settings,
      iconColor: '#333'
    }
  ];

  /* ------------------- Revenue Calculations ------------------- */
  const revenueChange = Number(dashboardData.revenueChangePercent) || 0;

  const revenueChangeText = `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(
    2
  )}% vs. last month`;

  const totalRevenue =
    dashboardData.currentMonthRevenue ||
    revenueData.reduce((sum, val) => sum + (val || 0), 0);

  /* ------------------- Loading & Error States ------------------- */
  if (loading) return <div className="admin-dashboard-page">Loading dashboard...</div>;
  if (error) return <div className="admin-dashboard-page">Error: {error}</div>;

  return (
    <div className="admin-dashboard-page">
      {/* ----------------------- HEADER ----------------------- */}
      <header className="dashboard-header">
        <h1 className="header-title">Admin Dashboard</h1>
      </header>

      <div className="dashboard-content">

        {/* ----------------------- REVENUE CARD ----------------------- */}
        <div className="revenue-card">
          <div className="revenue-header">
            <h3 className="revenue-title">Revenue Summary</h3>
            <div className="monthly-badge">
              <span className="monthly-text">Monthly</span>
            </div>
          </div>

          <div className="revenue-amount-container">
            <h2 className="revenue-amount">R{totalRevenue.toLocaleString()}</h2>

            <div className="revenue-change">
              <TrendingUp size={16} className="revenue-icon" />
              <span className="revenue-change-text">{revenueChangeText}</span>
            </div>
          </div>

          <div className="revenue-chart">
            {revenueData.length > 0 ? (
              <LineGraph data={revenueData} color="#000000" />
            ) : (
              <div className="chart-placeholder">Loading revenue data...</div>
            )}
          </div>
        </div>

        {/* ----------------------- STATS GRID ----------------------- */}
        <div className="stats-grid">
          {statsData.map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="stat-header">
                <span className="stat-title">{stat.title}</span>
                <stat.icon size={20} style={{ color: stat.iconColor }} />
              </div>

              <div className="stat-value">{stat.value}</div>
              <p className="stat-subtitle">{stat.subtitle}</p>
            </div>
          ))}
        </div>

        {/* ----------------------- TOP 5 VENUES ----------------------- */}
        <div className="occupancy-card">
          <div className="card-header">
            <h3 className="card-title">Top 5 Most Booked Venues</h3>
          </div>

          <div className="occupancy-list">
            {occupancyData.length > 0 ? (
              occupancyData.map((venue, i) => (
                <div className="occupancy-row" key={i}>
                  <div className="occupancy-label">{venue.name}</div>

                  <div className="occupancy-bar-container">
                    <div
                      className="occupancy-bar-filled"
                      style={{
                        width: `${
                          venue.capacity > 0
                            ? (venue.bookedCount / venue.capacity) * 100
                            : 0
                        }%`
                      }}
                    ></div>
                  </div>

                  <div className="occupancy-value">{venue.bookedCount} bookings</div>
                </div>
              ))
            ) : (
              <div className="occupancy-row">
                <span className="occupancy-label">No data available</span>
                <div className="occupancy-bar-container">
                  <div className="occupancy-bar-filled" style={{ width: '0%' }}></div>
                </div>
                <span className="occupancy-value">0 bookings</span>
              </div>
            )}
          </div>

          <p className="occupancy-caption">
            Based on the highest booking counts this month.
          </p>
        </div>

        {/* ----------------------- ACTION BUTTONS ----------------------- */}
        <div className="action-links">
          <button className="action-link" onClick={handleApproveClick}>
            <span className="action-icon">|||</span>
            <span>Admin Approval Queue</span>
          </button>

          <button className="action-link" onClick={handleExportClick}>
            <span className="action-icon">↑</span>
            <span>Analytics Export Options</span>
          </button>

          <button className="action-link" onClick={handleCalendarClick}>
            <Calendar size={16} className="action-icon" />
            <span>View Calendar</span>
          </button>

          <button className="action-link" onClick={handleAddVenueClick}>
            <Settings size={16} className="action-icon" />
            <span>Add Venue</span>
          </button>

          <button className="action-link" onClick={handleAddToolsClick}>
            <Settings size={16} className="action-icon" />
            <span>Add Tools</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------- LINE GRAPH ----------------------- */
const LineGraph = ({ data, color = '#000000' }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.max(80, width * 0.25);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height || !data?.length) {
      d3.select(svgRef.current)?.selectAll('*').remove();
      return;
    }

    const { width, height } = dimensions;
    const margin = { top: 10, right: 10, bottom: 20, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const values = data.map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const yDomain =
      min === max ? (min === 0 ? [0, 1] : [min * 0.8, min * 1.2]) : [min, max];

    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([0, innerWidth]);

    const line = d3
      .line()
      .x((d, i) => xScale(i))
      .y(d => yScale(Number(d)))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);
  }, [data, dimensions, color]);

  return (
    <div ref={containerRef} className="line-graph-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default AnalyticsDashboard;
