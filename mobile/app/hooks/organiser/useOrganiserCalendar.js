// app/hooks/organiser/useOrganiserCalendar.js
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { getOrganiserCalendarDates } from '../../data/Organiser/calendarApi';

export const useOrganiserCalendar = () => {
    const [rawCalendar, setRawCalendar] = useState([]);
    const [markedDates, setMarkedDates] = useState({});
    const [loading, setLoading] = useState(true);

    const loadDates = async () => {
        setLoading(true);
        try {
            const data = await getOrganiserCalendarDates();

            setRawCalendar(data || []);

            const marked = {};
            data?.forEach(entry => {
                const isoDate = entry.date;
                const dateStr = isoDate.split('T')[0];

                marked[dateStr] = {
                    marked: true,
                    dotColor: '#0077B6',
                };
            });

            setMarkedDates(marked);
        } catch (err) {
            console.error('Calendar load error:', err);
            setRawCalendar([]);
            setMarkedDates({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDates();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDates();
        }, [])
    );

    const isVenueAvailable = (venueId, dateStr, startTime, endTime) => {
        if (!venueId || !dateStr) return false;

        return rawCalendar.some(entry => {
            const entryDate = entry.date.split('T')[0];
            const matchesDate = entryDate === dateStr;

            const matchesVenue = entry.venueIds?.includes(String(venueId));

            const matchesTime =
                startTime >= entry.startTime &&
                endTime <= entry.endTime;

            return matchesDate && matchesVenue && matchesTime;
        });
    };

    return {
        rawCalendar,
        markedDates,
        loading,
        reload: loadDates,
        isVenueAvailable,
    };
};
