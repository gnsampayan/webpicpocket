import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './DarkModeToggle.css';

interface DarkModeToggleProps {
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    className?: string;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
    size = 'medium',
    showLabel = false,
    className = ''
}) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className={`dark-mode-toggle ${size} ${className}`}>
            {showLabel && (
                <span className="toggle-label">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
            )}
            <button
                onClick={toggleTheme}
                className={`toggle-button ${isDark ? 'dark' : 'light'}`}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
                <div className="toggle-track">
                    <div className="toggle-thumb">
                        <span className="toggle-icon">
                            {isDark ? '🌙' : '☀️'}
                        </span>
                    </div>
                </div>
            </button>
        </div>
    );
};

export default DarkModeToggle; 