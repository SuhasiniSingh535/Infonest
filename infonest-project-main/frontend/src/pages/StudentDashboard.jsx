import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentAPI, eventsAPI } from '../services/api';
import BackButton from '../components/BackButton';
import './StudentDashboard.css';
import TeacherSearch from '../components/TeacherSearch';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReg, setSelectedReg] = useState(null);

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        if (!user?.userId) return;
        setLoading(true);
        try {
            const [regsRes, eventsRes] = await Promise.all([
                studentAPI.getMyRegistrations(user.userId),
                eventsAPI.getAllEvents()
            ]);
            setRegistrations(regsRes.data);
            setEvents(eventsRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getEventName = (eventId) => {
        const event = events.find(e => e.eventId === eventId);
        return event?.eventName || `Event #${eventId}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusClass = (status) => {
        if (status === 'APPROVED') return 'status-approved';
        if (status === 'REJECTED') return 'status-rejected';
        return 'status-applied';
    };

    const closeModal = () => setSelectedReg(null);

    if (loading) {
        return (
            <div className="student-dashboard">
                <div className="loading-container">
                    <div className="loader"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="student-dashboard page-container">
            <div className="page-back-section">
                <BackButton />
            </div>
            <header className="dashboard-header card">
                <h1>🎓 Welcome, <span>{user?.firstName || 'Student'}</span>!</h1>
                <div className="header-actions">
                    <Link to="/events" className="btn btn-primary">🔍 Browse Events</Link>
                    <button className="btn btn-danger" onClick={logout}>Logout</button>
                </div>
            </header>

            <div style={{ height: '1.5rem' }} />

            <div className="card">
                <h2>📋 My Event Registrations</h2>
                <table>

                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Submitted On</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.length > 0 ? (
                            registrations.map(reg => (
                                <tr key={reg.regId}>
                                    <td>{getEventName(reg.eventId)}</td>
                                    <td>{formatDate(reg.submissionDate)}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusClass(reg.status)}`} data-status={reg.status}>
                                            {reg.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setSelectedReg(reg)}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">No registrations yet. <Link to="/events">Browse events</Link> to register!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {selectedReg && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={closeModal}>×</button>
                        <h3>📄 Registration Details</h3>
                        <ul className="details-list">
                            <li><strong>Registration ID:</strong> {selectedReg.regId}</li>
                            <li><strong>Event:</strong> {getEventName(selectedReg.eventId)}</li>
                            <li><strong>Status:</strong> {selectedReg.status}</li>
                            <li><strong>Submitted:</strong> {formatDate(selectedReg.submissionDate)}</li>
                            {selectedReg.formData && (
                                <li><strong>Form Data:</strong> <pre>{selectedReg.formData}</pre></li>
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;