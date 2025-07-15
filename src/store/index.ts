/**
 * Redux Store Configuration
 * Configures the Redux store with middleware and slices
 * @author Labor2Hire Team
 */

import { configureStore, Action, ThunkAction } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import remoteConfigReducer from '../features/remoteConfig/remoteConfigSlice';
import languageReducer from '../features/language/languageSlice';

// Configure Redux Persist
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['remoteConfig'], // What reducers to persist
};

// Root reducer
const rootReducer = combineReducers({
  remoteConfig: remoteConfigReducer,
  language: languageReducer,
  // Add other reducers here
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Define the AppThunk type for async actions
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
