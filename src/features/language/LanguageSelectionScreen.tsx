/**
 * Language Selection Screen
 * 100% Backend-Driven Dynamic UI using component trees
 * Renders UI dynamically from backend-supplied component definitions
 * This approach allows for complete UI control from backend (like Netflix, Facebook, etc.)
 * @author Labor2Hire Team
 */

import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { changeLanguage, setAvailableLanguages } from './languageSlice';
import { requestScreenConfig, selectScreenConfig, selectConfigLoading } from '../remoteConfig/remoteConfigSlice';
import { AppDispatch } from '../../store';
import DynamicRenderer, { ComponentDefinition, ActionDefinition } from '../../components/common/DynamicRenderer';
import { SCREEN_NAMES } from '../../constants/ScreenNames';

// Screen identifier for config service
const SCREEN_NAME = SCREEN_NAMES.CHOOSE_LANGUAGE;

// Interface for the dynamic screen configuration
interface DynamicScreenConfig {
    screenType: string;
    metadata: {
        screenTitle: string;
        description: string;
        version: string;
        lastUpdated: string;
    };
    globalStyles: Record<string, any>;
    components: ComponentDefinition[];
    loadingState: ComponentDefinition;
    errorState?: ComponentDefinition;
}

/**
 * Main Language Selection Screen - Backend-driven Dynamic UI
 * No hardcoded UI components - everything is rendered from backend config
 */
const LanguageSelectionScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigation = useNavigation();
    const config = useSelector(selectScreenConfig(SCREEN_NAME)) as DynamicScreenConfig;
    const loading = useSelector(selectConfigLoading);

    // Request screen configuration on mount
    useEffect(() => {
        dispatch(requestScreenConfig(SCREEN_NAME));
    }, [dispatch]);

    // Custom action handler for screen-specific actions
    const handleCustomAction = async (action: ActionDefinition, _context?: any) => {
        const { type, payload } = action;

        switch (type) {
            case 'selectLanguage':
                const { languageCode, navigateTo } = payload || {};
                if (languageCode) {
                    // Update Redux state
                    dispatch(changeLanguage(languageCode));

                    // Extract and set available languages if present in config
                    if (config?.components) {
                        const languages = extractLanguageOptions(config.components);
                        if (languages.length > 0) {
                            dispatch(setAvailableLanguages(languages));
                        }
                    }

                    // Navigate to next screen
                    if (navigateTo) {
                        // @ts-ignore - Navigation typing issue
                        navigation.navigate(navigateTo);
                    }
                }
                break;

            case 'retryLoad':
                dispatch(requestScreenConfig(SCREEN_NAME));
                break;

            case 'showInfo':
                Alert.alert(
                    payload?.title || 'Information',
                    payload?.message || 'This is backend-driven dynamic UI.',
                    [{ text: 'OK' }]
                );
                break;

            default:
                console.log(`Custom action not handled: ${type}`, payload);
                throw new Error(`Unhandled action: ${type}`);
        }
    };

    // Helper function to extract language options from component tree
    const extractLanguageOptions = (components: ComponentDefinition[]): Array<{ code: string, name: string }> => {
        const languages: Array<{ code: string, name: string }> = [];

        const findLanguageButtons = (comps: ComponentDefinition[]) => {
            comps.forEach(comp => {
                if (comp.type === 'TouchableOpacity' && comp.actions?.onPress?.type === 'selectLanguage') {
                    const languageCode = comp.actions.onPress.payload?.languageCode;
                    const languageName = comp.children?.find(child => child.type === 'Text')?.props?.text;

                    if (languageCode && languageName) {
                        languages.push({ code: languageCode, name: languageName });
                    }
                }

                if (comp.children) {
                    findLanguageButtons(comp.children);
                }
            });
        };

        findLanguageButtons(components);
        return languages;
    };

    // Show loading state using dynamic component tree
    if (loading || !config) {
        // Default loading component tree if config is not available
        const defaultLoadingComponents: ComponentDefinition[] = [
            {
                type: 'SafeAreaView',
                style: {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#ffffff'
                },
                children: [
                    {
                        type: 'StatusBar',
                        props: {
                            barStyle: 'dark-content',
                            backgroundColor: '#ffffff'
                        }
                    },
                    {
                        type: 'ActivityIndicator',
                        props: {
                            size: 'large',
                            color: '#000000ff'
                        }
                    },
                    {
                        type: 'Text',
                        props: {
                            text: 'Loading language options...'
                        },
                        style: {
                            marginTop: 16,
                            fontSize: 16,
                            color: '#333333',
                            textAlign: 'center'
                        }
                    }
                ]
            }
        ];

        return (
            <DynamicRenderer
                componentTree={config?.loadingState ? [config.loadingState] : defaultLoadingComponents}
                globalData={{
                    screen: { name: SCREEN_NAME, loading: true },
                    user: { isLoggedIn: false },
                }}
                onAction={handleCustomAction}
            />
        );
    }

    // Show error state if config load failed
    if (!config.components) {
        const errorComponents: ComponentDefinition[] = [
            {
                type: 'SafeAreaView',
                style: {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    padding: 20
                },
                children: [
                    {
                        type: 'Text',
                        props: {
                            text: 'Failed to load screen configuration'
                        },
                        style: {
                            fontSize: 18,
                            color: '#ff0000',
                            textAlign: 'center',
                            marginBottom: 20
                        }
                    },
                    {
                        type: 'TouchableOpacity',
                        style: {
                            backgroundColor: '#0d3967ff',
                            padding: 12,
                            borderRadius: 8
                        },
                        actions: {
                            onPress: {
                                type: 'retryLoad'
                            }
                        },
                        children: [
                            {
                                type: 'Text',
                                props: {
                                    text: 'Retry'
                                },
                                style: {
                                    color: '#ffffff',
                                    fontWeight: 'bold'
                                }
                            }
                        ]
                    }
                ]
            }
        ];

        return (
            <DynamicRenderer
                componentTree={config?.errorState ? [config.errorState] : errorComponents}
                onAction={handleCustomAction}
            />
        );
    }

    // Render the dynamic component tree from backend
    try {
        return (
            <DynamicRenderer
                componentTree={config.components}
                globalData={{
                    screen: config.metadata,
                    user: { isLoggedIn: false }, // Example global data
                }}
                onAction={handleCustomAction}
            />
        );
    } catch (error) {
        console.error('Error rendering dynamic UI:', error);

        // Fallback error UI
        const fallbackComponents: ComponentDefinition[] = [
            {
                type: 'SafeAreaView',
                style: { flex: 1, justifyContent: 'center', alignItems: 'center' },
                children: [
                    {
                        type: 'Text',
                        props: { text: 'UI Rendering Error' },
                        style: { fontSize: 18, color: '#ff0000' }
                    }
                ]
            }
        ];

        return (
            <DynamicRenderer
                componentTree={fallbackComponents}
                onAction={handleCustomAction}
            />
        );
    }
};

export default LanguageSelectionScreen;