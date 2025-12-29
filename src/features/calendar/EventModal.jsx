import React, { useState } from 'react';
import './EventModal.css';

const EventModal = ({ event, initialDate, onSave, onDelete, onClose }) => {
    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [location, setLocation] = useState(event?.location || '');
    const toLocalInputValue = (date) => {
        const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return d.toISOString().slice(0, 16);
    };

    const [startTime, setStartTime] = useState(
        event?.start_time
            ? toLocalInputValue(new Date(event.start_time))
            : initialDate
                ? toLocalInputValue(new Date(initialDate.setHours(9, 0)))
                : toLocalInputValue(new Date())
    );
    const [endTime, setEndTime] = useState(
        event?.end_time
            ? toLocalInputValue(new Date(event.end_time))
            : initialDate
                ? toLocalInputValue(new Date(initialDate.setHours(10, 0)))
                : toLocalInputValue(new Date(Date.now() + 3600000))
    );
    const [allDay, setAllDay] = useState(event?.all_day || false);
    const [eventType, setEventType] = useState(event?.event_type || 'general');
    const [showOnSplash, setShowOnSplash] = useState(event?.show_on_splash || false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!title.trim()) {
            alert('Please enter an event title');
            return;
        }

        const toLocalISOString = (value) => {
            const d = new Date(value);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            return local.toISOString();
        };

        const eventData = {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            start_time: toLocalISOString(startTime),
            end_time: toLocalISOString(endTime),
            all_day: allDay,
            event_type: eventType,
            show_on_splash: showOnSplash
        };

        onSave(eventData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{event ? 'Edit Event' : 'New Event'}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="event-form">
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Event title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add description"
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add location"
                        />
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={allDay}
                                onChange={(e) => setAllDay(e.target.checked)}
                            />
                            All day event
                        </label>
                    </div>

                    {!allDay && (
                        <>
                            <div className="form-group">
                                <label>Start Time</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>End Time</label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Event Type</label>
                        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                            <option value="general">General</option>
                            <option value="birthday">Birthday</option>
                            <option value="anniversary">Anniversary</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showOnSplash}
                                onChange={(e) => setShowOnSplash(e.target.checked)}
                            />
                            Show countdown splash for this event
                        </label>
                    </div>

                    <div className="modal-actions">
                        {event && (
                            <button
                                type="button"
                                className="delete-btn"
                                onClick={onDelete}
                            >
                                Delete
                            </button>
                        )}
                        <div className="action-buttons">
                            <button type="button" className="cancel-btn" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="save-btn">
                                {event ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventModal;
