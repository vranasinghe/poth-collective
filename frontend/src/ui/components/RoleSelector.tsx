import React from 'react';
import { Pressable, View } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, useInteraction, webPointer } from '../interaction';
import { AppText } from './AppText';
import { FormField } from './FormField';
import { Icon, IconName } from './Icon';

export type RoleOption<T extends string = string> = { value: T; label: string; description?: string; icon: IconName };

/** The two account types the API accepts, labelled the way the app talks about them. */
export const DEFAULT_ROLE_OPTIONS: RoleOption<'Customer' | 'Shop Owner'>[] = [
    { value: 'Customer', label: 'Reader', description: 'Discover, order and review books', icon: 'book-outline' },
    { value: 'Shop Owner', label: 'Shop owner', description: 'Run a shop and manage stock', icon: 'storefront-outline' }
];

export type RoleSelectorProps<T extends string = 'Customer' | 'Shop Owner'> = {
    value: T;
    onChange: (value: T) => void;
    options?: RoleOption<T>[];
    label?: string;
    disabled?: boolean;
};

function RoleOptionCard<T extends string>({ option, selected, disabled, onPress }: { option: RoleOption<T>; selected: boolean; disabled?: boolean; onPress: () => void }) {
    const theme = useTheme();
    const { hovered, focusVisible, handlers } = useInteraction();
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
            accessibilityState={{ checked: selected, disabled: !!disabled }}
            disabled={disabled}
            onPress={onPress}
            {...handlers}
            style={({ pressed }) => [
                {
                    flex: 1,
                    minWidth: 140,
                    minHeight: sizes.touchTarget * 1.6,
                    padding: theme.spacing.md,
                    borderRadius: sizes.fieldRadius + 2,
                    borderWidth: 1.5,
                    borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: selected ? theme.colors.primarySoft : pressed ? theme.colors.pressedOverlay : hovered ? theme.colors.hoverOverlay : theme.colors.surfaceRaised,
                    gap: theme.spacing.xs
                },
                webPointer(disabled),
                focusRingStyle(theme, focusVisible)
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon name={option.icon} size="lg" color={selected ? 'primary' : 'textSecondary'} />
                <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size="md" color={selected ? 'primary' : 'textMuted'} />
            </View>
            <AppText variant="cardTitle" color={selected ? 'primary' : 'text'}>{option.label}</AppText>
            {option.description ? <AppText variant="caption" color="textSecondary">{option.description}</AppText> : null}
        </Pressable>
    );
}

/** Choose one of a small set of roles. Exposed as a radio group; selection is shown by border, tint and icon, not colour alone. */
export function RoleSelector<T extends string = 'Customer' | 'Shop Owner'>({
    value, onChange, options = DEFAULT_ROLE_OPTIONS as unknown as RoleOption<T>[], label = 'I am joining as', disabled
}: RoleSelectorProps<T>) {
    const theme = useTheme();
    return (
        <FormField label={label}>
            <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.smd }}>
                {options.map((option) => (
                    <RoleOptionCard key={option.value} option={option} selected={option.value === value} disabled={disabled} onPress={() => onChange(option.value)} />
                ))}
            </View>
        </FormField>
    );
}
