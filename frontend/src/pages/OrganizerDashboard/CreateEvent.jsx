// src/pages/CreateEvent.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import VenueCardGallery from '../../components/VenueCardGallery';
import TermsCheckbox from '../../components/TermsCheckbox';
import "../../styles/pages/_createevent.scss";
import { useNavigate } from 'react-router-dom';

/**
 * Constants
 */
const eventTypes = ["Official", "Academic related", "Private", "External", "Student"];
const guestTypes = ["VIP", "Media", "Staff", "Student", "Special protocol required"];
const KNOWN_SERVICES = ['Liquor', 'Kitchen Facilities', 'Cleaning Services', 'Extra Security Guard'];

/**
 * Utility helpers
 */
const combineDateTime = (date, time) => {
  if (!date || !time) return "";
  const [hours, minutes] = time.split(':');
  const combined = new Date(date);
  combined.setHours(parseInt(hours, 10));
  combined.setMinutes(parseInt(minutes, 10));
  combined.setSeconds(0, 0);
  return combined.toISOString();
};

const getDateStr = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAvailableTimeSlots = (calendarData, venueId, date) => {
  if (!calendarData || !venueId || !date) return [];
  const selectedDateStr = getDateStr(date);
  return calendarData
    .filter(slot =>
      Array.isArray(slot.venueIds) &&
      slot.venueIds.includes(venueId) &&
      slot.date.substring(0, 10) === selectedDateStr
    )
    .map(slot => ({
      startTime: slot.startTime,
      endTime: slot.endTime
    }));
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const toastTimerRef = useRef(null);

  // Selected data
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [selectedGuestTypes, setSelectedGuestTypes] = useState([]);

  // UI state
  const [errors, setErrors] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [calendarData, setCalendarData] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

  // Date parts
  const [dateParts, setDateParts] = useState({
    startDate: null,
    startTime: '',
    endDate: null,
    endTime: ''
  });

  // formData
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    expectedAttend: '',
    venueId: "",
    organizerId: "",
    purposeOfFunction: '',
    campus: '',
    venueType: '',
    themeId: null,
    status: "DRAFT",
    isFree: true,
    ticketRequired: true,
    autoDistribute: true,
    allowAttendeePurchase: false,
    logo: null,
    themeImage: null,
  });

  // resources state
  const [resources, setResources] = useState({});

  // Initialize user organizer id
  useEffect(() => {
    try {
      const storedUserJSON = localStorage.getItem('user');
      if (storedUserJSON) {
        const user = JSON.parse(storedUserJSON);
        if (user && user.id) setFormData(prev => ({ ...prev, organizerId: user.id }));
      }
    } catch (err) {
      console.error('Failed to parse user data from localStorage', err);
    }
  }, []);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Authentication token missing.');
        const res = await fetch('http://localhost:3000/admin/calendars', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        setCalendarData(json.data || json || []);
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
        showToastMessage('Failed to load calendar data');
      }
    };
    fetchCalendarData();
  }, []);

  useEffect(() => {
    const fetchTools = async () => {
      setIsLoadingTools(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Authentication token missing.');
        const res = await fetch('http://localhost:3000/tools', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        const tools = json.data || json || [];
        const toolNames = Array.isArray(tools) ? tools.map(t => t.name).filter(Boolean) : [];

        const initialResources = {};
        toolNames.forEach(name => {
          initialResources[name] = 0;
        });
        KNOWN_SERVICES.forEach(s => {
          if (!Object.prototype.hasOwnProperty.call(initialResources, s)) {
            initialResources[s] = false;
          }
        });

        setResources(initialResources);
      } catch (err) {
        console.error('Failed to fetch tools:', err);
        showToastMessage('Failed to load resources list');
        const fallback = {};
        KNOWN_SERVICES.forEach(s => fallback[s] = false);
        setResources(fallback);
      } finally {
        setIsLoadingTools(false);
      }
    };
    fetchTools();
  }, []);

  const handleVenueSelect = useCallback((venue) => {
    setSelectedVenue(venue);
    setFormData(prev => ({ ...prev, venueId: venue?.id || '' }));
    setDateParts({
      startDate: null,
      startTime: '',
      endDate: null,
      endTime: ''
    });
    setAvailableTimeSlots([]);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'campus' || name === 'venueType') {
        setSelectedVenue(null);
        updated.venueId = '';
        setDateParts({
          startDate: null,
          startTime: '',
          endDate: null,
          endTime: ''
        });
        setAvailableTimeSlots([]);
      }
      return updated;
    });
  }, []);

  const handleDateTimeChange = useCallback((name, value) => {
    setDateParts(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'startDate' && selectedVenue) {
      setIsLoadingTimeSlots(true);
      const slots = getAvailableTimeSlots(calendarData, selectedVenue.id, value);
      setAvailableTimeSlots(slots);
      setIsLoadingTimeSlots(false);
      setDateParts(prev => ({ ...prev, startTime: '', endTime: '' }));
    }
  }, [calendarData, selectedVenue, errors]);

  const handleResourceChange = (resourceName, newValue) => {
    setResources(prev => {
      const isService = KNOWN_SERVICES.includes(resourceName);
      let normalized;
      if (isService) {
        if (typeof newValue === 'boolean') normalized = newValue;
        else if (typeof newValue === 'string') normalized = newValue === 'true';
        else normalized = !!newValue;
      } else {
        if (typeof newValue === 'string') normalized = parseInt(newValue, 10) || 0;
        else if (typeof newValue === 'number') normalized = Math.max(0, Math.floor(newValue));
        else normalized = 0;
      }
      return { ...prev, [resourceName]: normalized };
    });
  };

  const handleEventTypeToggle = (type) => {
    setSelectedEventTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGuestTypeToggle = (type) => {
    setSelectedGuestTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 5000);
  };

  const filterDate = (date) => {
    if (!selectedVenue) return true;
    const selectedDateStr = getDateStr(date);
    return calendarData.some(slot =>
      Array.isArray(slot.venueIds) &&
      slot.venueIds.includes(selectedVenue.id) &&
      slot.date.substring(0, 10) === selectedDateStr
    );
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Event title is required';
    if (!formData.campus) newErrors.campus = 'Please select a campus';
    if (!formData.venueType) newErrors.venueType = 'Please select a venue type';
    if (!formData.expectedAttend || Number(formData.expectedAttend) <= 0) newErrors.expectedAttend = 'Please enter a valid number of guests';
    if (!dateParts.startDate) newErrors.startDate = 'Start date is required';
    if (!dateParts.startTime) newErrors.startTime = 'Start time is required';
    if (!dateParts.endDate) newErrors.endDate = 'End date is required';
    if (!dateParts.endTime) newErrors.endTime = 'End time is required';
    if (!selectedVenue) newErrors.venueSelection = 'Please select a venue from the gallery';
    if (selectedEventTypes.length === 0) newErrors.eventType = 'Please select at least one type of function';
    if (selectedGuestTypes.length === 0) newErrors.guestType = 'Please select at least one type of guest';

    if (selectedVenue && dateParts.startDate) {
      const selectedDateStr = getDateStr(dateParts.startDate);
      const isAvailable = calendarData.some(slot =>
        Array.isArray(slot.venueIds) &&
        slot.venueIds.includes(selectedVenue.id) &&
        slot.date.substring(0, 10) === selectedDateStr
      );
      if (!isAvailable) newErrors.startDate = 'Selected date is not available for this venue';
    }

    if (selectedVenue && dateParts.startDate && dateParts.startTime && dateParts.endTime) {
      const availableSlots = getAvailableTimeSlots(calendarData, selectedVenue.id, dateParts.startDate);
      const match = availableSlots.some(slot =>
        slot.startTime === dateParts.startTime && slot.endTime === dateParts.endTime
      );
      if (!match) newErrors.startTime = 'Selected time is not available for this venue';
    }

    if (!termsAccepted) newErrors.terms = 'You must accept the terms and conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToastMessage('Please fill out all required fields before submitting');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const numericResourcesArray = [];
    const servicesObject = {};

    Object.entries(resources).forEach(([name, value]) => {
      if (KNOWN_SERVICES.includes(name)) {
        servicesObject[name] = !!value;
      } else {
        const qty = parseInt(value, 10) || 0;
        if (qty > 0) numericResourcesArray.push({ name, quantity: qty });
      }
    });

    // Build services object with boolean flags
const enhancedServices = { ...servicesObject };

// Add event type flags
eventTypes.forEach(type => {
  enhancedServices[`Type of Function - ${type}`] = selectedEventTypes.includes(type);
});

// Add guest type flags
guestTypes.forEach(type => {
  enhancedServices[`Type of Guest - ${type}`] = selectedGuestTypes.includes(type);
});

const finalPayload = {
  ...formData,
  startDateTime: combineDateTime(dateParts.startDate, dateParts.startTime),
  endDateTime: combineDateTime(dateParts.endDate, dateParts.endTime),
  expectedAttend: Number(formData.expectedAttend),
  resources: numericResourcesArray,
  services: enhancedServices, // ✅ Now all values are booleans
};

    console.log("DEBUG: Submitting finalPayload to backend:", finalPayload);

    const serializablePayload = JSON.parse(JSON.stringify(finalPayload));

    navigate('/organizer/confirm-event', {
      state: {
        formData: serializablePayload,
        selectedVenue,
        termsAccepted,
        themeImage: formData.themeImage
      }
    });
  };

  // Group resources for UI
  const toolResources = {};
  const serviceResources = {};
  Object.entries(resources).forEach(([name, value]) => {
    if (KNOWN_SERVICES.includes(name)) serviceResources[name] = !!value;
    else toolResources[name] = typeof value === 'number' ? value : parseInt(value, 10) || 0;
  });

  return (
    <div className="create-event-page">
      <div className="create-event-container">
        <div className="create-event-wrapper">
          <div className="create-event-header">
            <button className="back-button" onClick={() => navigate('/organizer')}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="create-event-title">Create Event</h1>
          </div>

          <div className="create-event-form-wrapper">
            <form className="create-event-form" onSubmit={handleSubmit}>
              {/* Event Details */}
              <section className="form-section">
                <h2 className="section-title">Event Details</h2>
                <div className="form-group">
                  <label className="form-label">Event Title *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter Event Title"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                  {errors.name && <p className="error-message">{errors.name}</p>}
                </div>

                <div className="form-grid grid-3">
                  <div className="form-group">
                    <label className="form-label">Campus *</label>
                    <select
                      name="campus"
                      value={formData.campus}
                      onChange={handleInputChange}
                      className={`form-input ${errors.campus ? 'error' : ''}`}
                    >
                      <option value="">Select Campus</option>
                      <option value="Polokwane">Polokwane</option>
                      <option value="Emalahleni">Emalahleni</option>
                    </select>
                    {errors.campus && <p className="error-message">{errors.campus}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Venue Type *</label>
                    <select
                      name="venueType"
                      value={formData.venueType}
                      onChange={handleInputChange}
                      className={`form-input ${errors.venueType ? 'error' : ''}`}
                    >
                      <option value="">Select Venue Type</option>
                      <option value="AUDITORIUM">AUDITORIUM</option>
                      <option value="CLASSROOM">CLASSROOM</option>
                      <option value="HALL">HALL</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                    {errors.venueType && <p className="error-message">{errors.venueType}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Number of Guests Expected *</label>
                    <input
                      type="number"
                      name="expectedAttend"
                      value={formData.expectedAttend}
                      onChange={handleInputChange}
                      placeholder="0"
                      className={`form-input ${errors.expectedAttend ? 'error' : ''}`}
                      min="1"
                    />
                    {errors.expectedAttend && <p className="error-message">{errors.expectedAttend}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose of Function</label>
                  <input
                    type="text"
                    name="purposeOfFunction"
                    value={formData.purposeOfFunction}
                    onChange={handleInputChange}
                    placeholder="e.g., Workshop, Seminar, Celebration"
                    className="form-input"
                  />
                </div>

                {/* Type of Function */}
                <section className="form-section">
                  <h2 className="section-title">Type of Function *</h2>
                  <div className="form-grid grid-2">
                    {eventTypes.map(type => (
                      <div key={type} className="form-group service-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedEventTypes.includes(type)}
                            onChange={() => handleEventTypeToggle(type)}
                          />
                          {` ${type}`}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.eventType && <p className="error-message">{errors.eventType}</p>}
                </section>

                {/* Type of Guest */}
                <section className="form-section">
                  <h2 className="section-title">Type of Guest *</h2>
                  <div className="form-grid grid-2">
                    {guestTypes.map(type => (
                      <div key={type} className="form-group service-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedGuestTypes.includes(type)}
                            onChange={() => handleGuestTypeToggle(type)}
                          />
                          {` ${type}`}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.guestType && <p className="error-message">{errors.guestType}</p>}
                </section>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide a brief description of the event..."
                    rows="4"
                    className="form-textarea"
                  />
                </div>
              </section>

              {/* Venue Gallery */}
              <VenueCardGallery
                selectedVenue={selectedVenue}
                setSelectedVenue={handleVenueSelect}
                campusFilter={formData.campus}
                venueTypeFilter={formData.venueType}
                minCapacity={formData.expectedAttend}
                setFormData={setFormData}
              />
              {errors.venueSelection && <p className="error-message center-text">{errors.venueSelection}</p>}

              {/* Program Schedule */}
              <section className="form-section program-schedule">
                <h2 className="section-title">Program Schedule</h2>
                <div className="form-grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <DatePicker
                      selected={dateParts.startDate}
                      onChange={(date) => handleDateTimeChange('startDate', date)}
                      className={`form-input ${errors.startDate ? 'error' : ''}`}
                      placeholderText="Select start date"
                      filterDate={filterDate}
                      dateFormat="yyyy-MM-dd"
                    />
                    {errors.startDate && <p className="error-message">{errors.startDate}</p>}

                    {selectedVenue && dateParts.startDate && (
                      <p className="available-time-label">Available times for {dateParts.startDate.toDateString()}:</p>
                    )}

                    {selectedVenue && dateParts.startDate && availableTimeSlots.length > 0 && (
                      <div className="available-time-slots">
                        {isLoadingTimeSlots ? (
                          <p>Loading available times...</p>
                        ) : (
                          availableTimeSlots.map((slot, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`time-slot-btn ${dateParts.startTime === slot.startTime && dateParts.endTime === slot.endTime ? 'active' : ''}`}
                              onClick={() => {
                                setDateParts(prev => ({
                                  ...prev,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime
                                }));
                                setErrors(prev => ({ ...prev, startTime: '', endTime: '' }));
                              }}
                            >
                              {slot.startTime} - {slot.endTime}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {selectedVenue && dateParts.startDate && availableTimeSlots.length === 0 && !isLoadingTimeSlots && (
                      <p className="no-available-times">No available time slots for this date</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="time"
                      name="startTime"
                      value={dateParts.startTime}
                      onChange={(e) => handleDateTimeChange('startTime', e.target.value)}
                      className={`form-input ${errors.startTime ? 'error' : ''}`}
                      disabled={!dateParts.startDate}
                    />
                    {errors.startTime && <p className="error-message">{errors.startTime}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <DatePicker
                      selected={dateParts.endDate}
                      onChange={(date) => handleDateTimeChange('endDate', date)}
                      className={`form-input ${errors.endDate ? 'error' : ''}`}
                      placeholderText="Select end date"
                      filterDate={(date) => {
                        if (!selectedVenue) return true;
                        const selectedDateStr = getDateStr(date);
                        return calendarData.some(slot =>
                          Array.isArray(slot.venueIds) &&
                          slot.venueIds.includes(selectedVenue.id) &&
                          slot.date.substring(0, 10) === selectedDateStr
                        );
                      }}
                      minDate={dateParts.startDate || new Date()}
                      dateFormat="yyyy-MM-dd"
                    />
                    {errors.endDate && <p className="error-message">{errors.endDate}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      value={dateParts.endTime}
                      onChange={(e) => handleDateTimeChange('endTime', e.target.value)}
                      className={`form-input ${errors.endTime ? 'error' : ''}`}
                      disabled={!dateParts.endDate}
                    />
                    {errors.endTime && <p className="error-message">{errors.endTime}</p>}
                  </div>
                </div>
              </section>

              {/* Resources */}
              <section className="form-section">
                <h2 className="section-title">Resources Required</h2>
                {isLoadingTools ? (
                  <p>Loading resources...</p>
                ) : (
                  <>
                    {Object.keys(toolResources).length > 0 && (
                      <div className="form-grid grid-3 resources-grid">
                        {Object.entries(toolResources).map(([resName, resValue]) => (
                          <div key={resName} className="form-group resource-box">
                            <label className="form-label">{resName}</label>
                            <div className="number-input">
                              <button type="button" className="number-btn" onClick={() => handleResourceChange(resName, Math.max(0, resValue - 1))}>-</button>
                              <span className="number-display">{resValue}</span>
                              <button type="button" className="number-btn" onClick={() => handleResourceChange(resName, resValue + 1)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {Object.keys(serviceResources).length > 0 && (
                      <div className="form-grid grid-2 checkbox-services-grid">
                        {Object.entries(serviceResources).map(([serviceName, serviceValue]) => (
                          <div key={serviceName} className="form-group service-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                checked={!!serviceValue}
                                onChange={(e) => handleResourceChange(serviceName, e.target.checked)}
                              />
                              {` ${serviceName}`}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Terms */}
              <section className="form-section">
                <TermsCheckbox onDecision={(accepted) => { setTermsAccepted(accepted); if (errors.terms) setErrors(prev => ({ ...prev, terms: '' })); }} />
                {errors.terms && <p className="error-message">{errors.terms}</p>}
              </section>

              <div className="form-footer">
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>

            {showToast && (
              <div className="bottom-toast" role="status" aria-live="polite">
                <div className="bottom-toast-inner">
                  <span className="toast-message">{toastMessage}</span>
                  <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setShowToast(false)}>×</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}