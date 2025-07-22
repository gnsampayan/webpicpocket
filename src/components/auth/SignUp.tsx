import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isAuthError, AUTH_ERRORS } from '../../services';
import { attemptAutoAuthentication } from '../../utils/auth';
import type { RegisterData } from '../../services';
import { validateSignUpForm } from '../../utils/validation';
import { useEmailVerification } from '../../context/EmailVerificationContext';
import styles from './SignUp.module.css';

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
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const navigate = useNavigate();
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();

    // Check for existing authentication when component mounts
    useEffect(() => {
        const checkExistingAuth = async () => {
            try {
                setIsCheckingAuth(true);
                const isAuthenticated = await attemptAutoAuthentication();

                if (isAuthenticated) {
                    console.log("🔐 [SignUp] User already authenticated, redirecting to dashboard");
                    navigate('/dashboard');
                    return;
                }

                console.log("🔓 [SignUp] No valid authentication found, staying on sign up page");
            } catch (error) {
                console.error("❌ [SignUp] Error checking existing authentication:", error);
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
        const result = validateSignUpForm(formData);

        if (result.success) {
            setErrors({});
            return true;
        } else {
            setErrors(result.errors || {});
            return false;
        }
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

            // Set up email verification callback to redirect after verification
            setEmailVerifiedCallback(() => () => {
                navigate('/signin');
            });

            // Show email verification modal
            showEmailVerification();

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

    const getPasswordStrength = () => {
        if (!formData.password) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (formData.password.length >= 8) strength++;
        if (/[A-Z]/.test(formData.password)) strength++;
        if (/\d/.test(formData.password)) strength++;

        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2ecc71'];

        return {
            strength: Math.min(strength, 4),
            label: labels[Math.min(strength - 1, 4)],
            color: colors[Math.min(strength - 1, 4)]
        };
    };

    const passwordStrength = getPasswordStrength();

    // Show loading spinner while checking authentication
    if (isCheckingAuth) {
        return (
            <div className={styles.signupPage}>
                <div className="container">
                    <div className={styles.signupContainer}>
                        <div className={styles.signupHeader}>
                            <Link to="/" className={styles.logo}>
                                <h1>PicPocket</h1>
                            </Link>
                            <h2>Checking authentication...</h2>
                        </div>
                        <div className={styles.signupForm} style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className={styles.spinner}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.signupPage}>
            <div className="container">
                <div className={styles.signupContainer}>
                    <div className={styles.signupHeader}>
                        <Link to="/" className={styles.logo}>
                            <h1>PicPocket</h1>
                        </Link>
                        <h2>Create your account</h2>
                        <p>Join millions of users sharing memories with PicPocket</p>
                    </div>

                    <form className={styles.signupForm} onSubmit={handleSubmit}>
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
                                placeholder="Choose a unique username"
                                disabled={isLoading}
                                autoComplete="username"
                            />
                            {errors.username && <span className={styles.errorMessage}>{errors.username}</span>}
                        </div>

                        <div className={styles.nameGroup}>
                            <div className={styles.formGroup}>
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
                                {errors.firstName && <span className={styles.errorMessage}>{errors.firstName}</span>}
                            </div>

                            <div className={styles.formGroup}>
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
                                {errors.lastName && <span className={styles.errorMessage}>{errors.lastName}</span>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
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
                            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
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
                                placeholder="Create a strong password"
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                            {formData.password && (
                                <div className={styles.passwordStrength}>
                                    <div className={styles.strengthBar}>
                                        <div
                                            className={styles.strengthFill}
                                            style={{
                                                width: `${(passwordStrength.strength / 4) * 100}%`,
                                                backgroundColor: passwordStrength.color
                                            }}
                                        ></div>
                                    </div>
                                    <span className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                            {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
                        </div>

                        <div className={styles.formGroup}>
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
                            {errors.confirmPassword && <span className={styles.errorMessage}>{errors.confirmPassword}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="agreeToTerms"
                                    checked={formData.agreeToTerms}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                <span className={styles.checkmark}></span>
                                I agree to the&nbsp;
                                <Link to="/terms" className={styles.termsLink}>Terms of Service</Link>
                                &nbsp;and&nbsp;
                                <Link to="/privacy" className={styles.termsLink}>Privacy Policy</Link>
                            </label>
                            {errors.agreeToTerms && <span className={styles.errorMessage}>{errors.agreeToTerms}</span>}
                        </div>

                        <button
                            type="submit"
                            className={`${styles.signupButton} ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className={styles.spinner}></div>
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className={styles.signupFooter}>
                        <p>
                            Already have an account?{' '}
                            <Link to="/signin" className={styles.signinLink}>
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