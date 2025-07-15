/**
 * Dynamic Component Renderer
 * Renders React Native components from backend-supplied component trees
 * Supports the complete backend-driven UI architecture
 * @author Labor2Hire Team
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ImageBackground,
    ScrollView,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    TextInput,
    FlatList,
    Modal,
    Switch,
    Button,
    Pressable,
    KeyboardAvoidingView,
    Alert,
    Linking,
    Share,
    Vibration,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { changeLanguage } from '../../features/language/languageSlice';

// Types for the dynamic component system
export interface ComponentDefinition {
    type: string;
    id?: string;
    props?: Record<string, any>;
    style?: Record<string, any>;
    children?: ComponentDefinition[];
    actions?: Record<string, ActionDefinition>;
    conditions?: ConditionsDefinition;
    data?: DataBinding;
}

export interface ActionDefinition {
    type: string;
    payload?: Record<string, any>;
    condition?: ConditionDefinition;
    debounce?: number;
}

export interface ConditionsDefinition {
    show?: ConditionDefinition;
    hide?: ConditionDefinition;
    enable?: ConditionDefinition;
    disable?: ConditionDefinition;
}

export interface ConditionDefinition {
    operator: string;
    field?: string;
    value?: any;
    conditions?: ConditionDefinition[];
}

export interface DataBinding {
    source: string;
    mapping?: Record<string, string>;
}

export interface DynamicRendererProps {
    componentTree: ComponentDefinition[];
    globalData?: Record<string, any>;
    onAction?: (action: ActionDefinition, context?: any) => void;
}

// Component mapping for React Native components
const COMPONENT_MAP = {
    View,
    Text,
    TouchableOpacity,
    Image,
    ImageBackground,
    ScrollView,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    TextInput,
    FlatList,
    Modal,
    Switch,
    Button,
    Pressable,
    KeyboardAvoidingView,
};

/**
 * Action Handler for processing dynamic actions
 */
export class ActionHandler {
    private dispatch: any;
    private navigation: any;
    private globalData: Record<string, any>;

    constructor(dispatch: any, navigation: any, globalData: Record<string, any> = {}) {
        this.dispatch = dispatch;
        this.navigation = navigation;
        this.globalData = globalData;
    }

    async executeAction(action: ActionDefinition, context?: any): Promise<void> {
        const { type, payload, condition } = action;

        // Check condition if present
        if (condition && !this.evaluateCondition(condition)) {
            return;
        }

        switch (type) {
            case 'navigate':
                this.handleNavigation(payload);
                break;
            case 'selectLanguage':
                this.handleLanguageSelection(payload);
                break;
            case 'dispatch':
                this.handleReduxDispatch(payload);
                break;
            case 'showAlert':
                this.handleShowAlert(payload);
                break;
            case 'openUrl':
                this.handleOpenUrl(payload);
                break;
            case 'shareContent':
                this.handleShareContent(payload);
                break;
            case 'vibrate':
                this.handleVibrate(payload);
                break;
            case 'updateState':
                this.handleUpdateState(payload, context);
                break;
            default:
                console.warn(`Unknown action type: ${type}`);
        }
    }

    private handleNavigation(payload: any) {
        const { navigateTo, params } = payload || {};
        if (navigateTo && this.navigation) {
            this.navigation.navigate(navigateTo, params);
        }
    }

    private handleLanguageSelection(payload: any) {
        const { languageCode, navigateTo } = payload || {};
        if (languageCode && this.dispatch) {
            this.dispatch(changeLanguage(languageCode));
            if (navigateTo && this.navigation) {
                this.navigation.navigate(navigateTo);
            }
        }
    }

    private handleReduxDispatch(payload: any) {
        const { actionType, actionPayload } = payload || {};
        if (actionType && this.dispatch) {
            this.dispatch({ type: actionType, payload: actionPayload });
        }
    }

    private handleShowAlert(payload: any) {
        const { title, message, buttons } = payload || {};
        Alert.alert(title || 'Alert', message || '', buttons);
    }

    private async handleOpenUrl(payload: any) {
        const { url } = payload || {};
        if (url) {
            try {
                await Linking.openURL(url);
            } catch (error) {
                console.error('Failed to open URL:', error);
            }
        }
    }

