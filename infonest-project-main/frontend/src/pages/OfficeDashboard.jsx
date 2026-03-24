import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { venueAPI, scheduleAPI } from '../services/api';
import BackButton from '../components/BackButton';
import MyBookingsCalendar from '../components/MyBookingsCalendar';
import EventFlipCard from '../components/EventFlipCard';
import './OfficeDashboard.css';
import '../components/EventFlipCard.css';

const OfficeDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('bookings');
    const [myBookings, setMyBookings] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [teacherResults, setTeacherResults] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isUpdateMode, setIsUpdateMode] = useState(false);
    const [teacherScheduleStatus, setTeacherScheduleStatus] = useState({});
    const [viewModal, setViewModal] = useState({ isOpen: false, data: [], teacherName: '' });
    // Check if teacher has existing schedule
    const checkTeacherSchedule = async (email) => {
        if (!email) return; // Prevent undefined calls
        try {
            const response = await scheduleAPI.checkScheduleExists(email);
            setTeacherScheduleStatus(prev => ({ ...prev, [email]: response.data.hasSchedule }));
            return response.data.hasSchedule;
        } catch (err) {
            setTeacherScheduleStatus(prev => ({ ...prev, [email]: false }));
            return false;
        }
    };

    // 2. Update the Search function to pass 'teacher.email' instead of full name
    const handleTeacherSearch = async () => {
    if (!teacherSearch.trim()) return; // Khali search allow mat karein
    try {
        const response = await scheduleAPI.searchTeachers(teacherSearch.trim());
        setTeacherResults(response.data);
        
        // Results aane par unka schedule status check karein
        response.data.forEach(teacher => {
            checkTeacherSchedule(teacher.email); 
        });
        setMessage({ type: '', text: '' }); // Purana error hata dein
    } catch (err) {
        setTeacherResults([]);
        setMessage({ type: 'error', text: 'No such teacher found in records.' });
    }
};

    // Handle Add Schedule
    const handleAddSchedule = async (teacher) => {
        const hasSchedule = teacherScheduleStatus[teacher.email]; // FIX: Check by EMAIL
        if (hasSchedule) {
            setMessage({ type: 'error', text: `Schedule already exists for ${teacher.firstName}. Use Edit to modify.` });
            return;
        }
        setSelectedTeacher(teacher);
        setIsUpdateMode(false);
    };

    // Handle Edit Schedule
    const handleEditSchedule = async (teacher) => {
        const hasSchedule = teacherScheduleStatus[teacher.email]; // FIX: Check by EMAIL
        if (!hasSchedule) {
            setMessage({ type: 'error', text: `No schedule found for ${teacher.firstName}. Please add a schedule first.` });
            return;
        }
        setSelectedTeacher(teacher);
        setIsUpdateMode(true);
    };

    // Handle Delete Schedule
    // Delete Handler
    // Is block ko Line 93 ke paas replace karein
    const handleDeleteSchedule = async (teacher) => {
        if (!teacher.email) return;
        if (!confirm(`Permanently delete schedule for ${teacher.firstName}?`)) return;

        try {
            await scheduleAPI.deleteSchedule(teacher.email);
            setMessage({ type: 'success', text: 'Schedule deleted successfully.' });
            // UI ko turant update karne ke liye state change karein
            setTeacherScheduleStatus(prev => ({ ...prev, [teacher.email]: false }));
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete.' });
        }
    };

    // Updated Upload function
   const handleOfficeScheduleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setLoading(true);
        try {
            const fullName = `${selectedTeacher.firstName} ${selectedTeacher.lastName}`;
            const email = selectedTeacher.email;
            
           await scheduleAPI.uploadExcel(selectedFile, email, fullName, isUpdateMode);
setMessage({ type: 'success', text: isUpdateMode ? 'Schedule updated!' : 'Schedule added!' });
setTeacherScheduleStatus(prev => ({ ...prev, [email]: true })); // Trigger UI button toggle
setSelectedTeacher(null); // Close upload box
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || "Upload failed" });
        } finally {
            setLoading(false);
        }
    };

    // Handle Floating Modal View
    const handleViewSchedule = async (teacher) => {
        const fullName = `${teacher.firstName} ${teacher.lastName}`;
        try {
            // FIX: Pass email instead of fullName to the API
            const res = await scheduleAPI.getTeacherScheduleData(teacher.email); 
            setViewModal({ isOpen: true, data: res.data, teacherName: fullName });
        } catch (err) {
            setMessage({ type: 'error', text: "Failed to fetch schedule data" });
        }
    };

    
    // Add venue form
    const [showAddModal, setShowAddModal] = useState(false);
    const [venueForm, setVenueForm] = useState({
        name: '', type: 'CLASSROOM', capacity: '', location: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bookingsRes, venuesRes] = await Promise.all([
                venueAPI.getMyBookings(),
                venueAPI.getAllVenues()
            ]);
            setMyBookings(bookingsRes.data);
            setVenues(venuesRes.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddVenue = async (e) => {
        e.preventDefault();
        try {
            await venueAPI.addVenue(venueForm);
            setMessage({ type: 'success', text: 'Venue added successfully!' });
            setShowAddModal(false);
            setVenueForm({ name: '', type: 'CLASSROOM', capacity: '', location: '' });
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed to add venue' });
        }
    };

    const handleDeleteVenue = async (venueId) => {
        if (!confirm('Deactivate this venue?')) return;
        try {
            await venueAPI.deleteVenue(venueId);
            setMessage({ type: 'success', text: 'Venue deactivated!' });
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed to delete venue' });
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Cancel this booking?')) return;
        try {
            await venueAPI.cancelBooking(bookingId);
            setMessage({ type: 'success', text: 'Booking cancelled!' });
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed to cancel' });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString + 'T00:00:00').toLocaleDateString();
    };

    if (loading) {
        return <div className="office-dashboard"><div className="loading-container"><div className="loader"></div></div></div>;
    }

    const handleScheduleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
        setMessage({ type: 'error', text: 'Please select a file first!' });
        return;
    }

    // Check file extension (Client-side validation)
    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
        setMessage({ type: 'error', text: 'Only Excel files (.xlsx, .xls) are allowed.' });
        return;
    }

    setLoading(true);
    try {
        await scheduleAPI.uploadExcel(selectedFile);
        setMessage({ type: 'success', text: 'Schedules processed and saved successfully!' });
        setSelectedFile(null); // Clear file after success
    } catch (err) {
        // Handle specific backend errors
        const errMsg = err.response?.data?.message || "Error processing Excel. Check if format is correct.";
        setMessage({ type: 'error', text: errMsg });
    } finally {
        setLoading(false);
    }
};

// Professional touch: Provide a template for the office user
// Line 222 ke paas purane wale ko isse replace karein:
// Is block ko Line 222 ke paas replace karein
const downloadTemplate = () => {
    const headers = "Teacher Name,Day,Subject,Batch,Room No,Start Time (HH:mm),End Time (HH:mm),Sitting Cabin\n";
    const example = "teacher,MONDAY,Java Programming,CS-A,CS-102,09:00,10:30,Staff Room 1";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Teacher_Schedule_Template.csv';
    a.click();
};
    return (
        <div className="office-dashboard page-container">
            <div className="page-back-section">
                <BackButton />
            </div>
            <header className="dashboard-header card">
                <div className="header-info">
                    <h1>🏢 Office Dashboard</h1>
                    <span className="role-badge">OFFICE</span>
                </div>
                <div className="header-actions">
                    <Link to="/booking" className="btn btn-primary">📍 Book Venue</Link>
                    <Link to="/events" className="btn btn-secondary">🔍 Browse Events</Link>
                    <button className="btn btn-danger" onClick={logout}>Logout</button>
                </div>
            </header>

            <div style={{ height: '1.5rem' }} /> {/* Vertical spacing */}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card"><span className="stat-num">{myBookings.length}</span><span className="stat-label">My Bookings</span></div>
                <div className="stat-card"><span className="stat-num">{venues.length}</span><span className="stat-label">Active Venues</span></div>
            </div>

            <div style={{ height: '1.5rem' }} /> {/* Spacing between sections */}

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
                    📋 My Bookings
                </button>
                <button className={`tab-btn ${activeTab === 'venues' ? 'active' : ''}`} onClick={() => setActiveTab('venues')}>
                    🏫 Manage Venues
                </button>
                <button className={`tab-btn ${activeTab === 'schedules' ? 'active' : ''}`} onClick={() => setActiveTab('schedules')}>
                    📅 Teacher Schedules
                </button>
            </div>


            {/* My Bookings Tab */}
            {activeTab === 'bookings' && (
                <div className="card">
                    <h2>📅 My Venue Bookings</h2>
                    <div className="action-bar">
                        <Link to="/booking" className="btn btn-primary">➕ New Booking</Link>
                        <button className="btn btn-secondary" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                    
                    {/* Calendar View */}
                    <MyBookingsCalendar />
                    
                    {/* Bookings Table */}
                    <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>All Bookings</h3>
                    <table>
                        <thead>
                            <tr><th>Venue</th><th>Date</th><th>Time</th><th>Purpose</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {myBookings.length > 0 ? myBookings.map(b => (
                                <tr key={b.bookingId}>
                                    <td>{b.venue?.name || 'N/A'}</td>
                                    <td>{new Date(b.bookingDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td>{new Date('1970-01-01T' + b.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date('1970-01-01T' + b.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                                    <td>{b.purpose}</td>
                                    <td><span className={`status-badge status-${b.status?.toLowerCase()}`}>{b.status}</span></td>
                                    <td>
                                        {b.status === 'CONFIRMED' && (
                                            <button className="btn btn-danger" onClick={() => handleCancelBooking(b.bookingId)}>Cancel</button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6">No bookings yet. <Link to="/booking">Book a venue!</Link></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Manage Venues Tab */}
            {activeTab === 'venues' && (
                <div className="card">
                    <h2>🏫 All Venues</h2>
                    <div className="action-bar">
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Add Venue</button>
                        <button className="btn btn-secondary" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                    
                    {/* Animated Venue Cards with Flip Animation */}
                    <div className="event-cards-grid">
                        {venues.length > 0 ? venues.map((venue, index) => (
                            <EventFlipCard 
                                key={venue.venueId} 
                                event={{
                                    ...venue,
                                    eventName: venue.name,
                                    eventDate: venue.type,
                                    description: `Capacity: ${venue.capacity} | Location: ${venue.location || 'N/A'}`
                                }} 
                                index={index}
                                onAction={(v) => handleDeleteVenue(v.venueId)}
                                showDelete={true}
                            />
                        )) : (
                            <p style={{ padding: '2rem', color: 'var(--muted)', textAlign: 'center', gridColumn: '1 / -1' }}>
                                No venues found. Add your first venue!
                            </p>
                        )}
                    </div>
                </div>
            )}
            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                    <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
                </div>
            )}
            {/* Line 410 ke paas se replace shuru karein */}
            {activeTab === 'schedules' && (
                <div className="card">
                    <h2>📅 Manage Teacher Schedules</h2>
                    <div className="management-search-bar" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input 
                            type="text" 
                            placeholder="Search teacher name..." 
                            className="form-control"
                            value={teacherSearch}
                            onChange={(e) => setTeacherSearch(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleTeacherSearch}>🔍 Search</button>
                    </div>

                    {teacherResults.map(t => {
                        const hasSchedule = teacherScheduleStatus[t.email];
                        return (
                            <div key={t.userId} className="teacher-item" style={{ padding: '15px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {hasSchedule && (
                                        <button onClick={() => handleViewSchedule(t)} title="View Data" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>📊</button>
                                    )}
                                    <div>
                                        <strong>{t.firstName} {t.lastName}</strong>
                                        <div style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>{t.email}</div>
                                        <div style={{ fontSize: '0.75rem', color: hasSchedule ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                                            {hasSchedule ? '● Schedule exists' : '○ No schedule added'}
                                        </div>
                                    </div>
                                </div>
                                <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                                    {!hasSchedule ? (
                                        <button className="btn-sm btn-success" onClick={() => handleAddSchedule(t)}>➕ Add</button>
                                    ) : (
                                        <>
                                            <button className="btn-sm btn-warning" onClick={() => handleEditSchedule(t)}>🔄 Edit</button>
                                            <button className="btn-sm btn-danger" onClick={() => handleDeleteSchedule(t)}>🗑️ Delete</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {selectedTeacher && (
                        <div className="upload-section card" style={{ border: '2px solid var(--primary)', marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3>{isUpdateMode ? '🔄 Edit' : '➕ Add'} for {selectedTeacher.firstName}</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Upload weekly schedule file.</p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>📥 Template</button>
                            </div>
                            <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.8rem', color: '#856404' }}>
                                <strong>Note:</strong> Teacher Name, Day, Subject, Batch, Room, Start, End, Cabin. (No Tuesdays).
                            </div>
                            <form onSubmit={handleOfficeScheduleUpload}>
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setSelectedFile(e.target.files[0])} className="form-control" />
                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Uploading...' : 'Confirm Sync'}</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedTeacher(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* Add Venue Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        <h3>➕ Add Venue</h3>
                        <form onSubmit={handleAddVenue}>
                            <div className="form-group">
                                <label>Venue Name *</label>
                                <input value={venueForm.name} onChange={e => setVenueForm({ ...venueForm, name: e.target.value })} required placeholder="e.g., Room 101" />
                            </div>
                            <div className="form-group">
                                <label>Type *</label>
                                <select value={venueForm.type} onChange={e => setVenueForm({ ...venueForm, type: e.target.value })}>
                                    <option value="CLASSROOM">Classroom</option>
                                    <option value="AUDITORIUM">Auditorium</option>
                                    <option value="SEMINAR_HALL">Seminar Hall</option>
                                    <option value="COMPUTER_LAB">Computer Lab</option>
                                    <option value="CONFERENCE_ROOM">Conference Room</option>
                                    <option value="OUTDOOR">Outdoor</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Capacity *</label>
                                <input type="number" value={venueForm.capacity} onChange={e => setVenueForm({ ...venueForm, capacity: e.target.value })} required placeholder="e.g., 100" />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input value={venueForm.location} onChange={e => setVenueForm({ ...venueForm, location: e.target.value })} placeholder="e.g., Block A, Floor 2" />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Venue</button>
                        </form>
                    </div>
                </div>
            )}

            {/* FLOATING EXCEL MODAL */}
            {viewModal.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white', width: '80%', maxHeight: '80vh', 
                        borderRadius: '8px', padding: '20px', overflowY: 'auto',
                        position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        {/* CROSS BUTTON */}
                        <button 
                            onClick={() => setViewModal({ isOpen: false, data: [], teacherName: '' })}
                            style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#ff4444' }}
                        >
                            ✖
                        </button>
                        <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', color: 'black' }}>
                            📊 Schedule Data: {viewModal.teacherName}
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', color: 'black' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f4f4f4' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Day</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Time</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subject</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Room</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewModal.data.map(row => (
                                    <tr key={row.id}>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.dayOfWeek}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.startTime} - {row.endTime}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.subject}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{row.roomNo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};



export default OfficeDashboard;
