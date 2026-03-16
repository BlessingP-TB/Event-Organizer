import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../utils/api';
import '../../styles/pages/_rescheduleevent.scss';

const pad2 = (value) => String(value).padStart(2, '0');

const toDateAndTime = (isoValue) => {
  if (!isoValue) return { date: null, time: '' };
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return { date: null, time: '' };
  return {
    date: d,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
};

const combineDateAndTime = (date, time) => {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(':').map((item) => Number(item));
  const d = new Date(date);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
};

export default function RescheduleEvent() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedEvent = location.state?.eventData || null;

  const [eventData, setEventData] = useState(passedEvent);
  const [loading, setLoading] = useState(!passedEvent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const initialStart = toDateAndTime(passedEvent?.startDateTime);
  const initialEnd = toDateAndTime(passedEvent?.endDateTime);

  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (passedEvent) {
      return;
    }

    const loadEvent = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/events/${id}`);
        const event = response.data;
        setEventData(event);

        const start = toDateAndTime(event.startDateTime);
        const end = toDateAndTime(event.endDateTime);
        setStartDate(start.date);
        setStartTime(start.time);
        setEndDate(end.date);
        setEndTime(end.time);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load event details.');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, passedEvent]);

  const canSubmit = useMemo(() => {
    return Boolean(startDate && endDate && startTime && endTime && reason.trim().length >= 5);
  }, [startDate, endDate, startTime, endTime, reason]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const start = combineDateAndTime(startDate, startTime);
    const end = combineDateAndTime(endDate, endTime);

    if (!start || !end) {
      setError('Please select valid start and end date/time.');
      return;
    }

    if (end <= start) {
      setError('End date/time must be after start date/time.');
      return;
    }

    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post(`/events/${id}/reschedule-request`, {
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        reason: reason.trim(),
      });

      alert('Reschedule request submitted. Waiting for admin approval.');
      navigate('/organizer/events');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit reschedule request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-message">Loading event...</div>;
  }

  if (!eventData) {
    return <div className="error-message">Event not found.</div>;
  }

  return (
    <div className="reschedule-event-page">
      <div className="reschedule-event-container">
        <div className="reschedule-event-header">
          <button type="button" className="back-button" onClick={() => navigate('/organizer/events')}>
            Back
          </button>
          <h2>Reschedule Event</h2>
        </div>

        <form className="reschedule-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <p className="event-name">{eventData.name}</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Start Date *</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  className="form-input"
                  placeholderText="Select start date"
                  dateFormat="yyyy-MM-dd"
                />
              </div>

              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  className="form-input"
                  placeholderText="Select end date"
                  minDate={startDate || undefined}
                  dateFormat="yyyy-MM-dd"
                />
              </div>

              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group reason-group">
              <label>Reason for Rescheduling *</label>
              <textarea
                className="form-input"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a short reason for rescheduling"
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate('/organizer/events')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!canSubmit || submitting}>
                {submitting ? 'Submitting...' : 'Submit Reschedule Request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
