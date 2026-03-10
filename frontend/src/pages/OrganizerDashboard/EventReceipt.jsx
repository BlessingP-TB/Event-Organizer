// src/pages/OrganizerDashboard/EventReceipt.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import api from '../../utils/api';
import '../../styles/pages/_eventreceipt.scss';

const EventReceipt = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const receiptRef = useRef(null);

  const [event, setEvent] = useState(location.state?.eventData || null);
  const [loading, setLoading] = useState(!event);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!event) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version and trigger download
    const printWindow = window.open('', '_blank');
    const receiptContent = receiptRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event Approval Receipt - ${event?.name || 'Event'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .receipt-container {
              border: 2px solid #1a365d;
              padding: 30px;
              background: white;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #1a365d;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .receipt-header h1 {
              color: #1a365d;
              margin: 0 0 10px;
              font-size: 28px;
            }
            .receipt-header p {
              color: #666;
              margin: 5px 0;
            }
            .receipt-body {
              margin-bottom: 30px;
            }
            .receipt-section {
              margin-bottom: 25px;
            }
            .receipt-section h3 {
              color: #1a365d;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dotted #e2e8f0;
            }
            .receipt-row .label {
              font-weight: 600;
              color: #4a5568;
            }
            .receipt-row .value {
              color: #2d3748;
            }
            .approval-status {
              background: #c6f6d5;
              color: #22543d;
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
              font-weight: 600;
            }
            .receipt-footer {
              text-align: center;
              border-top: 2px solid #1a365d;
              padding-top: 20px;
              margin-top: 30px;
            }
            .receipt-footer p {
              color: #666;
              font-size: 12px;
              margin: 5px 0;
            }
            .official-stamp {
              margin-top: 20px;
              padding: 15px;
              border: 2px dashed #1a365d;
              text-align: center;
            }
            .official-stamp p {
              margin: 5px 0;
              font-size: 14px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return <div className="receipt-loading">Loading receipt...</div>;
  }

  if (error) {
    return <div className="receipt-error">{error}</div>;
  }

  if (!event) {
    return <div className="receipt-error">Event not found</div>;
  }

  // Find the approval that approved the event (status APPROVED)
  const approval = event.approvals?.find(a => a.status === 'APPROVED') || event.approvals?.[0];
  const approverName = approval?.approver?.name || 'System Administrator';
  const approvalDate = approval?.updatedAt
    ? new Date(approval.updatedAt).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A';

  const eventStartDate = new Date(event.startDateTime).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const eventStartTime = new Date(event.startDateTime).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const eventEndDate = new Date(event.endDateTime).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const eventEndTime = new Date(event.endDateTime).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="event-receipt-page">
      <div className="receipt-actions no-print">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="action-buttons">
          <button className="print-btn" onClick={handlePrint}>
            <Printer size={18} />
            Print
          </button>
          <button className="download-btn" onClick={handleDownload}>
            <Download size={18} />
            Download
          </button>
        </div>
      </div>

      <div className="receipt-container" ref={receiptRef}>
        <div className="receipt-header">
          <h1>EVENT APPROVAL RECEIPT</h1>
          <p>Official Confirmation Document</p>
          <p>Receipt No: {event.id?.substring(0, 8).toUpperCase()}</p>
        </div>

        <div className="receipt-body">
          <div className="receipt-section">
            <h3>Event Details</h3>
            <div className="receipt-row">
              <span className="label">Event Name:</span>
              <span className="value">{event.name}</span>
            </div>
            <div className="receipt-row">
              <span className="label">Status:</span>
              <span className="value">
                <span className="approval-status">{event.status}</span>
              </span>
            </div>
            <div className="receipt-row">
              <span className="label">Event Start:</span>
              <span className="value">{eventStartDate} at {eventStartTime}</span>
            </div>
            <div className="receipt-row">
              <span className="label">Event End:</span>
              <span className="value">{eventEndDate} at {eventEndTime}</span>
            </div>
            <div className="receipt-row">
              <span className="label">Expected Attendance:</span>
              <span className="value">{event.expectedAttend || 'N/A'}</span>
            </div>
          </div>

          <div className="receipt-section">
            <h3>Venue Information</h3>
            <div className="receipt-row">
              <span className="label">Venue Name:</span>
              <span className="value">{event.venue?.name || 'N/A'}</span>
            </div>
            <div className="receipt-row">
              <span className="label">Location:</span>
              <span className="value">{event.venue?.location || 'N/A'}</span>
            </div>
          </div>

          <div className="receipt-section">
            <h3>Organizer Information</h3>
            <div className="receipt-row">
              <span className="label">Organizer Name:</span>
              <span className="value">{event.organizer?.name || 'N/A'}</span>
            </div>
            <div className="receipt-row">
              <span className="label">Email:</span>
              <span className="value">{event.organizer?.email || 'N/A'}</span>
            </div>
          </div>

          <div className="receipt-section">
            <h3>Approval Information</h3>
            <div className="receipt-row">
              <span className="label">Approved By:</span>
              <span className="value">{approverName}</span>
            </div>
            <div className="receipt-row">
              <span className="label">Approval Date:</span>
              <span className="value">{approvalDate}</span>
            </div>
            {approval?.notes && (
              <div className="receipt-row">
                <span className="label">Notes:</span>
                <span className="value">{approval.notes}</span>
              </div>
            )}
          </div>

          <div className="official-stamp">
            <p><strong>APPROVED</strong></p>
            <p>This event has been officially approved</p>
            <p>Present this receipt to security for venue access</p>
          </div>
        </div>

        <div className="receipt-footer">
          <p>This is an official receipt generated by SmartEvents System</p>
          <p>Generated on: {new Date().toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p>For any queries, please contact the administration office</p>
        </div>
      </div>
    </div>
  );
};

export default EventReceipt;
