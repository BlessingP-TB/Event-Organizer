// src/pages/ModifyEvent.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CreateEvent from './CreateEvent'; // Adjust path if needed

export default function ModifyEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching existing event data — replace with actual API call if needed
    const fetchEvent = async () => {
      try {
        // MOCKED DATA (Replace with real fetch)
        const mockEvent = {
          eventTitle: 'Annual Tech Summit',
          venueType: 'indoor',
          venue: 'Innovation Hall',
          campus: 'TUT Emalahleni',
          emailAddress: 'eventsupport@university.ac.za',
          telephone: '+27 12 345 6789',
          cell: '+27 84 123 4567',
          typeOfFunction: 'Academic related',
          typeOfGuests: ['VIP', 'Student only'],
          natureOfFunction: 'Tech Talk',
          purposeOfFunction: 'To introduce new tech trends',
          numberOfGuestsExpected: 120,
          dateOfCommencement: '2025-11-20',
          endingDate: '2025-11-20',
          timeOfCommencement: '10:00',
          timeToLockup: '16:00',
          useOfLiquor: 'No',
          kitchenFacilities: 'Yes',
          cleaningServices: 'Yes',
          steelTable: 4,
          examTables: 8,
          plasticChairs: 120,
          parkingPlaces: 5,
          laptop: 'Yes',
          sound: 'Yes',
          screen: 'Yes',
          videoConferencing: 'No',
          dataProjector: 'Yes',
          internetConnection: 'Yes',
          microphone: 'Yes',
          wifi: 'Yes',
          remarks: 'Please arrive early.',
          brandingImage: [],
          proofOfPayment: null,
        };

        setFormData(mockEvent);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching event:', error);
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleSubmit = (updatedData) => {
    // Replace with real PUT/PATCH request to update event in backend
    console.log('Modified Event Data:', updatedData);
    alert('Event updated successfully!');
    navigate(`/event/${id}`);
  };

  if (isLoading) return <p>Loading event data...</p>;

  return (
    <div className="container mt-4">
      <h2>Modify Event Details</h2>
      <CreateEvent
        initialData={formData}
        onSubmit={handleSubmit}
        mode="edit"
      />
    </div>
  );
}
