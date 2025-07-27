/**
 * Remote Configuration Redux Slice
 * Manages the remote configuration state in Redux
 * @author Labor2Hire Team
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk } from '../../store';
import configClient from '../../services/ConfigClient';

// Define types for the configuration state
export interface RemoteConfigState {
  configs: Record<string, any>;
  loading: boolean;
  error: string | null;
  connected: boolean;
  connectionStatus: string;
  lastUpdated: string | null;
}

// Define the initial state
const initialState: RemoteConfigState = {
  configs: {},
  loading: false,
  error: null,
  connected: false,
  connectionStatus: 'disconnected',
  lastUpdated: null,
};

// Create the Redux slice
const remoteConfigSlice = createSlice({
  name: 'remoteConfig',
  initialState,
  reducers: {
    // Set connection status
    setConnectionStatus: (
      state,
      action: PayloadAction<{ connected: boolean; status: string }>
    ) => {
      state.connected = action.payload.connected;
      state.connectionStatus = action.payload.status;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Update specific screen configuration
    updateScreenConfig: (
      state,
      action: PayloadAction<{ screen: string; config: any }>
    ) => {
      state.configs[action.payload.screen] = action.payload.config;
      state.lastUpdated = new Date().toISOString();
    },

    // Update all configurations
    updateAllConfigs: (state, action: PayloadAction<Record<string, any>>) => {
      state.configs = { ...action.payload };
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
    },
  },
});

// Export actions
export const {
  setConnectionStatus,
  setLoading,
  setError,
  updateScreenConfig,
  updateAllConfigs,
} = remoteConfigSlice.actions;

// Thunk to initialize remote configuration
export const initializeRemoteConfig = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true));

  try {
    // Setup event handlers
    configClient.options.onConfigUpdate = (screen, config, _data) => {
      dispatch(updateScreenConfig({ screen, config }));
      dispatch(setLoading(false)); // Clear loading state when config is received
    };

    configClient.options.onFullConfigSync = (configs, _data) => {
      dispatch(updateAllConfigs(configs));
      dispatch(setLoading(false)); // Clear loading state when full sync is received
    };

    configClient.options.onConnectionChange = (connected, reason) => {
      dispatch(
        setConnectionStatus({
          connected,
          status: connected ? 'connected' : reason,
        })
      );
    };

    configClient.options.onError = (type, error) => {
      dispatch(setError(`${type}: ${error.message || 'Unknown error'}`));
    };

    // Connect to server
    configClient.connect();
  } catch (error: any) {
    dispatch(setError(error.message || 'Failed to initialize remote configuration'));
  }
};

// Thunk to request screen configuration
export const requestScreenConfig =
  (screenName: string): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const existingConfig = state.remoteConfig.configs[screenName];
    
    // If config already exists and we're connected, don't set loading
    if (existingConfig && state.remoteConfig.connected) {
      configClient.requestScreenConfig(screenName);
      return;
    }
    
    // Only set loading if we don't have cached config
    if (!existingConfig) {
      dispatch(setLoading(true));
    }

    try {
      // Request screen config
      configClient.requestScreenConfig(screenName);
      
      // If we have cached config, clear loading state after a short delay
      if (existingConfig) {
        setTimeout(() => {
          dispatch(setLoading(false));
        }, 100);
      }
    } catch (error: any) {
      dispatch(setError(error.message || `Failed to request ${screenName} configuration`));
    }
  };

// Thunk to request all configurations
export const requestAllConfigs = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true));

  try {
    // Request all configs
    configClient.requestFullConfig();
  } catch (error: any) {
    dispatch(setError(error.message || 'Failed to request all configurations'));
  }
};

// Selectors
export const selectConfigConnected = (state: { remoteConfig: RemoteConfigState }) =>
  state.remoteConfig.connected;

export const selectConnectionStatus = (state: { remoteConfig: RemoteConfigState }) =>
  state.remoteConfig.connectionStatus;

export const selectScreenConfig = (screenName: string) => 
  (state: { remoteConfig: RemoteConfigState }) =>
    state.remoteConfig.configs[screenName] || null;

export const selectAllConfigs = (state: { remoteConfig: RemoteConfigState }) =>
  state.remoteConfig.configs;

export const selectConfigLoading = (state: { remoteConfig: RemoteConfigState }) =>
  state.remoteConfig.loading;

export const selectConfigError = (state: { remoteConfig: RemoteConfigState }) =>
  state.remoteConfig.error;

export default remoteConfigSlice.reducer;
