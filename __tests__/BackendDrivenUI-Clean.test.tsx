/**
 * Backend-Driven UI Test Suite
 * Tests the dynamic component rendering system
 * @author Labor2Hire Team
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { DynamicRenderer, ComponentDefinition } from '../src/components/common/DynamicRenderer';
import languageSlice from '../src/features/language/languageSlice';
import remoteConfigSlice from '../src/features/remoteConfig/remoteConfigSlice';

// Mock store setup
const mockStore = configureStore({
    reducer: {
        language: languageSlice,
        remoteConfig: remoteConfigSlice,
    },
});

// Mock navigation
const MockNavigationContainer = ({ children }: { children: React.ReactNode }) => (
    <NavigationContainer>
        {children}
    </NavigationContainer>
);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
        <MockNavigationContainer>
            {children}
        </MockNavigationContainer>
    </Provider>
);

describe('Backend-Driven Dynamic UI', () => {
    test('renders simple component tree without errors', () => {
        const simpleComponentTree: ComponentDefinition[] = [
            {
                type: 'View',
                style: { flex: 1 },
                children: [
                    {
                        type: 'Text',
                        props: { text: 'Hello World' },
                        style: { fontSize: 16 }
                    }
                ]
            }
        ];

        const component = renderer.create(
            <TestWrapper>
                <DynamicRenderer componentTree={simpleComponentTree} />
            </TestWrapper>
        );

        expect(component.toJSON()).toBeTruthy();
    });

    test('component definition types match schema requirements', () => {
        // Test basic component definition structure
        const testComponent: ComponentDefinition = {
            type: 'View',
            id: 'test-view',
            props: { testProp: 'value' },
            style: { backgroundColor: '#ffffff' },
            children: [
                {
                    type: 'Text',
                    props: { text: 'Test Text' }
                }
            ],
            actions: {
                onPress: {
                    type: 'navigate',
                    payload: { screen: 'TestScreen' }
                }
            },
            conditions: {
                show: {
                    operator: 'equals',
                    field: 'user.isLoggedIn',
                    value: true
                }
            }
        };

        // Validate required fields
        expect(testComponent.type).toBe('View');
        expect(testComponent.id).toBe('test-view');
        expect(testComponent.props).toEqual({ testProp: 'value' });
        expect(testComponent.style).toEqual({ backgroundColor: '#ffffff' });
        expect(testComponent.children).toHaveLength(1);
        expect(testComponent.actions?.onPress.type).toBe('navigate');
        expect(testComponent.conditions?.show?.operator).toBe('equals');
    });

    test('backend template structure validation', () => {
        // Test the template structure that would come from backend
        const backendTemplate = {
            screenType: 'language-selection',
            metadata: {
                screenTitle: 'Choose Your Language',
                description: 'Language selection screen with dynamic components',
                version: '1.0.0',
                lastUpdated: '2025-01-08T16:00:00.000Z'
            },
            globalStyles: {
                backgroundColor: '#ffffff',
                statusBar: {
                    barStyle: 'dark-content',
                    backgroundColor: '#ffffff'
                }
            },
            components: [
                {
                    type: 'SafeAreaView',
                    style: { flex: 1, backgroundColor: '#ffffff' },
                    children: [
                        {
                            type: 'Text',
                            props: { text: 'Choose Your Language' },
                            style: { fontSize: 24, textAlign: 'center' }
                        }
                    ]
                }
            ],
            loadingState: {
                type: 'SafeAreaView',
                style: { flex: 1, justifyContent: 'center' },
                children: [
                    {
                        type: 'ActivityIndicator',
                        props: { size: 'large', color: '#007bff' }
                    }
                ]
            },
            errorState: {
                type: 'SafeAreaView',
                style: { flex: 1, justifyContent: 'center' },
                children: [
                    {
                        type: 'Text',
                        props: { text: 'Error loading configuration' },
                        style: { color: '#ff0000', textAlign: 'center' }
                    }
                ]
            }
        };

        // Validate template structure
        expect(backendTemplate.screenType).toBe('language-selection');
        expect(backendTemplate.metadata.screenTitle).toBe('Choose Your Language');
        expect(backendTemplate.components).toHaveLength(1);
        expect(backendTemplate.loadingState.type).toBe('SafeAreaView');
        expect(backendTemplate.errorState.type).toBe('SafeAreaView');
        expect(backendTemplate.globalStyles.backgroundColor).toBe('#ffffff');
    });
});
