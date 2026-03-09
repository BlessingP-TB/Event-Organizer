// src/pages/AdminCalendar.jsx
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../../styles/pages/_admincalendar.scss";
import useAdminCalendar from "../../hooks/Admin/useCalendar";

export default function AdminCalendar() {
  const { availableDates, approvedEvents, venues, addDates, updateDate, deleteDate, reload } = useAdminCalendar();

  const [events, setEvents] = useState({});
  const [tempDates, setTempDates] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [availableModalVisible, setAvailableModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAvailableSlots, setSelectedAvailableSlots] = useState([]);
  const [approvedModalVisible, setApprovedModalVisible] = useState(false);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);

  // Merge dots for calendar tiles - Updated to handle date comparison correctly
  const getMergedDots = (date) => {
    // Format the 'date' object (passed by the calendar for the specific tile) to YYYY-MM-DD string in the *local* timezone
    // This ensures it matches the format of the date strings stored in availableDates/approvedEvents
    const tileDateStr = date.getFullYear() + '-' + 
                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(date.getDate()).padStart(2, '0');

    // Compare the formatted tile date string directly with the stored date strings
    const approvedDot = approvedEvents.some(e => e.date === tileDateStr)
      ? [{ key: `approved-${tileDateStr}`, color: "red" }]
      : [];
    const availableDot = availableDates.some(d => d.date === tileDateStr)
      ? [{ key: `available-${tileDateStr}`, color: "blue" }]
      : [];
    const tempDot = tempDates.some(d => d.date === tileDateStr)
      ? [{ key: `temp-${tileDateStr}`, color: "orange" }]
      : [];

    return [...approvedDot, ...availableDot, ...tempDot];
  };

  // Build calendar markings
  useEffect(() => {
    const allDates = [
      ...approvedEvents.map(e => e.date).filter(Boolean),
      ...availableDates.map(d => d.date),
      ...tempDates.map(d => d.date),
    ];

    const marks = {};
    allDates.forEach((dateStr) => {
      const dateObj = new Date(dateStr);
      const dots = getMergedDots(dateObj); // This function now correctly formats the dateObj passed to it

      if (dots.length > 0) {
        const approvedEvent = approvedEvents.find(e => e.date === dateStr);
        const availableSlots = availableDates.filter(d => d.date === dateStr);
        const temp = tempDates.find(d => d.date === dateStr);

        marks[dateStr] = {
          dots,
          ...(approvedEvent ? { event: approvedEvent } : {}),
          ...(availableSlots.length > 0 ? { availableSlots } : {}),
          ...(temp ? { temp } : {}),
        };
      }
    });

    const formattedMarks = {};
    Object.entries(marks).forEach(([date, val]) => {
      formattedMarks[date] = {
        dots: val.dots.map(dot => ({ key: dot.key, color: dot.color })),
        marked: val.dots.length > 0,
        ...val,
        selected: false,
      };
    });

    setEvents(formattedMarks);
  }, [approvedEvents, availableDates, tempDates]);

  // Handle day click
  const handleDayClick = (date) => {
    // Format the date object to YYYY-MM-DD string in the local timezone
    // This prevents the day from shifting if the local time is behind UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // ... (rest of the logic remains the same, using the correctly formatted dateStr)
    const eventData = events[dateStr];
    const event = eventData?.event;
    const availableSlots = eventData?.availableSlots;

    if (event) {
      setSelectedEvent(event);
      setApprovedModalVisible(true);
      return;
    }

    if (availableSlots && availableSlots.length > 0) {
      setSelectedAvailableSlots(availableSlots);
      setSelectedVenueIds(availableSlots[0].venueIds || []);
      setAvailableModalVisible(true);
      return;
    }

    if (multiSelectMode) {
      setTempDates(prev => {
        const exists = prev.find(d => d.date === dateStr);
        return exists
          ? prev.filter(d => d.date !== dateStr)
          : [...prev, { date: dateStr, startTime: "", endTime: "", venueIds: [] }];
      });
    } else {
      setTempDates([{ date: dateStr, startTime: "", endTime: "", venueIds: [] }]);
      setSelectedAvailableSlots([]);
      setSelectedVenueIds([]);
      setAvailableModalVisible(true);
    }
  };

  // Update date/time
  const updateDateTime = (date, field, value) => {
    setTempDates(prev => prev.map(d => (d.date === date ? { ...d, [field]: value } : d)));
    setSelectedAvailableSlots(prev => prev.map(d => (d.date === date ? { ...d, [field]: value } : d)));
  };

  // Toggle venue selection
  const toggleVenueSelection = (venueId) => {
    setSelectedVenueIds(prev =>
      prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
  };

  // Save available dates
  const handleSaveAvailableDates = async () => {
    if (selectedVenueIds.length === 0) {
      alert("Please select at least one venue.");
      return;
    }

    try {
      let slotsToSave = [];

      if (selectedAvailableSlots.length > 0) {
        slotsToSave = selectedAvailableSlots.map(s => ({ ...s, venueIds: selectedVenueIds }));
        await Promise.all(slotsToSave.map(slot => updateDate(slot)));
      } else {
        slotsToSave = tempDates.map(d => ({
          date: d.date,
          startTime: d.startTime,
          endTime: d.endTime,
          venueIds: selectedVenueIds,
        }));
        await addDates(slotsToSave);
      }

      setAvailableModalVisible(false);
      setMultiSelectMode(false);
      setTempDates([]);
      setSelectedAvailableSlots([]);
      setSelectedVenueIds([]);
      reload();
    } catch (err) {
      console.error(err);
      alert("Failed to save dates.");
    }
  };

  // Delete available slot
  const handleDeleteAvailableDate = async (date) => {
    const slotToDelete = selectedAvailableSlots.find(d => d.date === date);
    if (!slotToDelete) {
      alert("Could not find slot ID to delete.");
      return;
    }

    await deleteDate(slotToDelete.date, slotToDelete.startTime, slotToDelete.endTime);
    setAvailableModalVisible(false);
    setSelectedAvailableSlots([]);
    reload();
  };

  // Calendar tile content - Updated to use consistent date formatting
  const getTileContent = ({ date }) => {
    // Use the same formatting logic as getMergedDots to ensure consistency
    const tileDateStr = date.getFullYear() + '-' + 
                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(date.getDate()).padStart(2, '0');

    const dots = events[tileDateStr]?.dots || []; // Compare against the correctly formatted string
    if (dots.length === 0) return null;

    return (
      <div className="dot-container">
        <div className="dots-wrapper">
          {dots.map(dot => (
            <span key={dot.key} className="dot" style={{ backgroundColor: dot.color }} />
          ))}
        </div>
      </div>
    );
  };

  const getModalDates = () => (selectedAvailableSlots.length > 0 ? selectedAvailableSlots : tempDates);

  return (
    <div className="admin-calendar-container">
      <h2>Admin Calendar - Available Dates</h2>

      <div className="action-buttons">
        <button
          className={`action-button ${multiSelectMode ? "selected" : ""}`}
          onClick={() => setMultiSelectMode(!multiSelectMode)}
        >
          Select More
        </button>

        {multiSelectMode && tempDates.length > 0 && (
          <button
            className="action-button"
            onClick={() => {
              setSelectedVenueIds([]);
              setSelectedAvailableSlots([]);
              setAvailableModalVisible(true);
            }}
          >
            Add
          </button>
        )}
      </div>

      <Calendar
        onClickDay={handleDayClick}
        tileContent={getTileContent}
        tileClassName={({ date }) => {
          // Use the same consistent date formatting here too
          const tileDateStr = date.getFullYear() + '-' + 
                              String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(date.getDate()).padStart(2, '0');
          return (events[tileDateStr] ? "tile-marked" : "");
        }}
      />

      {/* Approved Event Modal */}
      {approvedModalVisible && (
        <div className="modal-container" onClick={() => setApprovedModalVisible(false)}>
          <div className="modal-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <h3>Event Details</h3>
              {selectedEvent && (
                <>
                  <p><strong>{selectedEvent.title}</strong></p>
                  <p>Time: {selectedEvent.startTime} - {selectedEvent.endTime}</p>
                  <p>Venue: {selectedEvent.location || selectedEvent.venueIds?.join(", ")}</p>
                </>
              )}
              <button className="modal-button" style={{ backgroundColor: "gray" }} onClick={() => setApprovedModalVisible(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Available Dates Modal */}
      {availableModalVisible && (
        <div className="modal-container" onClick={() => {
          setAvailableModalVisible(false);
          setSelectedAvailableSlots([]);
          setMultiSelectMode(false);
          setTempDates([]);
          setSelectedVenueIds([]);
        }}>
          <div className="modal-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <h3>Set Availability</h3>

              {/* Venue Selection */}
              <div className="venue-selection">
                <p className="venue-label">Select venues available on these dates:</p>
                {venues.map((venue) => (
                  <button
                    key={venue.id}
                    className={`venue-option ${selectedVenueIds.includes(venue.id) ? "selected" : ""}`}
                    onClick={() => toggleVenueSelection(venue.id)}
                  >
                    {venue.name}
                  </button>
                ))}
              </div>

              {/* Date Sections */}
              {getModalDates().map(d => (
                <div key={d.date + (d.id || "new")} className="date-section">
                  <p className="date-label">{d.date} </p>
                  <input type="time" value={d.startTime || ""} onChange={e => updateDateTime(d.date, "startTime", e.target.value)} className="time-input" />
                  <input type="time" value={d.endTime || ""} onChange={e => updateDateTime(d.date, "endTime", e.target.value)} className="time-input" />

                  {d.id && (
                    <button className="delete-slot-button"  onClick={() => handleDeleteAvailableDate(d.date)}>
                      Delete Slot
                    </button>
                  )}
                </div>
              ))}

              {getModalDates().length === 0 && <p className="no-dates-message">No dates selected for editing.</p>}

              <div className="modal-buttons">
                <button className="modal-button" style={{ backgroundColor: "#0077B6" }} onClick={handleSaveAvailableDates} disabled={getModalDates().length === 0}>
                  Save
                </button>
                <button className="modal-button" style={{ backgroundColor: "gray" }} onClick={() => {
                  setAvailableModalVisible(false);
                  setSelectedAvailableSlots([]);
                  setMultiSelectMode(false);
                  setTempDates([]);
                  setSelectedVenueIds([]);
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}