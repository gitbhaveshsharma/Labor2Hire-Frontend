/**
 * Dynamic Screen Renderer Component
 * Renders individual screens based on backend configuration
 * @author Labor2Hire Team
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import { DynamicRenderer } from './common/DynamicRenderer';
import { selectScreenConfig } from '../features/remoteConfig/remoteConfigSlice';

interface DynamicScreenRendererProps {
    currentScreen: string;
    onAction: (action: any, context?: any) => void;
    onNavigate: (screen: string) => void;
}

export const DynamicScreenRenderer: React.FC<DynamicScreenRendererProps> = ({
    currentScreen,
    onAction,
    onNavigate,
}) => {
    // Get the configuration for the current screen
    const screenConfig = useSelector(selectScreenConfig(currentScreen));

    // Handle action with navigation support
    const handleActionWithNavigation = (action: any, context?: any) => {
        // Check if this is a navigation action
        if (action.type === 'navigate' && action.payload?.screen) {
            onNavigate(action.payload.screen);
            return;
        }

        // Check if this is a language selection action with navigation
        if (action.type === 'selectLanguage' && action.payload?.navigateTo) {
            onNavigate(action.payload.navigateTo);
            return;
        }

        // Check if this is a retry action
        if (action.type === 'retryLoad') {
            onAction(action, context);
            return;
        }

        // Check if this is a reload action
        if (action.type === 'reload') {
            onAction(action, context);
            return;
        }

        // Pass other actions to the parent handler
        onAction(action, context);
    };

    // Global data that can be accessed by all components
    const globalData = {
        app: {
            initialized: true,
            currentScreen,
            version: '1.0.0',
        },
        user: {
            isLoggedIn: false,
            isOnboarded: false,
        },
        screen: {
            loading: false,
            name: currentScreen,
        },
        language: {
            current: 'en',
            available: ['en', 'hi'],
            isSelected: false,
        },
        navigation: {
            canGoBack: currentScreen !== 'Choose.lang',
            currentRoute: currentScreen,
        },
    };

    // Show error state if no configuration is found
    if (!screenConfig) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    Screen configuration not found: {currentScreen}
                </Text>
                <Text style={styles.errorSubtext}>
                    Please check your remote configuration setup.
                </Text>
            </View>
        );
    }

    // Show loading state if screen config is loading
    if (screenConfig.loadingState && !screenConfig.components) {
        return (
            <DynamicRenderer
                componentTree={[screenConfig.loadingState]}
                globalData={globalData}
                onAction={handleActionWithNavigation}
            />
        );
    }

    // Show error state if screen config has an error state and no components
    if (screenConfig.errorState && !screenConfig.components) {
        return (
            <DynamicRenderer
                componentTree={[screenConfig.errorState]}
                globalData={globalData}
                onAction={handleActionWithNavigation}
            />
        );
    }

    // Render the main screen components
    return (
        <DynamicRenderer
            componentTree={screenConfig.components || []}
            globalData={globalData}
            onAction={handleActionWithNavigation}
        />
    );
};

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
    },
    errorText: {
        fontSize: 18,
        color: '#ff3333',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: 'bold',
    },
    errorSubtext: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
    },
});
