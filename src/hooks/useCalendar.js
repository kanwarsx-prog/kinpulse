import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

export const useCalendar = ({ startDate, endDate }) => {
    const { supabase, user } = useSupabase();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const toLocalISOString = (date) => {
        const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return d.toISOString();
    };

    useEffect(() => {
        if (!user?.family_id || !startDate || !endDate) return;

        fetchEvents();
        subscribeToEvents();

        return () => {
            // Cleanup subscription
        };
    }, [user?.family_id, startDate, endDate]);

    const fetchEvents = async () => {
        if (!user?.family_id) return;

        try {
            const startIso = toLocalISOString(startDate);
            const endIso = toLocalISOString(endDate);
            const { data, error } = await supabase
                .from('events')
                .select('*, created_by_profile:profiles!created_by(id, name, email)')
                .eq('family_id', user.family_id)
                .or(
                    [
                        `and(start_time.gte.${startIso},start_time.lte.${endIso})`,
                        `and(end_time.gte.${startIso},end_time.lte.${endIso})`,
                        `and(start_time.lte.${startIso},end_time.gte.${startIso})`,
                        `and(start_time.lte.${startIso},end_time.is.null)`
                    ].join(',')
                )
                .order('start_time', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToEvents = () => {
        const channel = supabase
            .channel('calendar-events')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'events',
                    filter: `family_id=eq.${user.family_id}`
                },
                () => {
                    fetchEvents();
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const createEvent = async (eventData) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .insert([{
                    ...eventData,
                    family_id: user.family_id,
                    created_by: user.id
                }])
                .select()
                .single();

            if (error) throw error;
            fetchEvents();
            return data;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    };

    const updateEvent = async (eventId, updates) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .update(updates)
                .eq('id', eventId)
                .select()
                .single();

            if (error) throw error;
            fetchEvents();
            return data;
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    };

    const deleteEvent = async (eventId) => {
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    };

    const getEventsForDate = (date) => {
        const dateStr = toLocalISOString(date).split('T')[0];
        return events.filter(event => {
            const eventDate = (event.start_time || '').slice(0, 10);
            return eventDate === dateStr;
        });
    };

    const getUpcomingEvents = (days = 7) => {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);

        return events.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate >= now && eventDate <= future;
        });
    };

    return {
        events,
        loading,
        createEvent,
        updateEvent,
        deleteEvent,
        getEventsForDate,
        getUpcomingEvents,
        refresh: fetchEvents
    };
};
