import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthAndRedirect } from '../utils/auth';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const authenticated = await checkAuthAndRedirect(navigate);
            setIsAuthenticated(authenticated);
        };

        checkAuth();
    }, [navigate]);

    // Show loading state while checking authentication
    if (isAuthenticated === null) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Checking authentication...</p>
            </div>
        );
    }

    // If not authenticated, don't render children (redirect will happen)
    if (!isAuthenticated) {
        return null;
    }

    // If authenticated, render the protected content
    return <>{children}</>;
};

export default ProtectedRoute; 