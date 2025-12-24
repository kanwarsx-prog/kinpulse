import React, { useState } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import CalendarGrid from './CalendarGrid';
import EventModal from './EventModal';
import './Calendar.css';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Get first and last day of current month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { events, createEvent, updateEvent, deleteEvent, loading } = useCalendar({
        startDate: firstDay,
        endDate: lastDay
    });

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setSelectedEvent(null);
        setShowEventModal(true);
    };

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    const handleCloseModal = () => {
        setShowEventModal(false);
        setSelectedDate(null);
        setSelectedEvent(null);
    };

    const handleSaveEvent = async (eventData) => {
        try {
            if (selectedEvent) {
                await updateEvent(selectedEvent.id, eventData);
            } else {
                await createEvent(eventData);
            }
            handleCloseModal();
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    const handleDeleteEvent = async () => {
        if (selectedEvent) {
            try {
                await deleteEvent(selectedEvent.id);
                handleCloseModal();
            } catch (error) {
                console.error('Error deleting event:', error);
            }
        }
    };

    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="calendar-container">
            <header className="calendar-header">
                <h1>Family Calendar</h1>
                <div className="calendar-controls">
                    <button onClick={goToPreviousMonth} className="nav-btn">←</button>
                    <button onClick={goToToday} className="today-btn">Today</button>
                    <button onClick={goToNextMonth} className="nav-btn">→</button>
                </div>
                <h2 className="month-year">{monthYear}</h2>
            </header>

            {loading ? (
                <div className="calendar-loading">Loading calendar...</div>
            ) : (
                <CalendarGrid
                    currentDate={currentDate}
                    events={events}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                />
            )}

            {showEventModal && (
                <EventModal
                    event={selectedEvent}
                    initialDate={selectedDate}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default Calendar;
