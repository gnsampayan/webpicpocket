import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isAuthError, AUTH_ERRORS } from '../services';
import type { RegisterData } from '../services';
import './SignUp.css';

const SignUp: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const navigate = useNavigate();

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
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain uppercase, lowercase, and number';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.agreeToTerms) {
            newErrors.agreeToTerms = 'You must agree to the terms and conditions';
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
            const registerData: RegisterData = {
                username: formData.username.trim(),
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
                email: formData.email.trim(),
                password: formData.password
            };

            const response = await api.register(registerData);

            console.log('Sign up successful:', response);

            // Show success message and redirect to signin
            alert('Registration successful! Please sign in with your new account.');
            navigate('/signin');

        } catch (error) {
            console.error('Sign up failed:', error);

            if (isAuthError(error)) {
                // Handle specific auth errors with user-friendly messages
                if (error.message === AUTH_ERRORS.EMAIL_ALREADY_REGISTERED) {
                    setApiError('This email is already registered. Please try signing in instead.');
                } else if (error.message === AUTH_ERRORS.NETWORK_ERROR) {
                    setApiError('Unable to connect to server. Please check your internet connection.');
                } else {
                    setApiError(error.message);
                }
            } else if (error instanceof Error) {
                // Handle other specific errors
                if (error.message.includes('username') && error.message.includes('already')) {
                    setApiError('This username is already taken. Please choose another one.');
                } else if (error.message.includes('email') && error.message.includes('already')) {
                    setApiError('This email is already registered. Please try signing in instead.');
                } else {
                    setApiError(error.message);
                }
            } else {
                setApiError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialSignUp = (provider: string) => {
        console.log(`Signing up with ${provider}`);
        // TODO: Implement social sign up
        setApiError(`${provider} sign up is not yet implemented.`);
    };

    const getPasswordStrength = () => {
        if (!formData.password) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (formData.password.length >= 8) strength++;
        if (/[a-z]/.test(formData.password)) strength++;
        if (/[A-Z]/.test(formData.password)) strength++;
        if (/\d/.test(formData.password)) strength++;
        if (/[^A-Za-z0-9]/.test(formData.password)) strength++;

        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71'];

        return {
            strength: Math.min(strength, 4),
            label: labels[Math.min(strength - 1, 4)],
            color: colors[Math.min(strength - 1, 4)]
        };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="signup-page">
            <div className="container">
                <div className="signup-container">
                    <div className="signup-header">
                        <Link to="/" className="logo">
                            <h1>PicPocket</h1>
                        </Link>
                        <h2>Create your account</h2>
                        <p>Join millions of users sharing memories with PicPocket</p>
                    </div>

                    <form className="signup-form" onSubmit={handleSubmit}>
                        {apiError && (
                            <div className="api-error">
                                <span className="error-message">{apiError}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={errors.username ? 'error' : ''}
                                placeholder="Choose a unique username"
                                disabled={isLoading}
                                autoComplete="username"
                            />
                            {errors.username && <span className="error-message">{errors.username}</span>}
                        </div>

                        <div className="name-group">
                            <div className="form-group">
                                <label htmlFor="firstName">First name</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className={errors.firstName ? 'error' : ''}
                                    placeholder="Enter your first name"
                                    disabled={isLoading}
                                    autoComplete="given-name"
                                />
                                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="lastName">Last name</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className={errors.lastName ? 'error' : ''}
                                    placeholder="Enter your last name"
                                    disabled={isLoading}
                                    autoComplete="family-name"
                                />
                                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? 'error' : ''}
                                placeholder="Enter your email"
                                disabled={isLoading}
                                autoComplete="email"
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={errors.password ? 'error' : ''}
                                placeholder="Create a strong password"
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                            {formData.password && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: `${(passwordStrength.strength / 4) * 100}%`,
                                                backgroundColor: passwordStrength.color
                                            }}
                                        ></div>
                                    </div>
                                    <span className="strength-label" style={{ color: passwordStrength.color }}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                            {errors.password && <span className="error-message">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={errors.confirmPassword ? 'error' : ''}
                                placeholder="Confirm your password"
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                        </div>

                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="agreeToTerms"
                                    checked={formData.agreeToTerms}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                <span className="checkmark"></span>
                                I agree to the&nbsp;
                                <Link to="/terms" className="terms-link">Terms of Service</Link>
                                &nbsp;and&nbsp;
                                <Link to="/privacy" className="terms-link">Privacy Policy</Link>
                            </label>
                            {errors.agreeToTerms && <span className="error-message">{errors.agreeToTerms}</span>}
                        </div>

                        <button
                            type="submit"
                            className={`signup-button ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner"></div>
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="divider">
                        <span>or sign up with</span>
                    </div>

                    <div className="social-signup">
                        <button
                            type="button"
                            className="social-button google"
                            onClick={() => handleSocialSignUp('Google')}
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                        <button
                            type="button"
                            className="social-button apple"
                            onClick={() => handleSocialSignUp('Apple')}
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            Continue with Apple
                        </button>
                    </div>

                    <div className="signup-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/signin" className="signin-link">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp; 