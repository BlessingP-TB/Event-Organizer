// app/hooks/organiser/useEventDetails.js
import { useEffect, useState } from 'react';
import { getOrganiserEventById } from '../../data/Organiser/myEvents';

export const useEventDetails = (eventId) => {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadEvent = async () => {
        if (!eventId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Call the API function we built to get one event
            const loadedEvent = await getOrganiserEventById(eventId);
            setEvent(loadedEvent);
        } catch (e) {
            console.error(e);
            setEvent(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvent();
    }, [eventId]); // Reload if the eventId ever changes

    return { event, loading, reload: loadEvent };
};