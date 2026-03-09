// src/pages/organizer/ConfirmModifiedDetails.jsx
import React from 'react';
import {
  ArrowLeft, Calendar, MapPin, Clock, Users, Building, Wine, Utensils,
  Sparkles, Monitor, Mic
} from 'lucide-react';
import "../../styles/pages/_confirmevent.scss";
import { useNavigate, useLocation } from 'react-router-dom';

export default function ConfirmModifiedDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get modified data from location state
  const modifiedData = location.state?.modifiedData;

  // 🟢 Event data preparation
  const eventData = modifiedData ? {
    eventTitle: modifiedData.eventTitle,
    eventType: modifiedData.typeOfFunction,
    purpose: modifiedData.purposeOfFunction,
    capacity: modifiedData.numberOfGuestsExpected,
    date: modifiedData.dateOfCommencement,
    venue: `${modifiedData.campus}, ${modifiedData.venue}`,
    time: `${modifiedData.timeOfCommencement} - ${modifiedData.timeToLockup}`,
    venueSelection: { buildings: [modifiedData.venue] },
    services: {
      liquor: modifiedData.useOfLiquor,
      kitchenFacilities: modifiedData.kitchenFacilities,
      cleaningServices: modifiedData.cleaningServices,
      extraSecurity: 'No',
    },
    resources: {
      chairs: modifiedData.plasticChairs,
      projectors: modifiedData.dataProjector === 'Yes' ? 1 : 0,
      microphones: modifiedData.microphone === 'Yes' ? 1 : 0,
      tables: modifiedData.steelTable + modifiedData.examTables,
    },
    headerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  } : {
    eventTitle: 'New Student Orientation',
    eventType: 'Social Event',
    purpose: 'Purpose of event is to introduce the students to the Campus',
    capacity: 150,
    date: 'Friday, October 27, 2024',
    venue: 'TUT Emalahleni Campus, Innovation Hall',
    time: '09:00 AM - 14:00 PM',
    venueSelection: { buildings: ['Building 16', 'Building 15'] },
    services: {
      liquor: 'Yes',
      kitchenFacilities: 'Yes',
      cleaningServices: 'Yes',
      extraSecurity: 'Yes',
    },
    resources: {
      chairs: 150,
      projectors: 3,
      microphones: 3,
      tables: 12,
    },
    headerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  };

  // ✅ Handle submission + create admin notification
  const handleSubmit = () => {
    // 1️⃣ Update the organizer’s local submitted events
    if (modifiedData) {
      const submittedEvents = JSON.parse(localStorage.getItem('submittedEvents') || '[]');
      const updatedEvents = submittedEvents.map(event =>
        event.id === modifiedData.id
          ? { ...event, ...modifiedData, status: 'Pending Review' }
          : event
      );
      localStorage.setItem('submittedEvents', JSON.stringify(updatedEvents));
    }

    // 2️⃣ Notify ADMIN (not the organizer)
    const adminNotifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
    const newAdminNotification = {
      id: `admin-notif-${Date.now()}`,
      title: "Event Modification Pending Review",
      message: `An organizer has modified the event "${eventData.eventTitle}". Please review the changes.`,
      timestamp: new Date().toLocaleString(),
      read: false,
    };

    const updatedAdminNotifications = [newAdminNotification, ...adminNotifications];
    localStorage.setItem('adminNotifications', JSON.stringify(updatedAdminNotifications));

    // 3️⃣ Dispatch event so the AdminSidebar updates live
    window.dispatchEvent(new Event("adminNotificationsUpdated"));

    // 4️⃣ Feedback for the organizer
    alert(`✅ Modification for "${eventData.eventTitle}" has been submitted for admin review.`);

    // 5️⃣ Navigate back
    navigate("/organizer/my-events");
  };

  return (
    <div className="confirm-event-page">
      <div className="confirm-event-container">
        {/* Header */}
        <div className="confirm-event-header">
          <button
            className="back-button"
            type="button"
            aria-label="Go back"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="page-title">Details</h1>
        </div>

        {/* Main Card */}
        <div className="confirm-event-card">
          <div className="event-header-image">
            <img src={eventData.headerImage} alt="Event header" />
          </div>

          <div className="confirm-event-content">
            {/* Event Details */}
            <section className="confirm-section">
              <h2 className="section-title">Event Details</h2>
              <h3 className="section-subtitle">{eventData.eventTitle}</h3>

              <div className="detail-list">
                <div className="detail-item"><Users size={18} /><span>Type - {eventData.eventType}</span></div>
                <div className="detail-item"><Building size={18} /><span>{eventData.purpose}</span></div>
                <div className="detail-item"><Users size={18} /><span>Capacity - {eventData.capacity}</span></div>
                <div className="detail-item"><Calendar size={18} /><span>{eventData.date}</span></div>
                <div className="detail-item"><MapPin size={18} /><span>{eventData.venue}</span></div>
                <div className="detail-item"><Clock size={18} /><span>{eventData.time}</span></div>
              </div>
            </section>

            {/* Venue Selection */}
            <section className="confirm-section">
              <h2 className="section-title">Venue Selection</h2>
              <div className="detail-item">
                <Building size={18} />
                <span>{eventData.venueSelection.buildings.join(', ')}</span>
              </div>
            </section>

            {/* Services */}
            <section className="confirm-section">
              <h2 className="section-title">Service Required</h2>
              <div className="detail-list">
                <div className="detail-item"><Wine size={18} /><span>Liquor - {eventData.services.liquor}</span></div>
                <div className="detail-item"><Utensils size={18} /><span>Kitchen - {eventData.services.kitchenFacilities}</span></div>
                <div className="detail-item"><Sparkles size={18} /><span>Cleaning - {eventData.services.cleaningServices}</span></div>
                <div className="detail-item"><Building size={18} /><span>Extra security - {eventData.services.extraSecurity}</span></div>
              </div>
            </section>

            {/* Resources */}
            <section className="confirm-section">
              <h2 className="section-title">Resource Catalogue</h2>
              <div className="detail-list">
                <div className="detail-item"><Users size={18} /><span>{eventData.resources.chairs} chairs</span></div>
                <div className="detail-item"><Monitor size={18} /><span>{eventData.resources.projectors} projectors</span></div>
                <div className="detail-item"><Mic size={18} /><span>{eventData.resources.microphones} microphones</span></div>
                <div className="detail-item"><Building size={18} /><span>{eventData.resources.tables} tables</span></div>
              </div>
            </section>

            {/* ✅ Submit Button */}
            <div className="submit-button-container">
              <button
                className="btn-submit"
                type="button"
                onClick={handleSubmit}
              >
                Submit Modification
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
