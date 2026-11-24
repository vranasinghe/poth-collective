import React from 'react';
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, hitSlopFor, useInteraction, webPointer } from '../interaction';
import { TextColor } from './AppText';
import { Icon, IconName } from './Icon';

export type IconButtonProps = {
    icon: IconName;
    /** Required: an icon-only control has no visible text, so its accessible name is mandatory. */
    label: string;
    onPress?: (event: GestureResponderEvent) => void;
    size?: 'sm' | 'md' | 'lg';
    /** plain: icon only. tonal: sand circle. filled: forest-green circle. */
    appearance?: 'plain' | 'tonal' | 'filled';
    color?: TextColor;
    disabled?: boolean;
    /** Toggle state for buttons such as "favourite" */
    selected?: boolean;
    testID?: string;
    style?: StyleProp<ViewStyle>;
};

/** Icon-only button. Visual size 40-52, hit area always at least 44 x 44. */
export function IconButton({ icon, label, onPress, size = 'md', appearance = 'plain', color, disabled, selected, testID, style }: IconButtonProps) {
    const theme = useTheme();
    const { hovered, focusVisible, handlers } = useInteraction();
    const box = sizes.iconButton[size];
    const fg: TextColor = disabled ? 'textDisabled' : color ?? (appearance === 'filled' ? 'onPrimary' : 'text');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !!disabled, selected }}
            disabled={disabled}
            onPress={onPress}
            hitSlop={hitSlopFor(box)}
            testID={testID}
            {...handlers}
            style={({ pressed }) => [
                {
                    width: box,
                    height: box,
                    minWidth: sizes.touchTarget,
                    minHeight: sizes.touchTarget,
                    borderRadius: theme.radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                        appearance === 'filled'
                            ? pressed ? theme.colors.primaryPressed : hovered ? theme.colors.primaryHover : theme.colors.primary
                            : pressed
                              ? theme.colors.pressedOverlay
                              : hovered
                                ? theme.colors.hoverOverlay
                                : appearance === 'tonal'
                                  ? theme.colors.surfaceMuted
                                  : selected ? theme.colors.primarySoft : 'transparent'
                } as ViewStyle,
                webPointer(disabled),
                focusRingStyle(theme, focusVisible),
                style
            ]}
        >
            <Icon name={icon} size="lg" color={fg} />
        </Pressable>
    );
}