    private async handleShareContent(payload: any) {
        const { title, message, url } = payload || {};
        try {
            await Share.share({
                title,
                message: message || url,
                url,
            });
        } catch (error) {
            console.error('Failed to share content:', error);
        }
    }

    private handleVibrate(payload: any) {
        const { duration = 100 } = payload || {};
        Vibration.vibrate(duration);
    }

    private handleUpdateState(payload: any, context: any) {
        // Custom state update logic can be implemented here
        console.log('Update state:', payload, context);
    }

    public evaluateCondition(condition: ConditionDefinition): boolean {
        const { operator, field, value, conditions } = condition;

        switch (operator) {
            case 'equals':
                return this.getFieldValue(field) === value;
            case 'notEquals':
                return this.getFieldValue(field) !== value;
            case 'greaterThan':
                return this.getFieldValue(field) > value;
            case 'lessThan':
                return this.getFieldValue(field) < value;
            case 'contains':
                const fieldValue = this.getFieldValue(field);
                return fieldValue && fieldValue.includes && fieldValue.includes(value);
            case 'exists':
                return this.getFieldValue(field) !== undefined && this.getFieldValue(field) !== null;
            case 'and':
                return conditions?.every(cond => this.evaluateCondition(cond)) || false;
            case 'or':
                return conditions?.some(cond => this.evaluateCondition(cond)) || false;
            case 'not':
                return conditions ? !this.evaluateCondition(conditions[0]) : false;
            default:
                return true;
        }
    }

    private getFieldValue(fieldPath?: string): any {
        if (!fieldPath) return undefined;

        const keys = fieldPath.split('.');
        let value = this.globalData;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }
}

/**
 * Component for rendering individual dynamic components
 */
export const DynamicComponent: React.FC<{
    component: ComponentDefinition;
    actionHandler: ActionHandler;
    globalData?: Record<string, any>;
}> = ({ component, actionHandler, globalData = {} }) => {
    const { type, props = {}, style = {}, children = [], actions = {}, conditions } = component;

    // Check visibility conditions
    if (conditions?.hide && actionHandler.evaluateCondition(conditions.hide)) {
        return null;
    }
    if (conditions?.show && !actionHandler.evaluateCondition(conditions.show)) {
        return null;
    }

    // Get the React Native component
    const Component = COMPONENT_MAP[type as keyof typeof COMPONENT_MAP];
    if (!Component) {
        console.warn(`Unknown component type: ${type}`);
        return null;
    }

    // Process actions to create event handlers
    const processedProps = { ...props };
    Object.entries(actions).forEach(([eventName, action]) => {
        processedProps[eventName] = () => {
            actionHandler.executeAction(action);
        };
    });

    // Handle special props for specific components
    if (type === 'Text' && props.text) {
        processedProps.children = props.text;
    }

    // Render children recursively
    const renderedChildren = children.map((child, index) => (
        <DynamicComponent
            key={child.id || index}
            component={child}
            actionHandler={actionHandler}
            globalData={globalData}
        />
    ));

    // Add children to props if they exist
    if (renderedChildren.length > 0) {
        processedProps.children = renderedChildren;
    }

    return React.createElement(Component as any, {
        ...processedProps,
        style,
    });
};

/**
 * Main Dynamic Renderer Component
 */
export const DynamicRenderer: React.FC<DynamicRendererProps> = ({
    componentTree,
    globalData = {},
    onAction,
}) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();

    // Create action handler
    const actionHandler = new ActionHandler(dispatch, navigation, globalData);

    // Override executeAction if custom handler provided
    if (onAction) {
        const originalExecuteAction = actionHandler.executeAction.bind(actionHandler);
        actionHandler.executeAction = async (action: ActionDefinition, context?: any) => {
            try {
                await onAction(action, context);
            } catch (error) {
                console.warn('Custom action handler failed, falling back to default');
                await originalExecuteAction(action, context);
            }
        };
    }

    return (
        <>
            {componentTree.map((component, index) => (
                <DynamicComponent
                    key={component.id || index}
                    component={component}
                    actionHandler={actionHandler}
                    globalData={globalData}
                />
            ))}
        </>
    );
};

export default DynamicRenderer;
