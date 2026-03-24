import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../services/api';
import BackButton from '../components/BackButton';
import './Schedule.css';

const Schedule = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // 1. State Management
    
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isUpdateMode, setIsUpdateMode] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduleData, setScheduleData] = useState(null);
    const [teacherResults, setTeacherResults] = useState([]);
    const [isManagementMode, setIsManagementMode] = useState(user?.role === 'OFFICE');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Advanced Search States
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedData, setAdvancedData] = useState({ day: 'Monday', time: '09:00:00' });

    // 2. Search Logic - Option 1: Real-Time Location (Handles Tuesday/9-5 Rules)
    const handleSearch = async () => {
        if (!searchQuery) {
            setMessage({ type: 'error', text: 'Please enter a teacher name' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await scheduleAPI.searchRealTime(searchQuery);
            setScheduleData({
                id: searchQuery,
                currentLocation: response.data, 
                scheduledLocation: "Live Check",
                lastUpdated: "Just now"
            });
            setShowSchedule(true);
        } catch (err) {
            setMessage({ type: 'error', text: 'Search failed. Teacher info not found.' });
        } finally {
            setLoading(false);
        }
    };

    // 3. Search Logic - Option 2: Sitting Cabin (Column G in Excel)
    const handleCabinSearch = async () => {
        if (!searchQuery) {
            setMessage({ type: 'error', text: 'Please enter a name first' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await scheduleAPI.getCabin(searchQuery);
            setScheduleData({
                id: searchQuery,
                currentLocation: response.data, 
                scheduledLocation: "Staff Cabin Area",
                lastUpdated: "Just now"
            });
            setShowSchedule(true);
        } catch (err) {
            setMessage({ type: 'error', text: 'Cabin info not found.' });
        } finally {
            setLoading(false);
        }
    };

    // 4. Search Logic - Option 3: Advanced/Custom Search
    const handleAdvancedSearch = async () => {
        if (!searchQuery) {
            setMessage({ type: 'error', text: 'Enter teacher name first' });
            return;
        }
        setLoading(true);
        try {
            const response = await scheduleAPI.searchAdvanced(
                searchQuery, 
                advancedData.day, 
                advancedData.time
            );
            setScheduleData({
                id: searchQuery,
                currentLocation: `Room: ${response.data.roomNo} (${response.data.subject})`,
                scheduledLocation: `${advancedData.day} at ${advancedData.time}`,
                lastUpdated: "Custom Query"
            });
            setShowAdvanced(false);
            setShowSchedule(true);
        } catch (err) {
            setMessage({ type: 'error', text: 'No record found for this specific slot.' });
        } finally {
            setLoading(false);
        }
    };

    // Search for teachers (for the dropdown/list)
    const handleManageSearch = async () => {
        try {
            const response = await scheduleAPI.searchTeachers(searchQuery);
            setTeacherResults(response.data); // This will be the list of User objects (Firstname, Lastname, Email)
        } catch (err) {
            alert("No such user found.");
            setTeacherResults([]);
        }
    };

    // Handle the actual File Upload
    const handleFileUpload = async () => {
        if (!uploadFile) return alert("Please select an Excel file first.");
        try {
            const response = await scheduleAPI.uploadExcel(uploadFile, isUpdateMode);
            alert(response.data.message);
            setUploadFile(null);
            setSelectedTeacher(null);
        } catch (err) {
            alert("Upload failed: " + err.response?.data?.message);
        }
    };

    const handleDelete = async (name) => {
        if (window.confirm(`Are you sure? This will permanently delete all schedules for ${name}.`)) {
            setLoading(true);
            try {
                const response = await scheduleAPI.deleteSchedule(name);
                alert(response.data.message || "Schedule deleted successfully!");
                // List ko refresh karne ke liye search function firse call karein
                handleManageSearch(); 
            } catch (err) {
                alert("Delete failed: " + (err.response?.data || "Server error"));
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="schedule-page">
            <BackButton />

            <div className="schedule-container">
                <header className="schedule-header">

                </header>

                {message.text && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                        <button className="close-alert" onClick={() => setMessage({ type: '', text: '' })}>×</button>
                    </div>
                )}

                <div className="schedule-content">
                    <div className="search-form card">
                        <h3>Teacher Locator</h3>
                        <p className="form-subtitle">Find where a teacher is right now or check their cabin</p>

                        <div className="form-group">
                            <label>Teacher's Name</label>
                            <input
                                type="text"
                                placeholder="Enter teacher name (e.g., Pandey)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        {/* Search Mode Buttons */}
                        <div className="search-sub-modes" style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={handleCabinSearch}>🏠 Sitting Cabin</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdvanced(true)}>📅 Custom Search</button>
                        </div>

                        <button
                            className="btn btn-primary btn-full"
                            onClick={() => {
                                handleSearch(); // Live status ke liye
                                if (isManagementMode) handleManageSearch(); // Office management list ke liye
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Searching...' : '🔍 Locate Teacher Now'}
                        </button>

                        {/* Result Section */}
                        {showSchedule && scheduleData && (
                            <div className="schedule-result" style={{ marginTop: '20px' }}>
                                <div className="location-card teacher-location">
                                    <div className="location-icon">📍</div>
                                    <div className="location-info">
                                        <h4>Search Result</h4>
                                        <div className="location-badges">
                                            <span className="badge badge-success" style={{ fontSize: '1.1rem', padding: '12px' }}>
                                                {scheduleData.currentLocation}
                                            </span>
                                        </div>
                                        <p className="last-updated">Status: {scheduleData.scheduledLocation}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Advanced Search Modal Pop-up */}
                {showAdvanced && (
                    <div 
                        className="modal-overlay" 
                        onClick={() => setShowAdvanced(false)} // 👈 YEH ADD KIYA: Bahar click par band
                    >
                        <div 
                            className="modal card" 
                            onClick={(e) => e.stopPropagation()} // 👈 YEH ADD KIYA: Andar click par band nahi hoga
                        >
                            <h3>📅 Custom Schedule Search</h3>
                            <div className="form-group">
                                <label>Select Day</label>
                                <select 
                                    className="modal-input"
                                    onChange={(e) => setAdvancedData({...advancedData, day: e.target.value})}
                                >
                                    {/* 👈 Tuesday hata diya, Saturday & Sunday add kar diye */}
                                    <option value="Monday">Monday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Select Time</label>
                                <input 
                                    type="time" 
                                    className="modal-input"
                                    onChange={(e) => setAdvancedData({...advancedData, time: e.target.value + ":00"})} 
                                />
                            </div>

                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleAdvancedSearch} // 👈 MAIN FIX: Yahan 'handleSearch' ki jagah 'handleAdvancedSearch' aayega
                                disabled={loading}
                            >
                                {loading ? 'Searching...' : 'Search Schedule'}
                            </button>

                            {/* Modal ke andar Schedule Result dikhane ki zaroorat nahi hai, wo bahar dikhega */}
                        </div>
                    </div>
                )}

                {/* --- Existing Search Button ke theek niche --- */}

                {/* 1. Management Mode: Teacher Results List (Dropdown) */}
                {isManagementMode && teacherResults.length > 0 && (
                    <div className="teacher-results-list card" style={{ marginTop: '20px' }}>
                        <h4>Select Teacher to Manage</h4>
                        {teacherResults.map((t) => (
                            <div key={t.userId} className="teacher-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                                <div>
                                    <strong>{t.firstName} {t.lastName}</strong>
                                    <p style={{ fontSize: '0.8rem', color: 'gray', margin: 0 }}>{t.email}</p>
                                </div>
                                <div className="action-buttons" style={{ display: 'flex', gap: '5px' }}>
                                    <button className="btn-sm" onClick={() => { setSelectedTeacher(t); setIsUpdateMode(false); }}>Add</button>
                                    <button className="btn-sm" onClick={() => { setSelectedTeacher(t); setIsUpdateMode(true); }}>Edit</button>
                                    <button className="btn-sm btn-danger" onClick={() => handleDelete(t.firstName)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Dynamic Upload Section (Appears when Add/Edit is clicked) */}
                {isManagementMode && selectedTeacher && (
                    <div className="upload-section card" style={{ marginTop: '20px', border: '1px solid #007bff', padding: '20px' }}>
                        <h3>{isUpdateMode ? '🔄 Replace' : '➕ Add'} Schedule for {selectedTeacher.firstName}</h3>
                        <p>Choose the Excel sheet for this teacher.</p>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={(e) => setUploadFile(e.target.files[0])} 
                            className="form-control"
                            style={{ marginBottom: '15px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-primary" onClick={handleFileUpload}>
                                {isUpdateMode ? 'Upload New Schedule' : 'Upload Schedule'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setSelectedTeacher(null); setUploadFile(null); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Iske niche aapka existing Result Section {showSchedule && ...} rahega --- */}
            </div>
        </div>
    );
};

export default Schedule;