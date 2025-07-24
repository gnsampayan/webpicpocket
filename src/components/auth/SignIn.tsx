import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isAuthError, AUTH_ERRORS } from '../../services';
import { attemptAutoAuthentication } from '../../utils/auth';
import type { LoginData } from '../../services';
import styles from './SignIn.module.css';

const SignIn: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const navigate = useNavigate();

    // Check for existing authentication when component mounts
    useEffect(() => {
        const checkExistingAuth = async () => {
            try {
                setIsCheckingAuth(true);
                const isAuthenticated = await attemptAutoAuthentication();

                if (isAuthenticated) {
                    console.log("🔐 [SignIn] User already authenticated, redirecting to pockets");
                    navigate('/pockets');
                    return;
                }

                console.log("🔓 [SignIn] No valid authentication found, staying on sign in page");
            } catch (error) {
                console.error("❌ [SignIn] Error checking existing authentication:", error);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkExistingAuth();
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        // Clear API error when user starts typing
        if (apiError) {
            setApiError('');
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.trim().length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');

        try {
            const loginData: LoginData = {
                username: formData.username.trim(),
                password: formData.password
            };

            const response = await api.login(loginData, formData.rememberMe);

            console.log('Sign in successful:', response);

            // Handle successful sign in - redirect to pockets
            navigate('/pockets');

        } catch (error) {
            console.error('Sign in failed:', error);

            if (isAuthError(error)) {
                // Handle specific auth errors with user-friendly messages
                if (error.message.includes('Invalid') || error.message.includes('credentials')) {
                    setApiError('Invalid username or password. Please try again.');
                } else if (error.message === AUTH_ERRORS.EMAIL_NOT_VERIFIED) {
                    setApiError('Please verify your email address before signing in.');
                } else if (error.message === AUTH_ERRORS.NETWORK_ERROR) {
                    setApiError('Unable to connect to server. Please check your internet connection.');
                } else {
                    setApiError(error.message);
                }
            } else if (error instanceof Error) {
                setApiError(error.message);
            } else {
                setApiError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading spinner while checking authentication
    if (isCheckingAuth) {
        return (
            <div className={styles.signinPage}>
                <div className="container">
                    <div className={styles.signinContainer}>
                        <div className={styles.signinHeader}>
                            <Link to="/" className={styles.logo}>
                                <h1>PicPocket</h1>
                            </Link>
                            <h2>Checking authentication...</h2>
                        </div>
                        <div className={styles.signinForm} style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className={styles.spinner}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.signinPage}>
            <div className="container">
                <div className={styles.signinContainer}>
                    <div className={styles.signinHeader}>
                        <Link to="/" className={styles.logo}>
                            <h1>PicPocket</h1>
                        </Link>
                        <h2>Welcome back</h2>
                        <p>Sign in to your account to continue sharing memories</p>
                    </div>

                    <form className={styles.signinForm} onSubmit={handleSubmit}>
                        {apiError && (
                            <div className={styles.apiError}>
                                <span className={styles.errorMessage}>{apiError}</span>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={errors.username ? 'error' : ''}
                                placeholder="Enter your username"
                                disabled={isLoading}
                                autoComplete="username"
                            />
                            {errors.username && <span className={styles.errorMessage}>{errors.username}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={errors.password ? 'error' : ''}
                                placeholder="Enter your password"
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                            {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
                        </div>

                        <div className={styles.formOptions}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                <span className={styles.checkmark}></span>
                                Remember me
                            </label>
                            <Link to="/forgot-password" className={styles.forgotPassword}>
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className={`${styles.signinButton} ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className={styles.spinner}></div>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className={styles.signinFooter}>
                        <p>
                            Don't have an account?{' '}
                            <Link to="/signup" className={styles.signupLink}>
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn; 