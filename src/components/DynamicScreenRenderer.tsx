/**
 * Dynamic Screen Renderer Component
 * Renders individual screens based on backend configuration
 * 
 * Key Features:
 * - Manages local auth state (phoneNumber, otpCode) 
 * - Automatically handles input field changes via updatePhoneNumber/updateOtpCode actions
 * - Provides template interpolation for {{state.auth.phoneNumber}} and {{state.auth.otpCode}}
 * - Ensures requestOtp and verifyOtp actions get the latest auth state values
 * 
 * @author Labor2Hire Team
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import DynamicRenderer from './common/DynamicRenderer';
import { selectScreenConfig } from '../features/remoteConfig/remoteConfigSlice';
import { SCREEN_NAMES } from '../constants/ScreenNames';

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

    // Local state for auth data that can be updated by actions
    const [authState, setAuthState] = useState({
        phoneNumber: '',
        otpCode: '',
        isAuthenticated: false,
        isLoading: false,
    });

    // Handle action with navigation support
    const handleActionWithNavigation = (action: any, context?: any) => {
        // Update auth state based on action
        if (action.type === 'updateAuthState' && action.payload) {
            setAuthState(prev => ({
                ...prev,
                ...action.payload,
            }));
            return;
        }

        // Handle phone number input
        if (action.type === 'updatePhoneNumber' && action.payload?.phoneNumber !== undefined) {
            console.log('🔢 DynamicScreenRenderer: Updating phone number:', action.payload.phoneNumber);
            setAuthState(prev => ({
                ...prev,
                phoneNumber: action.payload.phoneNumber,
            }));
            return;
        }

        // Handle OTP input
        if (action.type === 'updateOtpCode' && action.payload?.otpCode !== undefined) {
            console.log('🔐 DynamicScreenRenderer: Updating OTP code:', action.payload.otpCode);
            setAuthState(prev => ({
                ...prev,
                otpCode: action.payload.otpCode,
            }));
            return;
        }

        // For requestOtp and verifyOtp actions, ensure we have the latest auth state
        if (action.type === 'requestOtp') {
            console.log('🚀 DynamicScreenRenderer: Processing requestOtp action');
            console.log('🚀 Current auth state:', authState);
            console.log('🚀 Original action payload:', action.payload);

            const updatedAction = {
                ...action,
                payload: {
                    ...action.payload,
                    phone: action.payload.phone || authState.phoneNumber,
                }
            };

            console.log('🚀 Updated requestOtp action payload:', updatedAction.payload);
            onAction(updatedAction, context);
            return;
        }

        if (action.type === 'verifyOtp') {
            console.log('🚀 DynamicScreenRenderer: Processing verifyOtp action');
            console.log('🚀 Current auth state:', authState);
            console.log('🚀 Original action payload:', action.payload);

            const updatedAction = {
                ...action,
                payload: {
                    ...action.payload,
                    phone: action.payload.phone || authState.phoneNumber,
                    otp: action.payload.otp || authState.otpCode,
                }
            };

            console.log('🚀 Updated verifyOtp action payload:', updatedAction.payload);
            onAction(updatedAction, context);
            return;
        }

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
            canGoBack: currentScreen !== SCREEN_NAMES.CHOOSE_LANGUAGE,
            currentRoute: currentScreen,
        },
        // Add auth state that templates can reference
        state: {
            auth: authState,
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
