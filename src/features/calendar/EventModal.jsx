import React, { useState } from 'react';
import './EventModal.css';

const EventModal = ({ event, initialDate, onSave, onDelete, onClose }) => {
    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [location, setLocation] = useState(event?.location || '');
    const [startTime, setStartTime] = useState(
        event?.start_time
            ? new Date(event.start_time).toISOString().slice(0, 16)
            : initialDate
                ? new Date(initialDate.setHours(9, 0)).toISOString().slice(0, 16)
                : new Date().toISOString().slice(0, 16)
    );
    const [endTime, setEndTime] = useState(
        event?.end_time
            ? new Date(event.end_time).toISOString().slice(0, 16)
            : initialDate
                ? new Date(initialDate.setHours(10, 0)).toISOString().slice(0, 16)
                : new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    );
    const [allDay, setAllDay] = useState(event?.all_day || false);
    const [eventType, setEventType] = useState(event?.event_type || 'general');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!title.trim()) {
            alert('Please enter an event title');
            return;
        }

        const eventData = {
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            all_day: allDay,
            event_type: eventType
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
