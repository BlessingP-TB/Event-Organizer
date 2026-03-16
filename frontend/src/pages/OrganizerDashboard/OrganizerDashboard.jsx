import React, { useState, useEffect, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import api from '../../utils/api';
import DashboardHeader from "../../components/DashBoardHeader";
import OverviewCard from "../../components/OverviewCard";
import QuickActions from "../../components/QuickActions";
import "../../styles/pages/_organizer_dashboard.scss";

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
};

const formatStatus = (value) => {
  if (!value) {
    return 'Not checked in';
  }

  return value.replace(/_/g, ' ');
};

const didAttendEvent = (attendee) => {
  const attendanceStatus = String(attendee?.attendanceStatus || '').toUpperCase();
  const checkedInStatuses = ['ATTENDED', 'CHECKED_IN', 'CHECKED_OUT'];
  return Boolean(attendee?.checkedAt || attendee?.ticketRedeemed || checkedInStatuses.includes(attendanceStatus));
};

const downloadPdfFile = (filename, pdfBytes) => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const toSafeFilename = (value) => String(value || 'event').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();

const truncateToWidth = (text, font, size, maxWidth) => {
  const source = String(text ?? '');
  if (!source) {
    return '';
  }

  if (font.widthOfTextAtSize(source, size) <= maxWidth) {
    return source;
  }

  const ellipsis = '...';
  let result = source;

  while (result.length > 0 && font.widthOfTextAtSize(`${result}${ellipsis}`, size) > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}${ellipsis}`;
};

const buildAttendeePdf = async ({ eventName, registerTitle, attendees }) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize = [842, 595];
  const margin = 32;
  const rowHeight = 18;
  const textSize = 9;
  const headers = ['Name', 'Email', 'Phone', 'Status', 'Attended', 'Registered At', 'Checked In At'];
  const colWidths = [108, 160, 84, 78, 62, 140, 140];

  let page = pdfDoc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const drawHeader = () => {
    page.drawText(`Event Register: ${eventName}`, {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.17, 0.28),
    });
    y -= 18;
    page.drawText(`Category: ${registerTitle}   |   Generated: ${new Date().toLocaleString()}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.33, 0.39, 0.48),
    });
    y -= 20;

    let x = margin;
    headers.forEach((header, index) => {
      page.drawText(header, {
        x,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0.1, 0.17, 0.28),
      });
      x += colWidths[index];
    });

    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageSize[0] - margin, y },
      thickness: 1,
      color: rgb(0.84, 0.88, 0.93),
    });
    y -= 12;
  };

  drawHeader();

  attendees.forEach((attendee) => {
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage(pageSize);
      y = pageSize[1] - margin;
      drawHeader();
    }

    const row = [
      attendee.attendeeName,
      attendee.attendeeEmail,
      attendee.attendeePhone || '-',
      attendee.registrationStatus,
      didAttendEvent(attendee) ? 'YES' : 'NO',
      attendee.registeredAt ? new Date(attendee.registeredAt).toLocaleString() : '-',
      attendee.checkedAt ? new Date(attendee.checkedAt).toLocaleString() : '-',
    ];

    let x = margin;
    row.forEach((value, index) => {
      const cellText = truncateToWidth(value, font, textSize, colWidths[index] - 6);
      page.drawText(cellText, {
        x,
        y,
        size: textSize,
        font,
        color: rgb(0.16, 0.2, 0.25),
      });
      x += colWidths[index];
    });

    y -= rowHeight;
  });

  return pdfDoc.save();
};

