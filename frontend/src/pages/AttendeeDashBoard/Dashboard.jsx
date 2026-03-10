import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../utils/api';
import DashboardHeader from "../../components/DashBoardHeader";
import OverviewCard from "../../components/OverviewCard";
import "../../styles/pages/_organizer_dashboard.scss";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    upcomingEventsCount: 0,
    eventsAttended: 0,
    totalSpent: 0,
    eventsTimeline: [],
    nextUpcomingEvents: [],
    ticketStatusSummary: { confirmed: 0, pending: 0, cancelled: 0 },
    pendingTasks: [],
    registrationsLast30Days: 0,
    todayEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/attendee/stats');
      const data = response.data;
      setStats({
        totalRegistrations: Number(data.totalRegistrations) || 0,
        upcomingEventsCount: Number(data.upcomingEventsCount) || 0,
        eventsAttended: Number(data.eventsAttended) || 0,
        totalSpent: Number(data.totalSpent) || 0,
        eventsTimeline: data.eventsTimeline || [],
        nextUpcomingEvents: data.nextUpcomingEvents || [],
        ticketStatusSummary: data.ticketStatusSummary || { confirmed: 0, pending: 0, cancelled: 0 },
        pendingTasks: data.pendingTasks || [],
        registrationsLast30Days: data.registrationsLast30Days || 0,
        todayEvents: data.todayEvents || []
      });
    } catch (err) {
      console.error("Failed to fetch attendee stats:", err);
      // Keep state as is (defaults) on error to show empty dashboard instead of crash
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit'
    });
  };

  const Card = ({ title, children, className, actionText, onAction }) => (
    <div className={`dashboard-card ${className || ''}`} style={{ 
        background: 'white', borderRadius: '12px', padding: '1.5rem', 
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)', height: '100%', display: 'flex', flexDirection: 'column' 
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>{title}</h3>
            {actionText && (
                <span onClick={onAction} style={{ fontSize: '0.8rem', color: '#4F46E5', cursor: 'pointer', fontWeight: '500' }}>
                    {actionText}
                </span>
            )}
        </div>
        <div style={{ flex: 1 }}>{children}</div>
    </div>
  );

  const StatusRow = ({ label, count, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>{label}</span>
        <span style={{ fontWeight: '600', color: color }}>{count}</span>
    </div>
  );

  return (
    <div className="dashboard-container" style={{ padding: '2rem', background: '#f9fafb', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <DashboardHeader 
        title={`Welcome back, ${user?.firstName || 'Attendee'}!`} 
        subtitle="Dashboard Overview"
      />

      {/* Row 1: Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <OverviewCard title="My Tickets" value={stats.totalRegistrations} icon="fas fa-ticket-alt" trend="+1 new" color="#4f46e5" />
        <OverviewCard title="Upcoming" value={stats.upcomingEventsCount} icon="fas fa-calendar-alt" trend="Active" color="#2563eb" />
        <OverviewCard title="Attended" value={stats.eventsAttended} icon="fas fa-check-circle" trend="Completed" color="#10b981" />
        <OverviewCard title="Total Spent" value={`R${stats.totalSpent.toLocaleString()}`} icon="fas fa-wallet" isCurrency={true} color="#f59e0b" />
      </div>

      {/* Row 2: Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Next Upcoming Events List */}
        <Card title="Next Upcoming Events" actionText="View All" onAction={() => navigate('/attendee/my-events')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.nextUpcomingEvents.length > 0 ? (
                    stats.nextUpcomingEvents.map(event => (
                        <div 
                            key={event.id} 
                            onClick={() => navigate(`/attendee/view-event/${event.id}`)}
                            style={{ 
                                padding: '1rem', 
                                background: '#ffffff', 
                                borderRadius: '12px', 
                                border: '1px solid #f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                            }}
                        >
                             <div style={{
                                width: '45px',
                                height: '45px',
                                background: '#eff6ff',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#3b82f6',
                                fontSize: '1.2rem'
                            }}>
                                <i className="fas fa-calendar-day"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>{event.name}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                    <i className="far fa-clock"></i>
                                    <span>{formatDate(event.date)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                        <i className="far fa-calendar-times" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
                        <p style={{ margin: 0, fontStyle: 'italic' }}>No upcoming events.</p>
                    </div>
                )}
            </div>
        </Card>

        {/* Ticket Status Summary */}
        <Card title="Ticket Status Summary">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', height: '100%' }}>
                <div style={{ flex: 1 }}>
                     <StatusRow label="Confirmed" count={stats.ticketStatusSummary.confirmed} color="#10B981" />
                     <StatusRow label="Pending" count={stats.ticketStatusSummary.pending} color="#F59E0B" />
                     <StatusRow label="Cancelled" count={stats.ticketStatusSummary.cancelled} color="#EF4444" />
                </div>
                <div style={{ width: '100px', height: '100px' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={[
                                    { name: 'Confirmed', value: stats.ticketStatusSummary.confirmed },
                                    { name: 'Pending', value: stats.ticketStatusSummary.pending },
                                    { name: 'Cancelled', value: stats.ticketStatusSummary.cancelled }
                                ]} 
                                innerRadius={35} 
                                outerRadius={50} 
                                paddingAngle={5} 
                                dataKey="value"
                            >
                                {stats.ticketStatusSummary.confirmed > 0 && <Cell fill={COLORS[0]} />}
                                {stats.ticketStatusSummary.pending > 0 && <Cell fill={COLORS[1]} />}
                                {stats.ticketStatusSummary.cancelled > 0 && <Cell fill={COLORS[2]} />}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Card>

        {/* Events Timeline (Activity) */}
        <Card title="Activity Timeline (6 Months)">
             <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.eventsTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </Card>
      </div>

      {/* Row 3: Bottom Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        {/* Pending Tasks */}
        <Card title="Pending Tasks">
            {stats.pendingTasks.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {stats.pendingTasks.map((task, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                            <span style={{ color: '#4B5563' }}>{task.title}</span>
                            <span onClick={() => navigate(task.action)} style={{ color: '#EF4444', fontWeight: 'bold', cursor: 'pointer' }}>Fix</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div style={{ textAlign: 'center', color: '#10B981', marginTop: '1rem' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                    <p style={{ margin: 0 }}>All caught up!</p>
                </div>
            )}
        </Card>

        {/* Registration Trend */}
        <Card title="Registration Trend">
            <div style={{ marginTop: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B7280' }}>Last 30 Days</p>
                <h2 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: 'bold', color: '#111827' }}>{stats.registrationsLast30Days}</h2>
                <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Active
                </span>
            </div>
        </Card>

        {/* Event Health / My Engagement */}
        <Card title="My Engagement Score">
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                    <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="85, 100" />
                    </svg>
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', fontSize: '0.8rem' }}>85</span>
                 </div>
                 <div>
                     <p style={{ margin: 0, fontWeight: '600', color: '#10B981' }}>Good</p>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>Keep attending!</p>
                 </div>
             </div>
        </Card>

        {/* Today Panel */}
        <Card title="Today">
            {stats.todayEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {stats.todayEvents.map(ev => (
                         <div 
                             key={ev.id} 
                             onClick={() => navigate('/attendee/qr-code', { 
                                 state: { 
                                     ticketData: { 
                                         id: ev.ticketId, 
                                         eventData: ev, 
                                         title: ev.name, 
                                         type: ev.ticket?.type || 'REGULAR', 
                                         status: 'Registered',
                                         qrcodeORurl: ev.ticket?.qrcodeORurl
                                     } 
                                 } 
                             })}
                             style={{ 
                                 padding: '1rem', 
                                 background: '#ffffff', 
                                 borderRadius: '12px', 
                                 border: '1px solid #f3f4f6', 
                                 boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '0.75rem',
                                 cursor: 'pointer',
                                 transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                             }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-2px)';
                                 e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                             }}
                         >
                             <div style={{ 
                                 width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', 
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d'
                             }}>
                                 <i className="fas fa-qrcode" style={{ fontSize: '1.1rem' }}></i>
                             </div>
                             <div>
                                <p style={{ margin: 0, fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>{ev.name}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803d', fontWeight: '600' }}>Tap to Check In</p>
                             </div>
                         </div>
                     ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
                    <i className="fas fa-mug-hot" style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
                    <p style={{ margin: 0, fontStyle: 'italic' }}>No events today.</p>
                </div>
            )}
        </Card>

      </div>

      {/* Quick Actions Footer */}
      <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>Quick Actions</h3>
          <button 
                onClick={() => navigate('/attendee/events')}
                style={{ padding: '0.75rem 1.5rem', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
              + Browse Events
          </button>
      </div>

    </div>
  );
};

export default Dashboard;