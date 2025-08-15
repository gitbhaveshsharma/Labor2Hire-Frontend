/**
 * Icon Component for Dynamic Renderer
 * Supports react-native-vector-icons with simplified imports
 * @author Labor2Hire Team
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface IconComponentProps {
    name: string;
    type?: string;
    iconSize?: number;
    iconColor?: string;
    size?: number; // Standard react-native-vector-icons prop
    color?: string; // Standard react-native-vector-icons prop
    style?: any;
    onPress?: () => void;
}

/**
 * Dynamic Icon Component
 * For now, uses only MaterialIcons to avoid import issues
 * Can be extended later with proper icon family support
 */
export const IconComponent: React.FC<IconComponentProps> = ({
    name,
    type: _type, // Keep for future use, currently only MaterialIcons supported
    iconSize,
    iconColor,
    size,
    color,
    style,
    onPress,
}) => {
    // For now, we'll use MaterialIcons for all icons to avoid import issues
    // This can be extended later with proper dynamic imports
    // Note: 'type' parameter is ignored for now but kept for API compatibility

    // Use size or iconSize (size takes precedence as it's the standard prop)
    const finalSize = size || iconSize || 24;
    // Use color or iconColor (color takes precedence as it's the standard prop)
    const finalColor = color || iconColor || '#000000';

    if (!name) {
        console.warn(`Icon name is required. Using default icon.`);
        return (
            <Icon
                name="help-outline"
                size={finalSize}
                color={finalColor}
                style={[styles.icon, style]}
                onPress={onPress}
            />
        );
    }

    try {
        return (
            <Icon
                name={name}
                size={finalSize}
                color={finalColor}
                style={[styles.icon, style]}
                onPress={onPress}
            />
        );
    } catch (error) {
        console.warn(`Failed to render icon ${name}:`, error);
        // Fallback to a default icon
        return (
            <Icon
                name="error-outline"
                size={finalSize}
                color={finalColor}
                style={[styles.icon, style]}
                onPress={onPress}
            />
        );
    }
};

const styles = StyleSheet.create({
    icon: {
        // Base icon styles can be added here
    },
});

export default IconComponent;

// Export commonly used MaterialIcons for easy reference
export const COMMON_ICONS = {
    ARROW_FORWARD: 'arrow-forward',
    ARROW_BACK: 'arrow-back',
    ARROW_UPWARD: 'arrow-upward',
    ARROW_DOWNWARD: 'arrow-downward',
    CHECK: 'check',
    CLOSE: 'close',
    ADD: 'add',
    REMOVE: 'remove',
    EDIT: 'edit',
    DELETE: 'delete',
    SEARCH: 'search',
    HOME: 'home',
    MENU: 'menu',
    MORE_VERT: 'more-vert',
    SETTINGS: 'settings',
    ACCOUNT_CIRCLE: 'account-circle',
    NOTIFICATIONS: 'notifications',
    FAVORITE: 'favorite',
    STAR: 'star',
    SHARE: 'share',
    DOWNLOAD: 'download',
    UPLOAD: 'upload',
    REFRESH: 'refresh',
    VISIBILITY: 'visibility',
    VISIBILITY_OFF: 'visibility-off',
    PHONE: 'phone',
    EMAIL: 'email',
    LOCATION_ON: 'location-on',
    CALENDAR_TODAY: 'calendar-today',
    LOCK: 'lock',
    UNLOCK: 'lock-open',
    LANGUAGE: 'language',
};
