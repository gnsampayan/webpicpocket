import { getCurrentUserId } from './storage';

/**
 * Check if user is authenticated and redirect to login if not
 * @param navigate - React Router's navigate function
 * @returns Promise<boolean> - true if authenticated, false if redirected
 */
export const checkAuthAndRedirect = async (navigate: (path: string) => void): Promise<boolean> => {
    try {
        const userId = await getCurrentUserId();
        
        if (!userId) {
            console.log('🔒 [Auth] No user found, redirecting to login');
            navigate('/signin');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ [Auth] Error checking authentication:', error);
        console.log('🔒 [Auth] Authentication check failed, redirecting to login');
        navigate('/signin');
        return false;
    }
};

/**
 * Check if user is authenticated without redirecting
 * @returns Promise<boolean> - true if authenticated, false if not
 */
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const userId = await getCurrentUserId();
        return !!userId;
    } catch (error) {
        console.error('❌ [Auth] Error checking authentication:', error);
        return false;
    }
}; 