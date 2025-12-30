import React from 'react';
import './CalendarGrid.css';

const CalendarGrid = ({ currentDate, events, onDateClick, onEventClick }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and how many days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Build calendar grid
    const days = [];
    const toLocalDateStr = (d) => {
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().split('T')[0];
    };
    const todayStr = toLocalDateStr(new Date());

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = toLocalDateStr(date);
        const isToday = dateStr === todayStr;

        // Get events for this day
        const dayEvents = events.filter(event => {
            const eventDate = (event.start_time || '').slice(0, 10);
            return eventDate === dateStr;
        });

        days.push(
            <div
                key={day}
                className={`calendar-day ${isToday ? 'today' : ''}`}
                onClick={() => onDateClick(date)}
            >
                <div className="day-number">{day}</div>
                <div className="day-events">
                    {dayEvents.slice(0, 3).map(event => (
                        <div
                            key={event.id}
                            className={`event-chip ${event.event_type}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEventClick(event);
                            }}
                        >
                            {event.title}
                        </div>
                    ))}
                    {dayEvents.length > 3 && (
                        <div className="event-overflow">+{dayEvents.length - 3} more</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="calendar-grid-container">
            <div className="calendar-weekdays">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
            </div>
            <div className="calendar-grid">
                {days}
            </div>
        </div>
    );
};

export default CalendarGrid;
