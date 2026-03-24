import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, venueAPI } from '../services/api';
import BackButton from '../components/BackButton';
import MyBookingsCalendar from '../components/MyBookingsCalendar';
import EventFlipCard from '../components/EventFlipCard';
import GlassCard from '../components/GlassCard';
import './AdminDashboard.css';
import '../components/EventFlipCard.css';

/* ─────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────── */
const StatCard = memo(({ label, value, sub, icon, color }) => (
    <div className="stat-card">
        <div className="stat-icon" style={{ background: color }}>{icon}</div>
        <span className="stat-num">{value}</span>
        <span className="stat-label">{label}</span>
        <span className="stat-sub">{sub}</span>
        <div className="stat-bar-track">
            <div className="stat-bar-fill" style={{ width: `${Math.min(100, value * 2)}%`, background: color }} />
        </div>
    </div>
));

/* ─────────────────────────────────────────────
   Club Card  — click to expand, CSS-only animation
───────────────────────────────────────────── */
const CLUB_COLORS = [
    { from: '#2563eb', to: '#60a5fa' },
    { from: '#7c3aed', to: '#a78bfa' },
    { from: '#059669', to: '#34d399' },
    { from: '#d97706', to: '#f59e0b' },
    { from: '#dc2626', to: '#f87171' },
    { from: '#0891b2', to: '#22d3ee' },
];

const ClubCard = memo(({ club, index, onEdit, onDelete }) => {
    const [open, setOpen] = useState(false);
    const color = CLUB_COLORS[index % CLUB_COLORS.length];
    const initials = (club.clubName || club.clubId || '?')
        .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    const handleEdit = useCallback((e) => {
        e.stopPropagation();
        onEdit(club);
    }, [club, onEdit]);

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        onDelete(club.clubId);
    }, [club.clubId, onDelete]);

    return (
        <div
            className={`club-card${open ? ' club-card--open' : ''}`}
            style={{
                '--c-from': color.from,
                '--c-to': color.to,
                animationDelay: `${index * 60}ms`
            }}
        >
            {/* Header row — always visible */}
            <div className="club-card__front" onClick={() => setOpen(o => !o)}>
                <div className="club-card__avatar">{initials}</div>
                <div className="club-card__info">
                    <h3 className="club-card__name">{club.clubName}</h3>
                    <span className="club-card__id">ID: {club.clubId}</span>
                </div>
                <span className={`club-card__chevron${open ? ' club-card__chevron--up' : ''}`}>›</span>
            </div>

            {/* Expandable body */}
            <div className="club-card__body">
                <p className="club-card__desc">
                    {club.description || 'No description provided for this club.'}
                </p>
                <div className="club-card__meta">
                    <span className="club-card__pill">🟢 Active</span>
                    <span className="club-card__pill">ID: {club.clubId}</span>
                </div>
                <div className="club-card__actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleEdit}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>
                </div>
            </div>
        </div>
    );
});

