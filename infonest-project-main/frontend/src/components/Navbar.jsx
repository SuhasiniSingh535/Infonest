import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();

    const goToDashboard = () => {
        if (user?.role === 'ADMIN') return '/admin';
        if (user?.role === 'FACULTY') return '/faculty';
        return '/dashboard';
    };

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo">
                    <img src="/logoo.png" alt="Logo" className="logo-image" />
                </Link>

                <div className="header-actions">
                    {isAuthenticated && (
                        <span className="user-info">Hi, {user?.firstName || 'User'}!</span>
                    )}

                    {isAuthenticated ? (
                        <>
                            <Link to={goToDashboard()} className="btn btn-secondary">
                                My Dashboard
                            </Link>
                            <button onClick={logout} className="btn btn-secondary">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary">Sign In</Link>
                            <Link to="/signup" className="btn btn-primary">Create Account</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
