/**
 * Main App Component - Backend-Driven UI
 * Renders the main application structure based on backend configuration
 * @author Labor2Hire Team
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
// import the correct member from DynamicRenderer, or fix the import if the default export is used
import DynamicRenderer from './common/DynamicRenderer';
// If DynamicRenderer is not the default export, use:
// import { DynamicRendererProps } from './common/DynamicRenderer';
import {
    initializeRemoteConfig,
    requestScreenConfig,
    selectConfigLoading,
    selectConfigError,
    selectScreenConfig,
    selectConfigConnected,
    setError
} from '../features/remoteConfig/remoteConfigSlice';
import { AppDispatch } from '../store';
import { DynamicScreenRenderer } from './DynamicScreenRenderer';
import { SCREEN_NAMES } from '../constants/ScreenNames';

export const MainApp: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const [currentScreen, setCurrentScreen] = useState<string>(SCREEN_NAMES.CHOOSE_LANGUAGE);
    const [appInitialized, setAppInitialized] = useState(false);

    // Selectors
    const loading = useSelector(selectConfigLoading);
    const error = useSelector(selectConfigError);
    const connected = useSelector(selectConfigConnected);
    const appConfig = useSelector(selectScreenConfig(SCREEN_NAMES.APP));

    useEffect(() => {
        // Initialize remote configuration on app start
        dispatch(initializeRemoteConfig());
    }, [dispatch]);

    useEffect(() => {
        // Request configurations only after connection is established
        if (connected) {
            dispatch(requestScreenConfig(SCREEN_NAMES.APP));
            dispatch(requestScreenConfig(SCREEN_NAMES.CHOOSE_LANGUAGE));
        }
    }, [connected, dispatch]);

    useEffect(() => {
        // Clear any previous errors when connection is restored and we have configs
        if (connected && appConfig && error) {
            dispatch(setError(null));
        }
    }, [connected, appConfig, error, dispatch]);

    useEffect(() => {
        // Set app as initialized once we have the main config
        if (appConfig && !appInitialized) {
            setAppInitialized(true);

            // Get initial screen from config, default to ChooseLanguage for language selection
            const initialRoute = appConfig.navigation?.routes?.find(
                (route: any) => route.name === appConfig.navigation?.initialRoute
            )?.component || SCREEN_NAMES.CHOOSE_LANGUAGE;

            setCurrentScreen(initialRoute);
        }
    }, [appConfig, appInitialized]);

    useEffect(() => {
        // Handle critical connection errors only when the app cannot function
        // Don't show alerts if we have cached configurations and can operate offline
        if (error && (!appConfig && !connected && !Object.keys(appConfig || {}).length)) {
            Alert.alert(
                'Configuration Error',
                error,
                [
                    {
                        text: 'Retry',
                        onPress: () => {
                            dispatch(initializeRemoteConfig());
                        },
                    },
                ]
            );
        }
    }, [error, dispatch, appConfig, connected]);

    // Handle action from dynamic components
    const handleAction = async (action: any, _context?: any) => {
        switch (action.type) {
            case 'selectLanguage':
                // Handle language selection and navigate
                const { languageCode, navigateTo } = action.payload;
                console.log(`Language selected: ${languageCode}, navigating to: ${navigateTo}`);

                // Find the navigation target from app config
                if (navigateTo && appConfig?.navigation?.routes) {
                    const targetRoute = appConfig.navigation.routes.find(
                        (route: any) => route.name === navigateTo
                    );
                    const targetComponent = targetRoute?.component || navigateTo;

                    setCurrentScreen(targetComponent);
                    // Request the next screen config
                    dispatch(requestScreenConfig(targetComponent));
                }
                break;

            case 'navigate':
                // Handle navigation
                const { screen } = action.payload;
                if (screen) {
                    // Find the component for this screen from app config
                    if (appConfig?.navigation?.routes) {
                        const targetRoute = appConfig.navigation.routes.find(
                            (route: any) => route.name === screen
                        );
                        const targetComponent = targetRoute?.component || screen;

                        setCurrentScreen(targetComponent);
                        dispatch(requestScreenConfig(targetComponent));
                    } else {
                        setCurrentScreen(screen);
                        dispatch(requestScreenConfig(screen));
                    }
                }
                break;

            case 'retryLoad':
                // Handle retry loading
                dispatch(initializeRemoteConfig());
                dispatch(requestScreenConfig(SCREEN_NAMES.APP));
                dispatch(requestScreenConfig(currentScreen));
                break;

            case 'reload':
                // Handle app reload
                setAppInitialized(false);
                setCurrentScreen(SCREEN_NAMES.CHOOSE_LANGUAGE);
                dispatch(initializeRemoteConfig());
                dispatch(requestScreenConfig(SCREEN_NAMES.APP));
                dispatch(requestScreenConfig(SCREEN_NAMES.CHOOSE_LANGUAGE));
                break;

            case 'requestOtp':
                // Handle OTP request
                const { phone, navigateTo: otpNavigateTo } = action.payload;
                console.log(`📱 Requesting OTP for phone: ${phone}`);

                // Generate a random 6-digit OTP for development
                const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log(`🔑 Generated OTP: ${generatedOtp} (Use this for testing)`);

                // Navigate to OTP verification screen
                if (otpNavigateTo && appConfig?.navigation?.routes) {
                    const targetRoute = appConfig.navigation.routes.find(
                        (route: any) => route.name === otpNavigateTo
                    );
                    const targetComponent = targetRoute?.component || otpNavigateTo;

                    setCurrentScreen(targetComponent);
                    dispatch(requestScreenConfig(targetComponent));
                }
                break;

            case 'verifyOtp':
                // Handle OTP verification
                const { phone: verifyPhone, otp, navigateTo: verifyNavigateTo } = action.payload;
                console.log(`🔐 Verifying OTP: ${otp} for phone: ${verifyPhone}`);

                // Debug: Check what we received
                console.log(`🔍 Debug - Raw OTP value: "${otp}"`);
                console.log(`🔍 Debug - OTP type: ${typeof otp}`);
                console.log(`🔍 Debug - OTP length: ${otp?.length}`);
                console.log(`🔍 Debug - Action payload:`, JSON.stringify(action.payload, null, 2));

                // For development, accept any 6-digit number as valid OTP
                if (otp && typeof otp === 'string' && otp.length === 6 && /^\d{6}$/.test(otp.trim())) {
                    console.log('✅ OTP verified successfully');

                    // Navigate to next screen if specified
                    if (verifyNavigateTo && appConfig?.navigation?.routes) {
                        const targetRoute = appConfig.navigation.routes.find(
                            (route: any) => route.name === verifyNavigateTo
                        );
                        const targetComponent = targetRoute?.component || verifyNavigateTo;

                        setCurrentScreen(targetComponent);
                        dispatch(requestScreenConfig(targetComponent));
                    }
                } else {
                    console.log('❌ Invalid OTP format. Please enter a 6-digit number.');
                    console.log(`🔍 Debug - Expected: 6-digit string, Got: "${otp}" (type: ${typeof otp}, length: ${otp?.length})`);
                }
                break;

            case 'resendOtp':
                // Handle OTP resend
                const { phone: resendPhone } = action.payload;
                console.log(`🔄 Resending OTP for phone: ${resendPhone}`);

                // Generate a new random 6-digit OTP for development
                const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log(`🔑 New OTP: ${newOtp} (Use this for testing)`);
                break;

            case 'selectRole':
                // Handle role selection and navigate to Categories screen
                const { role, navigateTo: roleNavigateTo } = action.payload;
                console.log(`👤 Role selected: ${role}, navigating to: ${roleNavigateTo}`);

                // Find the navigation target from app config
                if (roleNavigateTo && appConfig?.navigation?.routes) {
                    const targetRoute = appConfig.navigation.routes.find(
                        (route: any) => route.name === roleNavigateTo
                    );
                    const targetComponent = targetRoute?.component || roleNavigateTo;

                    setCurrentScreen(targetComponent);
                    // Request the next screen config
                    dispatch(requestScreenConfig(targetComponent));
                } else if (roleNavigateTo) {
                    // Fallback if no app config routes
                    setCurrentScreen(roleNavigateTo);
                    dispatch(requestScreenConfig(roleNavigateTo));
                }
                break;

            default:
                console.log('Unhandled action:', action);
        }
    };

    // Show loading state if not connected or still loading
    if (!connected || loading || !appInitialized) {
        const loadingConfig = appConfig?.loadingState;

        if (loadingConfig) {
            return (
                <DynamicRenderer
                    componentTree={[loadingConfig]}
                    globalData={{
                        app: { initialized: false, loading: true },
                        user: { isLoggedIn: false },
                        screen: { loading: true, name: 'loading' },
                        language: { current: null, available: ['en', 'hi'], isSelected: false }
                    }}
                    onAction={handleAction}
                />
            );
        }

        // Fallback loading UI
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>
                    Connecting to configuration server...
                </Text>
            </View>
        );
    }

    // Render dynamic screen based on current screen
    return (
        <DynamicScreenRenderer
            currentScreen={currentScreen}
            onAction={handleAction}
            onNavigate={(screen: string) => {
                // Find the component for this screen from app config
                if (appConfig?.navigation?.routes) {
                    const targetRoute = appConfig.navigation.routes.find(
                        (route: any) => route.name === screen
                    );
                    const targetComponent = targetRoute?.component || screen;

                    setCurrentScreen(targetComponent);
                    dispatch(requestScreenConfig(targetComponent));
                } else {
                    setCurrentScreen(screen);
                    dispatch(requestScreenConfig(screen));
                }
            }}
        />
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
});
