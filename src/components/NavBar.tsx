// src/components/NavBar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NavBar.css';

const NavBar: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        console.log('Logging out...');
        // Add your logout logic here
        navigate('/'); // Navigate to the landing page
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
                    <Link to="/pockets" className="nav-link">
                        <span className="nav-icon">📸</span>
                        Pockets
                    </Link>
                </li>
                <li className="nav-item">
                    <Link to="/contacts" className="nav-link">
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
                <button className="logout-button" onClick={handleLogout}>
                    <span className="nav-icon">🚪</span>
                    Sign Out
                </button>
            </div>
        </nav>
    );
};

export default NavBar;