/* ─────────────────────────────────────────────
   Faculty Card — same expand pattern
───────────────────────────────────────────── */
const FacultyCard = memo(({ f, index, onRemove }) => {
    const [open, setOpen] = useState(false);
    const initial = (f.firstName?.[0] || f.email?.[0] || '?').toUpperCase();

    return (
        <div
            className={`club-card faculty-card${open ? ' club-card--open' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="club-card__front" onClick={() => setOpen(o => !o)}>
                <div className="club-card__avatar faculty-avatar">{initial}</div>
                <div className="club-card__info">
                    <h3 className="club-card__name">
                        {`${f.firstName || ''} ${f.lastName || ''}`.trim() || f.email}
                    </h3>
                    <span className="club-card__id">{f.email}</span>
                </div>
                <span className={`status-badge ${f.clubId ? 'status-confirmed' : 'status-pending'}`}>
                    {f.clubId ? `Club: ${f.clubId}` : 'Unassigned'}
                </span>
                <span className={`club-card__chevron${open ? ' club-card__chevron--up' : ''}`}>›</span>
            </div>
            <div className="club-card__body">
                <div className="club-card__meta">
                    <span className="club-card__pill">👤 UID: {f.userId}</span>
                    <span className="club-card__pill">✉️ {f.email}</span>
                </div>
                {f.clubId && (
                    <div className="club-card__actions" style={{ marginTop: '0.75rem' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => onRemove(f.email)}>
                            🗑️ Remove Assignment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

/* ═══════════════════════════════════════════
   Main Dashboard Component
═══════════════════════════════════════════ */
const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [clubs, setClubs]           = useState([]);
    const [events, setEvents]         = useState([]);
    const [faculty, setFaculty]       = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [activeTab, setActiveTab]   = useState('clubs');
    const [message, setMessage]       = useState({ type: '', text: '' });
    const [showModal, setShowModal]   = useState(false);
    const [modalType, setModalType]   = useState('');
    const [editingItem, setEditingItem] = useState(null);

    const [clubForm, setClubForm] = useState({ clubId: '', clubName: '', description: '' });
    const [eventForm, setEventForm] = useState({
        clubId: '', eventName: '', description: '', venueId: '',
        eventDate: '', eventTime: '', deadline: '', registrationFormLink: ''
    });
    const [assignForm, setAssignForm] = useState({ email: '', clubId: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clubsRes, eventsRes, facultyRes, bookingsRes] = await Promise.all([
                adminAPI.getAllClubs(),
                adminAPI.getAllEvents(),
                adminAPI.getAllFaculty(),
                venueAPI.getMyBookings()
            ]);
            setClubs(clubsRes.data);
            setEvents(eventsRes.data);
            setFaculty(facultyRes.data);
            setMyBookings(bookingsRes.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClubSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await adminAPI.updateClub(editingItem.clubId, clubForm);
                setMessage({ type: 'success', text: 'Club updated!' });
            } else {
                await adminAPI.addClub(clubForm);
                setMessage({ type: 'success', text: 'Club added!' });
            }
            closeModal(); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed' });
        }
    };

    const handleDeleteClub = useCallback(async (clubId) => {
        if (!confirm('Delete this club?')) return;
        try {
            await adminAPI.deleteClub(clubId);
            setMessage({ type: 'success', text: 'Club deleted!' }); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed' });
        }
    }, []);

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await adminAPI.updateEvent(editingItem.eventId, eventForm);
                setMessage({ type: 'success', text: 'Event updated!' });
            } else {
                await adminAPI.addEvent(eventForm);
                setMessage({ type: 'success', text: 'Event added!' });
            }
            closeModal(); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed' });
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Delete this event?')) return;
        try {
            await adminAPI.deleteEvent(eventId);
            setMessage({ type: 'success', text: 'Event deleted!' }); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed' });
        }
    };

    const handleAssignFaculty = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.assignFacultyToClub(assignForm.email, assignForm.clubId);
            setMessage({ type: 'success', text: 'Faculty assigned!' }); closeModal(); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed' });
        }
    };

    const handleRemoveFaculty = useCallback(async (email) => {
        if (!confirm('Remove faculty from club?')) return;
        try {
            await adminAPI.removeFacultyFromClub(email);
            setMessage({ type: 'success', text: 'Faculty removed!' }); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed' });
        }
    }, []);

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Cancel this booking?')) return;
        try {
            await venueAPI.cancelBooking(bookingId);
            setMessage({ type: 'success', text: 'Booking cancelled!' }); fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed to cancel' });
        }
    };

    const openModal = useCallback((type, item = null) => {
        setModalType(type);
        setEditingItem(item);
        if (type === 'club') {
            setClubForm(item ? { ...item } : { clubId: '', clubName: '', description: '' });
        } else if (type === 'event') {
            setEventForm(item
                ? { ...item, eventDate: item.eventDate || '', deadline: item.deadline || '' }
                : { clubId: '', eventName: '', description: '', venueId: '', eventDate: '', eventTime: '', deadline: '', registrationFormLink: '' }
            );
        } else if (type === 'assign') {
            setAssignForm({ email: '', clubId: '' });
        }
        setShowModal(true);
    }, []);

    const closeModal = useCallback(() => { setShowModal(false); setEditingItem(null); }, []);

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="loading-container">
                    <div className="loader-ring" />
                    <p className="loading-text">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    const TABS = [
        { key: 'clubs',    label: '🏢 Clubs' },
        { key: 'events',   label: '📅 Events' },
        { key: 'faculty',  label: '👥 Faculty' },
        { key: 'bookings', label: '📋 Bookings' },
    ];

    return (
        <div className="admin-dashboard page-container">
            <div className="page-back-section">
                <BackButton />
            </div>

            {/* ── Header ── */}
            <header className="dashboard-header">
                <div className="header-title">
                    <span className="header-badge">ADMIN</span>
                    <h1>🛡️ Admin Dashboard</h1>
                    <p className="header-sub">Welcome back, {user?.firstName || 'Admin'}</p>
                </div>
                <div className="header-actions">
                    <Link to="/events" className="btn btn-secondary">🔍 Browse Events</Link>
                    <button className="btn btn-danger" onClick={logout}>Logout</button>
                </div>
            </header>

            <div style={{ height: '1.5rem' }} />


            {/* ── Alert ── */}
            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
                </div>
            )}

            {/* ── Stat Cards ── */}
            <div className="bento-stats">
                <StatCard icon="🏢" label="Total Clubs"  value={clubs.length}      sub="Active clubs"   color="linear-gradient(135deg,#2563eb,#60a5fa)" />
                <StatCard icon="📅" label="Events"       value={events.length}     sub="Scheduled"      color="linear-gradient(135deg,#7c3aed,#a78bfa)" />
                <StatCard icon="👥" label="Faculty"      value={faculty.length}    sub="Members"        color="linear-gradient(135deg,#059669,#34d399)" />
                <StatCard icon="📋" label="Bookings"     value={myBookings.length} sub="Venue requests" color="linear-gradient(135deg,#d97706,#fbbf24)" />
            </div>

            {/* ── Tabs ── */}
            <div className="tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ══ CLUBS TAB ══ */}
            {activeTab === 'clubs' && (
                <div className="card">
                    <h2>🏢 Manage Clubs</h2>
                    <div className="action-bar">
                        <button className="btn btn-primary" onClick={() => openModal('club')}>➕ Add Club</button>
                        <button className="btn btn-secondary" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                    {clubs.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">🏢</span>
                            <p>No clubs yet. Add one to get started!</p>
                        </div>
                    ) : (
                        <div className="clubs-grid">
                            {clubs.map((club, i) => (
                                <ClubCard
                                    key={club.clubId}
                                    club={club}
                                    index={i}
                                    onEdit={(clubData) => openModal('club', clubData)}
                                    onDelete={handleDeleteClub}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ EVENTS TAB ══ */}
            {activeTab === 'events' && (
                <div className="card">
                    <h2>📅 Manage Events</h2>
                    <div className="action-bar">
                        <button className="btn btn-primary" onClick={() => openModal('event')}>➕ Add Event</button>
                        <button className="btn btn-secondary" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                    {events.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📅</span>
                            <p>No events found.</p>
                        </div>
                    ) : (
                        <div className="event-cards-grid">
                            {events.map((event, i) => (
                                <EventFlipCard
                                    key={event.eventId}
                                    event={event}
                                    index={i}
                                    onAction={(evt) => console.log('View event:', evt)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ FACULTY TAB ══ */}
            {activeTab === 'faculty' && (
                <div className="card">
                    <h2>👥 Manage Faculty Assignments</h2>
                    <div className="action-bar">
                        <button className="btn btn-primary" onClick={() => openModal('assign')}>➕ Assign Faculty</button>
                        <button className="btn btn-secondary" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                    {faculty.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">👥</span>
                            <p>No faculty members found.</p>
                        </div>
                    ) : (
                        <div className="faculty-list">
                            {faculty.map((f, i) => (
                                <FacultyCard key={f.userId} f={f} index={i} onRemove={handleRemoveFaculty} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ BOOKINGS TAB ══ */}
            {activeTab === 'bookings' && (
                <div className="card">
                    <h2>📋 My Venue Bookings</h2>
                    <div className="action-bar">
                        <Link to="/booking" className="btn btn-primary">➕ New Booking</Link>
                        <button className="btn btn-secondary" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                    <MyBookingsCalendar />
                    <h3 className="section-subheading">All Bookings</h3>
                    <div className="bookings-grid">
                        {myBookings.length > 0 ? myBookings.map(b => (
                            <GlassCard key={b.bookingId} className="booking-card">
                                <div className="booking-header">
                                    <h4>{b.venue?.name || 'N/A'}</h4>
                                    <span className={`status-badge status-${b.status?.toLowerCase()}`}>{b.status}</span>
                                </div>
                                <div className="booking-details">
                                    <div className="detail-row">
                                        <span>📅</span>
                                        <span>{new Date(b.bookingDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>⏰</span>
                                        <span>
                                            {new Date('1970-01-01T' + b.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            {' – '}
                                            {new Date('1970-01-01T' + b.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span>🎯</span>
                                        <span>{b.purpose}</span>
                                    </div>
                                </div>
                                {b.status === 'CONFIRMED' && (
                                    <button className="btn btn-danger btn-full" onClick={() => handleCancelBooking(b.bookingId)}>
                                        Cancel Booking
                                    </button>
                                )}
                            </GlassCard>
                        )) : (
                            <div className="empty-state">
                                <span className="empty-icon">📋</span>
                                <p>No bookings yet. <Link to="/booking" className="link-primary">Book a venue!</Link></p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ MODALS ══ */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={closeModal} aria-label="Close">×</button>

                        {/* ── Club modal ── */}
                        {modalType === 'club' && (
                            <>
                                <h3>{editingItem ? '✏️ Edit Club' : '➕ Add Club'}</h3>
                                <form onSubmit={handleClubSubmit}>
                                    <div className="form-group">
                                        <label>🪪 Club ID {editingItem ? '' : '*'}</label>
                                        <input
                                            value={clubForm.clubId}
                                            onChange={e => setClubForm({ ...clubForm, clubId: e.target.value })}
                                            disabled={!!editingItem}
                                            required={!editingItem}
                                            placeholder="e.g., IEEE"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>🏢 Club Name *</label>
                                        <input
                                            value={clubForm.clubName}
                                            onChange={e => setClubForm({ ...clubForm, clubName: e.target.value })}
                                            required
                                            placeholder="Enter club name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>📝 Description</label>
                                        <textarea
                                            value={clubForm.description}
                                            onChange={e => setClubForm({ ...clubForm, description: e.target.value })}
                                            rows={4}
                                            placeholder="Describe what this club is about…"
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-full">
                                        {editingItem ? '✅ Update Club' : '➕ Add Club'}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* ── Event modal ── */}
                        {modalType === 'event' && (
                            <>
                                <h3>{editingItem ? '✏️ Edit Event' : '➕ Add Event'}</h3>
                                <form onSubmit={handleEventSubmit}>
                                    <div className="form-group">
                                        <label>🏢 Club *</label>
                                        <select value={eventForm.clubId} onChange={e => setEventForm({ ...eventForm, clubId: e.target.value })} required>
                                            <option value="">Select a club…</option>
                                            {clubs.map(c => <option key={c.clubId} value={c.clubId}>{c.clubName}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>🎉 Event Name *</label>
                                        <input
                                            value={eventForm.eventName}
                                            onChange={e => setEventForm({ ...eventForm, eventName: e.target.value })}
                                            required
                                            placeholder="Enter event name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>📝 Description</label>
                                        <textarea
                                            value={eventForm.description}
                                            onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                            rows={2}
                                            placeholder="Brief event description…"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>📅 Date *</label>
                                            <input type="date" value={eventForm.eventDate} onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>⏰ Time</label>
                                            <input type="time" value={eventForm.eventTime} onChange={e => setEventForm({ ...eventForm, eventTime: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>📍 Venue</label>
                                            <input value={eventForm.venueId} onChange={e => setEventForm({ ...eventForm, venueId: e.target.value })} placeholder="Venue ID" />
                                        </div>
                                        <div className="form-group">
                                            <label>⏳ Deadline</label>
                                            <input type="date" value={eventForm.deadline} onChange={e => setEventForm({ ...eventForm, deadline: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>🔗 Registration Link</label>
                                        <input value={eventForm.registrationFormLink} onChange={e => setEventForm({ ...eventForm, registrationFormLink: e.target.value })} placeholder="https://…" />
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-full">
                                        {editingItem ? '✅ Update Event' : '➕ Add Event'}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* ── Assign faculty modal ── */}
                        {modalType === 'assign' && (
                            <>
                                <h3>👨‍🏫 Assign Faculty to Club</h3>
                                <form onSubmit={handleAssignFaculty}>
                                    <div className="form-group">
                                        <label>👤 Faculty Member *</label>
                                        <select value={assignForm.email} onChange={e => setAssignForm({ ...assignForm, email: e.target.value })} required>
                                            <option value="">Select a faculty member…</option>
                                            {faculty.filter(f => !f.clubId).map(f => (
                                                <option key={f.userId} value={f.email}>{f.firstName} {f.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>🏢 Club *</label>
                                        <select value={assignForm.clubId} onChange={e => setAssignForm({ ...assignForm, clubId: e.target.value })} required>
                                            <option value="">Select a club…</option>
                                            {clubs.map(c => <option key={c.clubId} value={c.clubId}>{c.clubName}</option>)}
                                        </select>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-full">✅ Assign Faculty</button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;