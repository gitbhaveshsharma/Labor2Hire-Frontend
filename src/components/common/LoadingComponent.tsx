/**
 * Reusable Loading Component
 * Fully configurable loading state for all screens
 * @author Labor2Hire Team
 */

import React from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';

export interface LoadingConfigProps {
    text: string;
    indicatorColor: string;
    textColor?: string;
    backgroundColor?: string;
    textStyle?: {
        fontSize?: number;
        marginTop?: number;
        fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
        textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
        fontStyle?: 'normal' | 'italic';
        letterSpacing?: number;
    };
    indicatorSize?: 'small' | 'large' | number;
    containerStyle?: {
        padding?: number;
        margin?: number;
        justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
        alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    };
}

interface LoadingComponentProps {
    config: LoadingConfigProps;
    containerStyle?: ViewStyle;
    textStyle?: TextStyle;
}

/**
 * Configurable Loading Component
 * Used across the app for consistent loading states
 * All styling is controlled through backend configuration
 */
const LoadingComponent: React.FC<LoadingComponentProps> = ({
    config,
    containerStyle,
    textStyle,
}) => {
    const {
        text,
        indicatorColor,
        textColor = '#333333',
        backgroundColor = '#ffffff',
        textStyle: configTextStyle = {},
        indicatorSize = 'large',
        containerStyle: configContainerStyle = {},
    } = config;

    return (
        <View
            style={[
                styles.container,
                { backgroundColor },
                {
                    padding: configContainerStyle.padding,
                    margin: configContainerStyle.margin,
                    justifyContent: configContainerStyle.justifyContent || 'center',
                    alignItems: configContainerStyle.alignItems || 'center'
                },
                containerStyle,
            ]}
        >
            <ActivityIndicator
                size={indicatorSize}
                color={indicatorColor}
            />
            <Text
                style={[
                    styles.text,
                    { color: textColor },
                    { fontSize: configTextStyle.fontSize || 16 },
                    { marginTop: configTextStyle.marginTop || 16 },
                    { fontWeight: configTextStyle.fontWeight || 'normal' },
                    { textAlign: configTextStyle.textAlign || 'center' },
                    configTextStyle.fontStyle && { fontStyle: configTextStyle.fontStyle },
                    configTextStyle.letterSpacing !== undefined && { letterSpacing: configTextStyle.letterSpacing },
                    textStyle,
                ]}
            >
                {text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        textAlign: 'center',
    },
});

export default LoadingComponent;
