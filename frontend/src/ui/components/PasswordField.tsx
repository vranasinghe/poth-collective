import React, { forwardRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { passwordRules, validateNewPassword } from '../validation';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { TextField, TextFieldProps } from './TextField';

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'rightAccessory' | 'leftIcon'> & {
    /**
     * `new`: sign-up or password change. Shows the live rules checklist and validates against the policy.
     * `current`: login. No checklist and no policy validation (existing passwords may predate the policy).
     */
    mode?: 'new' | 'current';
};

/** Password input with a show/hide toggle and, for new passwords, a checklist that updates as you type. */
export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
    { mode = 'current', value = '', validate, ...props },
    ref
) {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const isNew = mode === 'new';

    return (
        <View style={{ width: '100%' }}>
            <TextField
                ref={ref}
                value={value}
                leftIcon="lock-closed-outline"
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isNew ? 'new-password' : 'current-password'}
                textContentType={isNew ? 'newPassword' : 'password'}
                validate={validate ?? (isNew ? validateNewPassword : undefined)}
                containerStyle={isNew && value ? { marginBottom: theme.spacing.sm } : undefined}
                rightAccessory={
                    <IconButton
                        icon={visible ? 'eye-off-outline' : 'eye-outline'}
                        label={visible ? 'Hide password' : 'Show password'}
                        size="sm"
                        selected={visible}
                        onPress={() => setVisible((v) => !v)}
                    />
                }
                {...props}
            />
            {isNew && value ? (
                <View
                    accessibilityLabel="Password requirements"
                    style={{ marginBottom: theme.spacing.mdl, gap: theme.spacing.xs, paddingHorizontal: theme.spacing.xs }}
                >
                    {passwordRules.map((rule) => {
                        const met = rule.test(value);
                        return (
                            <View
                                key={rule.id}
                                accessible
                                accessibilityLabel={`${rule.label}: ${met ? 'met' : 'not met yet'}`}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
                            >
                                <Icon name={met ? 'checkmark-circle' : 'ellipse-outline'} size="sm" color={met ? 'success' : 'textMuted'} />
                                <AppText variant="caption" color={met ? 'success' : 'textMuted'}>{rule.label}</AppText>
                            </View>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
});
