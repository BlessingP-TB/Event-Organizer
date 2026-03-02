import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import VenueCardGallery from '../../components/VenueCardGallery';
import TermsCheckbox from '../../components/TermsCheckbox';
import "../../styles/pages/_createevent.scss";

const padTo2Digits = (num) => num.toString().padStart(2, '0');

const deconstructISOString = (isoString) => {
  if (!isoString) return { date: null, time: '' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: null, time: '' };
  const time = `${padTo2Digits(d.getHours())}:${padTo2Digits(d.getMinutes())}`;
  return { date: d, time };
};

export default function ModifyForm() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [dateParts, setDateParts] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const fetchEventForEditing = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(`http://localhost:3000/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const eventData = response.data;

        setFormData({
          name: eventData.name,
          description: eventData.description,
          expectedAttend: eventData.expectedAttend || '',
          venueId: eventData.venueId,
          campus: eventData.venue?.campus || '',
          venueType: eventData.venue?.type || '',
          requestedResourcesAndServices: eventData.requestedResourcesAndServices || {}
        });

        setDateParts({
          startDate: deconstructISOString(eventData.startDateTime).date,
          startTime: deconstructISOString(eventData.startDateTime).time,
          endDate: deconstructISOString(eventData.endDateTime).date,
          endTime: deconstructISOString(eventData.endDateTime).time,
        });

        if (eventData.venue) setSelectedVenue(eventData.venue);

      } catch (err) {
        console.error("Failed to fetch event data for modification:", err);
        setError("Could not load event data. It may have been deleted or you don't have permission.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventForEditing();
  }, [eventId]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleDateTimeChange = useCallback((name, value) => {
    setDateParts(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleVenueSelect = useCallback((venue) => {
    setSelectedVenue(venue);
    setFormData(prev => ({ ...prev, venueId: venue.id }));
  }, []);

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const combineDateTime = (date, time) => {
      if (!date || !time) return null;
      const d = new Date(date);
      const [hours, minutes] = time.split(':');
      d.setHours(parseInt(hours, 10));
      d.setMinutes(parseInt(minutes, 10));
      return d.toISOString();
    };

    const updatePayload = {
      ...formData,
      expectedAttend: Number(formData.expectedAttend),
      startDateTime: combineDateTime(dateParts.startDate, dateParts.startTime),
      endDateTime: combineDateTime(dateParts.endDate, dateParts.endTime),
      requestedResourcesAndServices: formData.requestedResourcesAndServices
    };

    // Remove UI-only fields
    delete updatePayload.campus;
    delete updatePayload.venueType;

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.patch(`http://localhost:3000/events/${eventId}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToastMessage("Event updated successfully!");
      setTimeout(() => navigate(`/organizer/event-details-modify/${eventId}`), 2000);
    } catch (err) {
      console.error("Failed to update event:", err);
      const errorMessage = err.response?.data?.message || "An error occurred while updating the event.";
      setError(errorMessage);
      showToastMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-message">Loading event for modification...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!formData || !dateParts) return <div className="loading-message">Initializing form...</div>;

  return (
    <div className="create-event-page">
      {/* Toast */}
      {showToast && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      <div className="create-event-container">
        <div className="create-event-wrapper">
          <div className="create-event-header">
            <button className="back-button" onClick={() => navigate(`/organizer/event-details-modify/${eventId}`)}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="create-event-title">Modify Event</h1>
          </div>
          <div className="create-event-form-wrapper">
            <form className="create-event-form" onSubmit={handleSubmit}>
              
              <section className="form-section">
                <h2 className="section-title">Event Details</h2>
                <div className="form-group">
                  <label className="form-label">Event Title *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input"/>
                </div>
                <div className="form-grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Campus *</label>
                    <select name="campus" value={formData.campus} onChange={handleInputChange} className="form-input">
                      <option value="">Select Campus</option>
                      <option value="Polokwane">Polokwane</option>
                      <option value="Emalahleni">Emalahleni</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue Type *</label>
                    <select name="venueType" value={formData.venueType} onChange={handleInputChange} className="form-input">
                      <option value="">Select Venue Type</option>
                      <option value="AUDITORIUM">AUDITORIUM</option>
                      <option value="CLASSROOM">CLASSROOM</option>
                      <option value="HALL">HALL</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Guests Expected *</label>
                    <input type="number" name="expectedAttend" value={formData.expectedAttend} onChange={handleInputChange} className="form-input" min="1" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" className="form-textarea" />
                </div>
              </section>

              <VenueCardGallery selectedVenue={selectedVenue} setSelectedVenue={handleVenueSelect} campusFilter={formData.campus} venueTypeFilter={formData.venueType} minCapacity={formData.expectedAttend} />

              <section className="form-section">
                <h2 className="section-title">Program Schedule</h2>
                <div className="form-grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <DatePicker selected={dateParts.startDate} onChange={(date) => handleDateTimeChange('startDate', date)} className="form-input" dateFormat="yyyy-MM-dd" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input type="time" name="startTime" value={dateParts.startTime} onChange={(e) => handleDateTimeChange(e.target.name, e.target.value)} className="form-input"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <DatePicker selected={dateParts.endDate} onChange={(date) => handleDateTimeChange('endDate', date)} className="form-input" minDate={dateParts.startDate} dateFormat="yyyy-MM-dd" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input type="time" name="endTime" value={dateParts.endTime} onChange={(e) => handleDateTimeChange(e.target.name, e.target.value)} className="form-input"/>
                  </div>
                </div>
              </section>

              {formData.requestedResourcesAndServices && (
                <section className="form-section">
                  <h2 className="section-title">Services & Resources</h2>
                  <div className="form-grid grid-2">
                    {Object.entries(formData.requestedResourcesAndServices).map(([key, value]) => (
                      <div className="form-group" key={key}>
                        <label className="form-label">{key}</label>
                        {typeof value === "boolean" ? (
                          <select
                            name={key}
                            value={value ? "true" : "false"}
                            onChange={(e) =>
                              setFormData(prev => ({
                                ...prev,
                                requestedResourcesAndServices: {
                                  ...prev.requestedResourcesAndServices,
                                  [key]: e.target.value === "true"
                                }
                              }))
                            }
                            className="form-input"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            name={key}
                            value={value}
                            min="0"
                            onChange={(e) =>
                              setFormData(prev => ({
                                ...prev,
                                requestedResourcesAndServices: {
                                  ...prev.requestedResourcesAndServices,
                                  [key]: Number(e.target.value)
                                }
                              }))
                            }
                            className="form-input"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="form-section">
                <TermsCheckbox onDecision={setTermsAccepted} initialChecked={termsAccepted} />
              </section>

              <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
