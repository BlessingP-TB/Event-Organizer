// app/hooks/organiser/useOrganiserVenue.js
import API_URL from '@/config';
import { useEffect, useState } from 'react';

// This hook fetches public venues without an Admin token
export const useOrganiserVenue = () => {
    const [venues, setVenues] = useState([]);

    const reload = async () => {
        try {
            // Use the public route from venue.validation.js
            const response = await fetch(`${API_URL}/venues/?page=1&pageSize=50`);

            if (!response.ok) throw new Error('Failed to fetch venues');

            const result = await response.json();
            setVenues(result.data || []);
        } catch (error) {
            console.error("Failed to load organiser venues:", error);
            setVenues([]);
        }
    };

    useEffect(() => {
        reload();
    }, []);

    return { venues, reload };
};