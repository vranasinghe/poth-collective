import React from 'react';
import { TextInputProps, ViewStyle } from 'react-native';
import { IconButton } from '../src/ui/components/IconButton';
import type { IconName } from '../src/ui/components/Icon';
import { TextField } from '../src/ui/components/TextField';

/**
 * Legacy Input, kept so existing screens keep working. It now renders the design-system TextField. New code should
 * import TextField / PasswordField from `src/ui` directly.
 */
interface InputProps extends TextInputProps {
    label?: string;
    icon?: IconName;
    rightIcon?: IconName;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
}

export const Input = ({ label, icon, rightIcon, onRightIconPress, containerStyle, ...props }: InputProps) => (
    <TextField
        label={label ?? ''}
        leftIcon={icon}
        rightAccessory={
            rightIcon && onRightIconPress ? (
                <IconButton icon={rightIcon} label={props.accessibilityLabel ? `${props.accessibilityLabel} action` : 'Toggle'} size="sm" onPress={onRightIconPress} />
            ) : undefined
        }
        containerStyle={containerStyle}
        {...props}
    />
);
