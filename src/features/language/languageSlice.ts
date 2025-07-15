/**
 * Language Selection Redux Slice
 * Manages the language selection state in Redux
 * @author Labor2Hire Team
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk } from '../../store';
import { configClient } from '../../services/ConfigClient';

// Define types for the language state
export interface LanguageState {
  currentLanguage: string;
  availableLanguages: { code: string; name: string }[];
  isRTL: boolean;
  initialized: boolean;
}

// Define the initial state
const initialState: LanguageState = {
  currentLanguage: 'en',
  availableLanguages: [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
  ],
  isRTL: false,
  initialized: false,
};

// Create the Redux slice
const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    // Set current language
    setLanguage: (state, action: PayloadAction<string>) => {
      state.currentLanguage = action.payload;
      // Set RTL based on language code
      state.isRTL = ['ar', 'he', 'ur'].includes(action.payload);
      state.initialized = true;
    },

    // Update available languages
    setAvailableLanguages: (
      state,
      action: PayloadAction<{ code: string; name: string }[]>
    ) => {
      state.availableLanguages = action.payload;
    },
    
    // Set initialization status
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
  },
});

// Export actions
export const { setLanguage, setAvailableLanguages, setInitialized } = languageSlice.actions;

// Thunk to change language
export const changeLanguage =
  (languageCode: string): AppThunk =>
  async (dispatch) => {
    try {
      // Update Redux state
      dispatch(setLanguage(languageCode));
      
      // Store language preference for future use
      try {
        await configClient.storePreference('userLanguage', languageCode);
      } catch (error) {
        console.error('Failed to store language preference:', error);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

// Thunk to initialize language from saved preference
export const initializeLanguage = (): AppThunk => async (dispatch) => {
  try {
    // Try to get stored language preference
    const savedLanguage = await configClient.getPreference('userLanguage');
    
    if (savedLanguage) {
      dispatch(setLanguage(savedLanguage));
    } else {
      // Mark as initialized even if we use default
      dispatch(setInitialized(true));
    }
  } catch (error) {
    console.error('Failed to initialize language:', error);
    dispatch(setInitialized(true)); // Mark as initialized to prevent blocking
  }
};

// Selectors
export const selectCurrentLanguage = (state: { language: LanguageState }) =>
  state.language.currentLanguage;

export const selectAvailableLanguages = (state: { language: LanguageState }) =>
  state.language.availableLanguages;

export const selectIsRTL = (state: { language: LanguageState }) =>
  state.language.isRTL;

export const selectIsLanguageInitialized = (state: { language: LanguageState }) =>
  state.language.initialized;

export default languageSlice.reducer;
