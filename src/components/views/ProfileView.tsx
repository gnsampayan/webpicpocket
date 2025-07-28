import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ProfileView.module.css';
import { usePublicUserInfo } from '../../hooks/useUsers';

interface ProfileViewProps {
    userId?: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId: propUserId }) => {
    // Get userId from URL params if not provided as prop
    const { userId: paramUserId } = useParams<{ userId: string }>();
    const userId = propUserId || paramUserId;
    const navigate = useNavigate();

    // Modal state
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Fetch public user info
    const { data: userInfo, isLoading, error } = usePublicUserInfo(userId || '');

    if (!userId) {
        return (
            <div className={styles.profileViewPage}>
                <main className={styles.mainContent}>
                    <div className={styles.errorState}>
                        <h2>No User ID Provided</h2>
                        <p>Please provide a valid user ID to view the profile.</p>
                    </div>
                </main>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={styles.profileViewPage}>
                <main className={styles.mainContent}>
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading user profile...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.profileViewPage}>
                <main className={styles.mainContent}>
                    <div className={styles.errorState}>
                        <h2>Error Loading Profile</h2>
                        <p>{error instanceof Error ? error.message : 'Failed to load user profile'}</p>
                        <div className={styles.errorDetails}>
                            <strong>User ID:</strong> {userId}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Get profile picture URL from backend response
    const getProfilePictureUrl = () => {
        if (!userInfo?.profile_picture || userInfo.profile_picture_default) {
            return null;
        }

        // Use the best available URL from backend response
        return userInfo.profile_picture.url_large ||
            userInfo.profile_picture.url_medium ||
            userInfo.profile_picture.url_small;
    };

    const profilePictureUrl = getProfilePictureUrl();

    const handleAvatarClick = () => {
        setShowProfileModal(true);
    };

    const handleCloseModal = () => {
        setShowProfileModal(false);
    };

    return (
        <div className={styles.profileViewPage}>
            <main className={styles.mainContent}>
                {/* Header with back button */}
                <header className={styles.profileHeader}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        <span>←</span>
                        <span>Back</span>
                    </button>
                </header>

                {/* Profile Content */}
                <div className={styles.profileContainer}>
                    {userInfo ? (
                        <>
                            {/* Profile Header Section */}
                            <section className={styles.profileHero}>
                                <div className={styles.profileAvatarContainer}>
                                    {/* Directly use backend response data - make it clickable */}
                                    {profilePictureUrl ? (
                                        <img
                                            src={`https://${profilePictureUrl}`}
                                            alt={`${userInfo.first_name} ${userInfo.last_name}`}
                                            className={`${styles.profileAvatar} ${styles.profileAvatarClickable}`}
                                            onClick={handleAvatarClick}
                                            onError={(e) => {
                                                console.error('Failed to load profile picture:', profilePictureUrl);
                                                // Hide the image and show fallback
                                                e.currentTarget.style.display = 'none';
                                                const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.avatarFallback}`);
                                                if (fallback) {
                                                    (fallback as HTMLElement).style.display = 'flex';
                                                }
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`${styles.avatarFallback} ${styles.profileAvatarClickable}`}
                                        style={{ display: profilePictureUrl ? 'none' : 'flex' }}
                                        onClick={handleAvatarClick}
                                    >
                                        {userInfo.first_name?.charAt(0)?.toUpperCase() || '?'}
                                        {userInfo.last_name?.charAt(0)?.toUpperCase() || ''}
                                    </div>
                                </div>

                                <div className={styles.profileInfo}>
                                    <h1 className={styles.profileName}>
                                        {userInfo.first_name} {userInfo.last_name}
                                    </h1>
                                    <p className={styles.profileUsername}>@{userInfo.username}</p>
                                    <div className={styles.profileBadge}>
                                        <span className={styles.badgeIcon}>✓</span>
                                        <span>PicPocket Member</span>
                                    </div>
                                </div>
                            </section>

                            {/* Profile Stats */}
                            <section className={styles.profileStats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statNumber}>---</span>
                                    <span className={styles.statLabel}>Photos</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statNumber}>---</span>
                                    <span className={styles.statLabel}>Pockets</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statNumber}>---</span>
                                    <span className={styles.statLabel}>Events</span>
                                </div>
                            </section>

                            {/* Profile Bio Section */}
                            <section className={styles.profileBio}>
                                <h2>About</h2>
                                {userInfo.description ? (
                                    <p>{userInfo.description}</p>
                                ) : (
                                    <p className={styles.noBio}>This user hasn't added a bio yet.</p>
                                )}
                            </section>

                            {/* Activity Section */}
                            <section className={styles.profileActivity}>
                                <h2>Recent Activity</h2>
                                <div className={styles.activityPlaceholder}>
                                    <p>No recent activity to display</p>
                                </div>
                            </section>
                        </>
                    ) : (
                        <div className={styles.profileNotFound}>
                            <h2>Profile Not Found</h2>
                            <p>This user's profile could not be loaded.</p>
                        </div>
                    )}
                </div>

                {/* Profile Picture Modal */}
                {showProfileModal && userInfo && (
                    <div className={styles.profileModalOverlay} onClick={handleCloseModal}>
                        <div className={styles.profileModalContent} onClick={(e) => e.stopPropagation()}>
                            <button className={styles.profileModalClose} onClick={handleCloseModal}>
                                ×
                            </button>
                            {userInfo.profile_picture_default || !profilePictureUrl ? (
                                <div className={styles.profileModalEmptyState}>
                                    <div className={styles.emptyStateIcon}>👤</div>
                                    <h3>No Profile Picture</h3>
                                    <p>This user is using the default profile picture.</p>
                                </div>
                            ) : (
                                <img
                                    src={`https://${profilePictureUrl}`}
                                    alt={`${userInfo.first_name} ${userInfo.last_name}`}
                                    className={styles.profileModalImage}
                                    onError={(e) => {
                                        // If the image fails to load in modal, show empty state
                                        const modal = e.currentTarget.parentElement;
                                        if (modal) {
                                            modal.innerHTML = `
                                                <button class="${styles.profileModalClose}">×</button>
                                                <div class="${styles.profileModalEmptyState}">
                                                    <div class="${styles.emptyStateIcon}">👤</div>
                                                    <h3>Image Not Available</h3>
                                                    <p>Failed to load profile picture.</p>
                                                </div>
                                            `;
                                            const closeBtn = modal.querySelector(`.${styles.profileModalClose}`);
                                            if (closeBtn) {
                                                closeBtn.addEventListener('click', handleCloseModal);
                                            }
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProfileView; 