const Dashboard = () => {
  const [report, setReport] = useState({
    summary: {
      totalEvents: 0,
      totalRegistrations: 0,
      totalPendingRegistrations: 0,
      totalCheckedIn: 0,
    },
    events: [],
    recentActivity: [],
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
    totalPendingRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');

  const user = JSON.parse(localStorage.getItem("user") || 'null');
  const organizerId = user?.id;

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!organizerId) {
      setError("User ID not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/registrations/organizer-report');
      const nextReport = response.data || {};
      const summary = nextReport.summary || {};

      setReport({
        summary: {
          totalEvents: summary.totalEvents || 0,
          totalRegistrations: summary.totalRegistrations || 0,
          totalPendingRegistrations: summary.totalPendingRegistrations || 0,
          totalCheckedIn: summary.totalCheckedIn || 0,
        },
        events: Array.isArray(nextReport.events) ? nextReport.events : [],
        recentActivity: Array.isArray(nextReport.recentActivity) ? nextReport.recentActivity : [],
      });

      if (!selectedEventId && Array.isArray(nextReport.events) && nextReport.events.length > 0) {
        setSelectedEventId(nextReport.events[0].eventId);
      }

      setStats({
        totalEvents: summary.totalEvents || 0,
        totalRegistrations: summary.totalRegistrations || 0,
        totalAttendance: summary.totalCheckedIn || 0,
        totalPendingRegistrations: summary.totalPendingRegistrations || 0,
      });

    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setError("Could not load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [organizerId, selectedEventId]);

  useEffect(() => {
    fetchDashboardStats();
    window.addEventListener('focus', fetchDashboardStats);
    return () => window.removeEventListener('focus', fetchDashboardStats);
  }, [fetchDashboardStats]);

  const selectedEventReport = report.events.find((eventReport) => eventReport.eventId === selectedEventId) || null;
  const selectedEventAttendees = Array.isArray(selectedEventReport?.attendees) ? selectedEventReport.attendees : [];
  const attendedAttendees = selectedEventAttendees.filter((attendee) => didAttendEvent(attendee));
  const notAttendedAttendees = selectedEventAttendees.filter((attendee) => !didAttendEvent(attendee));

  const handleDownloadPdf = async (type) => {
    if (!selectedEventReport) {
      return;
    }

    const eventSlug = toSafeFilename(selectedEventReport.eventName);
    const datePart = new Date().toISOString().slice(0, 10);

    try {
      if (type === 'all') {
        const pdfBytes = await buildAttendeePdf({
          eventName: selectedEventReport.eventName,
          registerTitle: 'All Registered Attendees',
          attendees: selectedEventAttendees,
        });
        downloadPdfFile(`${eventSlug}_registered_${datePart}.pdf`, pdfBytes);
        return;
      }

      if (type === 'attended') {
        const pdfBytes = await buildAttendeePdf({
          eventName: selectedEventReport.eventName,
          registerTitle: 'Attended Attendees',
          attendees: attendedAttendees,
        });
        downloadPdfFile(`${eventSlug}_attended_${datePart}.pdf`, pdfBytes);
        return;
      }

      const pdfBytes = await buildAttendeePdf({
        eventName: selectedEventReport.eventName,
        registerTitle: 'Not Attended Attendees',
        attendees: notAttendedAttendees,
      });
      downloadPdfFile(`${eventSlug}_not_attended_${datePart}.pdf`, pdfBytes);
    } catch (downloadError) {
      console.error('Failed to generate PDF register:', downloadError);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const filteredRecentActivity = selectedEventId
    ? report.recentActivity.filter((item) => item.eventId === selectedEventId)
    : report.recentActivity;

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
          title="Checked In / Scanned"
          value={loading ? '...' : stats.totalAttendance.toLocaleString()}
          icon="fas fa-users"
        />
        <OverviewCard
          title="Pending Registrations"
          value={loading ? '...' : stats.totalPendingRegistrations.toLocaleString()}
          icon="fas fa-hourglass-half"
        />
      </section>

      <section className="dashboard-report-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Registration Reports</h2>
            <p>Open reports, pick an event, view registered attendees, and export separate registers.</p>
          </div>
          <button
            type="button"
            className="main-report-button"
            onClick={() => setShowReports((previous) => !previous)}
          >
            {showReports ? 'Hide Reports' : 'Open Reports'}
          </button>
        </div>

        {!showReports ? (
          <div className="dashboard-empty-state">Click Open Reports to choose an event and access registration exports.</div>
        ) : loading ? (
          <div className="dashboard-empty-state">Loading reports...</div>
        ) : report.events.length === 0 ? (
          <div className="dashboard-empty-state">No events found yet. Create or publish an event first.</div>
        ) : (
          <>
            <div className="report-controls">
              <label htmlFor="eventSelector">Choose Event</label>
              <select
                id="eventSelector"
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                {report.events.map((eventReport) => (
                  <option key={eventReport.eventId} value={eventReport.eventId}>
                    {eventReport.eventName}
                  </option>
                ))}
              </select>

              <div className="export-actions">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf('all')}
                  disabled={!selectedEventAttendees.length}
                >
                  Download Registered
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf('attended')}
                  disabled={!attendedAttendees.length}
                >
                  Download Attended
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf('not-attended')}
                  disabled={!notAttendedAttendees.length}
                >
                  Download Not Attended
                </button>
              </div>
            </div>

            <div className="event-report-summary">
              <div>
                <strong>{selectedEventAttendees.length}</strong>
                <span>Registered</span>
              </div>
              <div>
                <strong>{attendedAttendees.length}</strong>
                <span>Attended</span>
              </div>
              <div>
                <strong>{notAttendedAttendees.length}</strong>
                <span>Not Attended</span>
              </div>
            </div>

            <div className="dashboard-section-header subheading">
              <div>
                <h2>Recent Registration Activity</h2>
                <p>Latest actions for the selected event.</p>
              </div>
            </div>

            {filteredRecentActivity.length === 0 ? (
              <div className="dashboard-empty-state compact">No recent activity for this event yet.</div>
            ) : (
              <div className="report-table-wrapper compact">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Attendee</th>
                      <th>Registration</th>
                      <th>Scan Status</th>
                      <th>Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentActivity.map((item, index) => (
                      <tr key={`${item.eventId}-${item.attendeeEmail}-${index}`}>
                        <td>
                          <strong>{item.attendeeName}</strong>
                          <span>{item.attendeeEmail}</span>
                        </td>
                        <td>
                          <span className={`status-pill status-${String(item.registrationStatus || '').toLowerCase()}`}>
                            {formatStatus(item.registrationStatus)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${item.attendanceStatus ? 'status-attended' : 'status-idle'}`}>
                            {formatStatus(item.attendanceStatus)}
                          </span>
                        </td>
                        <td>{formatDateTime(item.checkedAt || item.registeredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="dashboard-section-header subheading">
              <div>
                <h2>Event Registration Report</h2>
                <p>Registered attendees for the selected event.</p>
              </div>
            </div>

            {selectedEventAttendees.length === 0 ? (
              <div className="dashboard-empty-state compact">No one has registered for this event yet.</div>
            ) : (
              <div className="report-table-wrapper compact">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Attendee</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Attended</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEventAttendees.map((attendee) => (
                      <tr key={attendee.registrationId}>
                        <td>
                          <strong>{attendee.attendeeName}</strong>
                          <span>{attendee.attendeeEmail}</span>
                        </td>
                        <td>{attendee.attendeePhone || 'Not provided'}</td>
                        <td>
                          <span className={`status-pill status-${String(attendee.registrationStatus || '').toLowerCase()}`}>
                            {formatStatus(attendee.registrationStatus)}
                          </span>
                        </td>
                        <td>{didAttendEvent(attendee) ? formatDateTime(attendee.checkedAt || attendee.ticketRedeemedAt) : 'No'}</td>
                        <td>{formatDateTime(attendee.registeredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <QuickActions />
    </div>
  );
};

export default Dashboard;
