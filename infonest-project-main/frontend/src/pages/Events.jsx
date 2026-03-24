import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI, studentAPI, clubsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import EventFlipCard from '../components/EventFlipCard';
import './Events.css';
import '../components/EventFlipCard.css';

const Events = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eventsRes, clubsRes] = await Promise.all([
                eventsAPI.getUpcomingEvents(),
                clubsAPI.getAllClubs()
            ]);
            setEvents(eventsRes.data);
            setClubs(clubsRes.data);

            if (isAuthenticated && user?.userId) {
                const regsRes = await studentAPI.getMyRegistrations(user.userId);
                setRegistrations(regsRes.data);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const isRegistered = (eventId) => {
        return registrations.some(reg => reg.eventId === eventId);
    };

    const handleRegister = async (event) => {
        // If not authenticated, save intent and redirect to login
        if (!isAuthenticated) {
            sessionStorage.setItem('pendingRegistration', JSON.stringify({
                eventId: event.eventId,
                eventName: event.eventName,
                registrationFormLink: event.registrationFormLink || 'club_form_link'
            }));
            navigate('/login');
            return;
        }

        // FLOW A: Internal Form (club_form_link or no link)
        if (!event.registrationFormLink || event.registrationFormLink === 'club_form_link') {
            sessionStorage.setItem('pendingRegistration', JSON.stringify({
                eventId: event.eventId,
                eventName: event.eventName,
                registrationFormLink: 'club_form_link'
            }));
            navigate('/club-form');
            return;
        }

        // FLOW B: External Link - Register first, then redirect
        try {
            const registration = { userId: user.userId, eventId: event.eventId };
            await studentAPI.registerForEvent(registration);

            setMessage({ type: 'success', text: `Registered! Opening external form...` });
            window.open(event.registrationFormLink, '_blank');
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Registration failed';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const goToDashboard = () => {
        if (user?.role === 'ADMIN') window.location.href = '/admin';
        else if (user?.role === 'FACULTY') window.location.href = '/faculty';
        else window.location.href = '/dashboard';
    };

    if (loading) {
        return (
            <div className="events-page">
                <div className="loading-container">
                    <div className="loader"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="events-page page-container">
            <div className="page-back-section">
                <BackButton />
            </div>
            {/* Header */}
            <header className="page-header card">
                <h1>Events</h1>
                <div className="header-actions">
                    {isAuthenticated && (
                        <>
                            <span className="user-info">Hi, {user?.firstName}!</span>
                            <button className="btn btn-secondary" onClick={goToDashboard}>My Dashboard</button>
                        </>
                    )}
                </div>
            </header>

            <div style={{ height: '1.5rem' }} />


            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                    <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
                </div>
            )}

            {/* Clubs Section */}
            <h2 className="section-title">🏢 Clubs</h2>
            <div className="clubs-grid">
                {clubs.length > 0 ? (
                    clubs.map(club => (
                        <div
                            key={club.clubId}
                            className="club-card"
                            onClick={() => window.location.href = `/clubs/${club.clubId}`}
                        >
                            <h3>{club.clubName}</h3>
                        </div>
                    ))
                ) : (
                    <div className="club-card"><p>No clubs found.</p></div>
                )}
            </div>

            {/* Events Section */}
            <h2 className="section-title">📅 Upcoming Events</h2>
            <div className="events-grid">
                {events.length > 0 ? (
                    events.map((event, index) => (
                        <EventFlipCard 
                            key={event.eventId} 
                            event={event} 
                            index={index}
                            onAction={(evt) => handleRegister(evt)}
                        />
                    ))
                ) : (
                    <div className="event-card">
                        <div className="event-body"><p>No upcoming events.</p></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events;
