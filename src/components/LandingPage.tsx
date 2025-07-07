import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="navbar">
                <div className="container">
                    <div className="nav-logo">
                        <h2>PicPocket</h2>
                    </div>
                    <div className="nav-links">
                        <Link to="/signin" className="nav-link">Sign In</Link>
                        <Link to="/signup" className="nav-button">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-container">
                        <div className="hero-content">
                            <h1 className="hero-title">
                                Share Memories, <span className="highlight">Instantly</span>
                            </h1>
                            <p className="hero-subtitle">
                                The easiest way to share photos and videos with friends and family.
                                No more email attachments or complicated sharing links.
                            </p>
                            <div className="hero-cta">
                                <Link to="/signup" className="cta-button primary">
                                    Start Sharing Now
                                </Link>
                                <div className="download-section">
                                    <p>Download our mobile app</p>
                                    <div className="download-buttons">
                                        <a href="#" className="download-button ios">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                            </svg>
                                            <div>
                                                <span>Download on the</span>
                                                <strong>App Store</strong>
                                            </div>
                                        </a>
                                        <a href="#" className="download-button android">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M16.61 15.15c-.46 0-.84-.37-.84-.84s.37-.84.84-.84.84.37.84.84-.37.84-.84.84m-9.22 0c-.46 0-.84-.37-.84-.84s.37-.84.84-.84.84.37.84.84-.37.84-.84.84m9.42-6.92l1.97-3.4c.08-.14.04-.31-.09-.39-.13-.08-.31-.04-.39.09l-2 3.46c-1.47-.67-3.13-1.04-4.87-1.04s-3.4.37-4.87 1.04l-2-3.46c-.08-.13-.26-.17-.39-.09-.13.08-.17.25-.09.39l1.97 3.4C4.84 10.25 4 12.59 4 15.11v.38c0 .28.22.5.5.5h15c.28 0 .5-.22.5-.5v-.38c0-2.52-.84-4.86-2.69-6.88" />
                                            </svg>
                                            <div>
                                                <span>Get it on</span>
                                                <strong>Google Play</strong>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="hero-image">
                            <div className="phone-mockup">
                                <div className="phone-screen">
                                    <div className="app-interface">
                                        <div className="app-header">
                                            <div className="app-title">PicPocket</div>
                                        </div>
                                        <div className="app-content">
                                            <div className="photo-grid">
                                                <div className="photo-item"></div>
                                                <div className="photo-item"></div>
                                                <div className="photo-item"></div>
                                                <div className="photo-item"></div>
                                                <div className="photo-item"></div>
                                                <div className="photo-item"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <div className="container">
                    <h2>Why Choose PicPocket?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">📱</div>
                            <h3>Cross-Platform</h3>
                            <p>Access your photos from any device, anywhere in the world.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔒</div>
                            <h3>Secure Sharing</h3>
                            <p>End-to-end encryption keeps your memories safe and private.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>Lightning Fast</h3>
                            <p>Share high-quality photos and videos instantly with no compression.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h3>PicPocket</h3>
                            <p>Making photo sharing simple and secure.</p>
                        </div>
                        <div className="footer-section">
                            <h4>Product</h4>
                            <ul>
                                <li><a href="#">Features</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Download</a></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Support</h4>
                            <ul>
                                <li><a href="#">Help Center</a></li>
                                <li><a href="#">Contact Us</a></li>
                                <li><a href="#">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2024 PicPocket. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;