/**
 * Screen Name Constants
 * Centralized screen naming to ensure frontend-backend consistency
 * @author Labor2Hire Team
 */

export const SCREEN_NAMES = {
    // Language Selection Screen
    CHOOSE_LANGUAGE: 'ChooseLanguage',
    
    // Main App Screen
    APP: 'App',
    
    // Authentication Screens
    AUTH: 'Auth',
    OTP_VERIFICATION: 'OTPVerification',
    LOGIN: 'Login',
    REGISTER: 'Register',
    
    // Home Screen
    HOME: 'Home',
    
    // Profile Screens
    PROFILE: 'Profile',
    EDIT_PROFILE: 'EditProfile',
    
    // Job Related Screens
    JOB_SEARCH: 'JobSearch',
    JOB_DETAILS: 'JobDetails',
    JOB_APPLICATION: 'JobApplication',
    
    // Settings
    SETTINGS: 'Settings',
    
    // Error and Loading States
    ERROR: 'Error',
    LOADING: 'Loading',
} as const;

// Type for screen names
export type ScreenName = typeof SCREEN_NAMES[keyof typeof SCREEN_NAMES];

// Validation function
export const isValidScreenName = (screenName: string): screenName is ScreenName => {
    return Object.values(SCREEN_NAMES).includes(screenName as ScreenName);
};

// Get screen name with validation
export const getScreenName = (screenName: string): ScreenName => {
    if (isValidScreenName(screenName)) {
        return screenName;
    }
    
    console.warn(`Invalid screen name: ${screenName}, defaulting to ${SCREEN_NAMES.ERROR}`);
    return SCREEN_NAMES.ERROR;
};

export default SCREEN_NAMES;
