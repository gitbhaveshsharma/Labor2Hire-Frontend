/**
 * Main App Component - Backend-Driven UI
 * Renders the main application structure based on backend configuration
 * @author Labor2Hire Team
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { DynamicRenderer } from './common/DynamicRenderer';
import {
    initializeRemoteConfig,
    requestScreenConfig,
    selectConfigLoading,
    selectConfigError,
    selectScreenConfig,
    selectConfigConnected
} from '../features/remoteConfig/remoteConfigSlice';
import { AppDispatch } from '../store';
import { DynamicScreenRenderer } from './DynamicScreenRenderer';

export const MainApp: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const [currentScreen, setCurrentScreen] = useState<string>('Choose.lang');
    const [appInitialized, setAppInitialized] = useState(false);

    // Selectors
    const loading = useSelector(selectConfigLoading);
    const error = useSelector(selectConfigError);
    const connected = useSelector(selectConfigConnected);
    const appConfig = useSelector(selectScreenConfig('App'));

    useEffect(() => {
        // Initialize remote configuration on app start
        dispatch(initializeRemoteConfig());

        // Request main app configuration and initial screen
        dispatch(requestScreenConfig('App'));
        dispatch(requestScreenConfig('Choose.lang'));
    }, [dispatch]);

    useEffect(() => {
        // Set app as initialized once we have the main config
        if (appConfig && !appInitialized) {
            setAppInitialized(true);

            // Get initial screen from config, default to Choose.lang for language selection
            const initialRoute = appConfig.navigation?.routes?.find(
                (route: any) => route.name === appConfig.navigation?.initialRoute
            )?.component || 'Choose.lang';

            setCurrentScreen(initialRoute);
        }
    }, [appConfig, appInitialized]);

    useEffect(() => {
        // Handle connection errors
        if (error) {
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
    }, [error, dispatch]);

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
                dispatch(requestScreenConfig('App'));
                dispatch(requestScreenConfig(currentScreen));
                break;

            case 'reload':
                // Handle app reload
                setAppInitialized(false);
                setCurrentScreen('Choose.lang');
                dispatch(initializeRemoteConfig());
                dispatch(requestScreenConfig('App'));
                dispatch(requestScreenConfig('Choose.lang'));
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
