// src/components/NavBar.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../../utils/auth';
import DarkModeToggle from './DarkModeToggle';
import styles from './NavBar.module.css';

const NavBar: React.FC = React.memo(() => {
    const navigate = useNavigate();
    const location = useLocation();

    // Initialize state from session storage immediately to prevent animation
    const [isMinimized, setIsMinimized] = useState(() => {
        const savedMinimizedState = sessionStorage.getItem('navbar-minimized');
        return savedMinimizedState === 'true';
    });

    // Initialize CSS custom property on mount without causing animation
    useEffect(() => {
        const savedMinimizedState = sessionStorage.getItem('navbar-minimized');
        const shouldMinimize = savedMinimizedState === 'true';

        // Set CSS custom property immediately without animation
        const sidebarWidth = shouldMinimize ? '70px' : '280px';
        document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);

        // Temporarily disable transitions on mount to prevent animation
        const sidebar = document.querySelector(`.${styles.sidebar}`);
        const mainContents = document.querySelectorAll('[style*="margin-left"]');

        if (sidebar) {
            sidebar.classList.add(styles.noTransition);
        }
        mainContents.forEach(el => {
            (el as HTMLElement).classList.add(styles.noTransition);
        });

        // Re-enable transitions after a brief delay
        setTimeout(() => {
            if (sidebar) {
                sidebar.classList.remove(styles.noTransition);
            }
            mainContents.forEach(el => {
                (el as HTMLElement).classList.remove(styles.noTransition);
            });
        }, 100);

        console.log('🔍 [NavBar] Loaded minimize state from session storage:', shouldMinimize);
    }, []);

    const handleLogout = useCallback(async () => {
        // Show confirmation dialog
        const confirmed = window.confirm('Are you sure you want to sign out?');
        if (!confirmed) {
            return;
        }

        try {
            await logout('/');
        } catch (error) {
            console.error('❌ Error during logout:', error);
            // Even if there's an error, still navigate to landing page
            navigate('/');
        }
    }, [navigate]);

    // Handle Pockets navigation - always go to main pockets page
    const handlePocketsClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        // Clear last selected event card when navigating to pockets
        sessionStorage.removeItem('last-selected-event-card');
        navigate('/pockets');
    }, [navigate]);

    // Handle Contacts navigation - always go to main contacts page
    const handleContactsClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/contacts');
    }, [navigate]);

    // Handle minimize/expand toggle - use useCallback to prevent unnecessary re-renders
    const handleToggleMinimize = useCallback(() => {
        setIsMinimized(currentState => {
            const newMinimizedState = !currentState;

            // Update CSS custom property for sidebar width
            const sidebarWidth = newMinimizedState ? '70px' : '280px';
            document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);

            // Save state to session storage
            sessionStorage.setItem('navbar-minimized', newMinimizedState.toString());

            console.log('💾 [NavBar] Saved minimize state to session storage:', newMinimizedState);

            return newMinimizedState;
        });
    }, []);

    // Helper function to check if a route is active
    const isRouteActive = useCallback((path: string) => {
        if (path === '/pockets') {
            // Check if current path starts with /pockets (includes nested routes)
            return location.pathname.startsWith('/pockets');
        }
        return location.pathname === path;
    }, [location.pathname]);

    // Memoize the navigation content to prevent unnecessary re-renders
    const navigationContent = useMemo(() => (
        <ul className={styles.navMenu}>
            <li className={styles.navItem}>
                <Link
                    to="/pockets"
                    className={`${styles.navLink} ${isRouteActive('/pockets') ? styles.active : ''}`}
                    onClick={handlePocketsClick}
                    title="Pockets"
                >
                    <span className={styles.navIcon}>📸</span>
                    {!isMinimized && <span>Pockets</span>}
                </Link>
            </li>
            <li className={styles.navItem}>
                <Link
                    to="/contacts"
                    className={`${styles.navLink} ${isRouteActive('/contacts') ? styles.active : ''}`}
                    onClick={handleContactsClick}
                    title="Contacts"
                >
                    <span className={styles.navIcon}>👥</span>
                    {!isMinimized && <span>Contacts</span>}
                </Link>
            </li>
            <li className={styles.navItem}>
                <Link
                    to="/settings"
                    className={`${styles.navLink} ${isRouteActive('/settings') ? styles.active : ''}`}
                    title="Settings"
                >
                    <span className={styles.navIcon}>⚙️</span>
                    {!isMinimized && <span>Settings</span>}
                </Link>
            </li>
        </ul>
    ), [isMinimized, handlePocketsClick, handleContactsClick, isRouteActive]);

    // Memoize the footer content
    const footerContent = useMemo(() => (
        <div className={styles.sidebarFooter}>
            <div className={styles.themeToggleContainer}>
                <DarkModeToggle size="small" showLabel={!isMinimized} />
            </div>
            <button className={styles.logoutButton} onClick={handleLogout} title="Sign Out">
                <span className={styles.navIcon}>🚪</span>
                {!isMinimized && <span>Sign Out</span>}
            </button>
        </div>
    ), [isMinimized, handleLogout]);

    return (
        <nav className={`${styles.sidebar} ${isMinimized ? styles.minimized : ''}`}>
            <div className={styles.sidebarHeader}>
                {!isMinimized && <h2>PicPocket</h2>}
            </div>

            {navigationContent}
            {footerContent}

            {/* Minimize/Expand Toggle Button */}
            <button
                className={styles.minimizeToggle}
                onClick={handleToggleMinimize}
                title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
            >
                <span className={styles.toggleIcon}>
                    {isMinimized ? '→' : '←'}
                </span>
            </button>
        </nav>
    );
});

export default NavBar;