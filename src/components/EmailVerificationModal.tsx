import React, { useState } from 'react';
import { api } from '../services';
import { clearAllStorage, clearCurrentUserId, setStorageItem, getCurrentUserStorageKeys } from '../utils/storage';
import './EmailVerificationModal.css';

interface EmailVerificationModalProps {
    isVisible: boolean;
    onClose: () => void;
    onEmailVerified: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
    isVisible,
    onClose,
    onEmailVerified
}) => {
    const [isResending, setIsResending] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');

    const handleResendVerification = async () => {
        try {
            setIsResending(true);
            await api.verifyEmail();
            alert('Verification email sent! Please check your email inbox and spam folder for the verification link.');
        } catch (error) {
            console.error('❌ [EmailVerification] Error resending verification:', error);
            alert('Unable to resend verification email. Please try again later.');
        } finally {
            setIsResending(false);
        }
    };

    const handleLogout = async () => {
        try {
            await clearAllStorage();
            await clearCurrentUserId();
            window.location.href = '/signin';
        } catch (error) {
            console.error('❌ [EmailVerification] Error during logout:', error);
        }
    };

    const handleValidateCode = async () => {
        if (!verificationCode || verificationCode.length !== 4) {
            alert('Please enter a valid 4-digit verification code.');
            return;
        }

        try {
            setIsValidating(true);
            const response = await api.validateEmail(verificationCode);

            // Update the access token with the new one from the response
            if (response.access_token) {
                try {
                    const userKeys = await getCurrentUserStorageKeys();
                    await setStorageItem(userKeys.ACCESS_TOKEN, response.access_token);
                    console.log('✅ [EmailVerification] Access token updated after email validation');
                } catch (error) {
                    console.error('❌ [EmailVerification] Failed to update access token:', error);
                }
            }

            onEmailVerified();
            alert('Email verified! Your email has been successfully verified. You can now access all features.');
        } catch (error) {
            console.error('❌ [EmailVerification] Error validating code:', error);
            alert('Invalid verification code. Please check your email and try again.');
        } finally {
            setIsValidating(false);
        }
    };

    // DEV BUTTON - Remove before production
    const handleDevSkipVerification = () => {
        if (confirm('DEV: Skip Email Verification\nThis will mark email as verified (DEV ONLY)')) {
            console.log('🔧 [DEV] Skipping email verification');
            onEmailVerified();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="email-verification-modal">
            <div className="modal-backdrop" onClick={onClose}></div>
            <div className="modal-container">
                {/* DEV BUTTON - TEMPORARY */}
                <button
                    className="dev-button"
                    onClick={handleDevSkipVerification}
                    title="DEV: Skip Email Verification"
                >
                    🐛 DEV
                </button>

                <div className="verification-card">
                    <div className="icon-container">
                        <svg viewBox="0 0 24 24" className="email-icon">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                    </div>

                    <h2 className="title">Verify Your Email</h2>
                    <p className="message">
                        To protect your account and enable all features, please verify your email address.
                        Enter the 4-digit code from your email below.
                    </p>

                    <div className="code-input-container">
                        <input
                            type="text"
                            className="code-input"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="0000"
                            maxLength={4}
                            autoFocus={true}
                        />
                        <button
                            className={`validate-button ${(!verificationCode || verificationCode.length !== 4) ? 'disabled' : ''}`}
                            onClick={handleValidateCode}
                            disabled={isValidating || !verificationCode || verificationCode.length !== 4}
                        >
                            {isValidating ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" className="verify-icon">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                    Verify
                                </>
                            )}
                        </button>
                    </div>

                    <div className="button-container">
                        <button
                            className="primary-button"
                            onClick={handleResendVerification}
                            disabled={isResending}
                        >
                            {isResending ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" className="refresh-icon">
                                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                    </svg>
                                    Resend Email
                                </>
                            )}
                        </button>

                        <button
                            className="secondary-button"
                            onClick={handleLogout}
                        >
                            <svg viewBox="0 0 24 24" className="logout-icon">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                            </svg>
                            Sign Out
                        </button>
                    </div>

                    <p className="footnote">
                        Didn't receive the code? Check your spam folder or try resending the email.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationModal; 