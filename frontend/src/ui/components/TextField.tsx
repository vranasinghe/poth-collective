import React, { ReactNode, forwardRef, useState } from 'react';
import { Platform, StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { fontFamilyFor } from '../../design/fonts';
import { maxFontSizeMultiplier, sizes, textStyles } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useInteraction } from '../interaction';
import { Validator } from '../validation';
import { FormField } from './FormField';
import { Icon, IconName } from './Icon';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
    label: string;
    required?: boolean;
    helperText?: string;
    hint?: string;
    /** Controlled error message (e.g. from the server). Takes precedence over `validate`. */
    error?: string;
    /** Inline validation, evaluated after the first blur and then on every change */
    validate?: Validator;
    leftIcon?: IconName;
    /** Control rendered inside the field on the right (e.g. a show-password button) */
    rightAccessory?: ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
    disabled?: boolean;
};

/**
 * Text input with a visible label, inline validation, helper text and clear states: default, hover, focus (2 px
 * border plus a web focus ring), error, disabled. The field boundary uses `borderStrong` (3.8:1 on white) because
 * the sand surface alone is far too faint to count as a control edge.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
    { label, required, helperText, hint, error, validate, leftIcon, rightAccessory, containerStyle, disabled, onBlur, onFocus, value, multiline, ...input },
    ref
) {
    const theme = useTheme();
    const { hovered, handlers } = useInteraction();
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);

    const validationMessage = touched && validate ? validate(value ?? '') : undefined;
    const message = error ?? validationMessage;
    const invalid = !!message;

    const borderColor = disabled
        ? theme.colors.border
        : invalid
          ? theme.colors.status.danger.solid
          : focused
            ? theme.colors.primary
            : hovered
              ? theme.colors.primaryHover
              : theme.colors.borderStrong;

    const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
        setFocused(false);
        setTouched(true);
        onBlur?.(e);
    };
    const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
        setFocused(true);
        onFocus?.(e);
    };

    const body = textStyles.body;
    return (
        <FormField label={label} required={required} helperText={helperText} hint={hint} error={message} style={containerStyle}>
            <View
                {...handlers}
                style={{
                    flexDirection: 'row',
                    alignItems: multiline ? 'flex-start' : 'center',
                    minHeight: multiline ? sizes.field * 2 : sizes.field,
                    borderRadius: sizes.fieldRadius,
                    // Constant 1.5 px border so changing state never shifts the layout
                    borderWidth: 1.5,
                    borderColor,
                    backgroundColor: disabled ? theme.colors.disabledFill : theme.colors.surfaceRaised,
                    paddingHorizontal: theme.spacing.md,
                    gap: theme.spacing.smd
                }}
            >
                {leftIcon ? <Icon name={leftIcon} size="md" color="textMuted" /> : null}
                <TextInput
                    ref={ref}
                    value={value}
                    multiline={multiline}
                    editable={!disabled}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholderTextColor={theme.colors.textMuted}
                    selectionColor={theme.colors.primary}
                    cursorColor={theme.colors.primary}
                    allowFontScaling
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                    accessibilityLabel={label}
                    accessibilityHint={helperText}
                    accessibilityState={{ disabled: !!disabled }}
                    aria-required={required}
                    aria-invalid={invalid}
                    style={[
                        {
                            flex: 1,
                            minWidth: 0, // lets the input shrink inside the row instead of overflowing narrow screens
                            color: disabled ? theme.colors.textDisabled : theme.colors.text,
                            fontFamily: fontFamilyFor(body.family, body.weight),
                            fontSize: body.size,
                            lineHeight: Platform.OS === 'web' ? body.lineHeight : undefined,
                            paddingVertical: multiline ? theme.spacing.smd : 0,
                            minHeight: multiline ? sizes.field * 2 - 4 : sizes.field - 4,
                            textAlignVertical: multiline ? 'top' : 'center'
                        },
                        // The wrapper draws the focus treatment; suppress the browser's own outline on the bare input
                        (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object
                    ]}
                    {...input}
                />
                {rightAccessory}
            </View>
        </FormField>
    );
});
