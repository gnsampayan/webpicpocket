// src/components/NavBar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../utils/auth';
import DarkModeToggle from './DarkModeToggle';
import './NavBar.css';

const NavBar: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout('/');
        } catch (error) {
            console.error('❌ Error during logout:', error);
            // Even if there's an error, still navigate to landing page
            navigate('/');
        }
    };

    // Handle Pockets navigation - always go to main pockets page
    const handlePocketsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/pockets');
    };

    // Handle Contacts navigation - always go to main contacts page
    const handleContactsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/contacts');
    };

    return (
        <nav className="sidebar">
            <div className="sidebar-header">
                <h2>PicPocket</h2>
            </div>
            <ul className="nav-menu">
                <li className="nav-item">
                    <Link to="/dashboard" className="nav-link">
                        <span className="nav-icon">📊</span>
                        Dashboard
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        to="/pockets"
                        className="nav-link"
                        onClick={handlePocketsClick}
                    >
                        <span className="nav-icon">📸</span>
                        Pockets
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        to="/contacts"
                        className="nav-link"
                        onClick={handleContactsClick}
                    >
                        <span className="nav-icon">👥</span>
                        Contacts
                    </Link>
                </li>
                <li className="nav-item">
                    <Link to="/settings" className="nav-link">
                        <span className="nav-icon">⚙️</span>
                        Settings
                    </Link>
                </li>
            </ul>
            <div className="sidebar-footer">
                <div className="theme-toggle-container">
                    <DarkModeToggle size="small" showLabel={true} />
                </div>
                <button className="logout-button" onClick={handleLogout}>
                    <span className="nav-icon">🚪</span>
                    Sign Out
                </button>
            </div>
        </nav>
    );
};

export default NavBar;