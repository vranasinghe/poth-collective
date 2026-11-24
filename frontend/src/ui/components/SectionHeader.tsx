import React from 'react';
import { Pressable, View } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, hitSlopFor, useInteraction, webPointer } from '../interaction';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type SectionHeaderProps = {
    title: string;
    subtitle?: string;
    /** Parent already supplies section spacing, e.g. a compact operational overview. */
    compact?: boolean;
    /** Optional link on the right, e.g. "View all". It must do something: do not render it as a placeholder. */
    action?: { label: string; onPress: () => void; accessibilityLabel?: string };
};

/** Title for a block of content. The heading carries the hierarchy on its own: there is deliberately no eyebrow label. */
export function SectionHeader({ title, subtitle, action, compact = false }: SectionHeaderProps) {
    const theme = useTheme();
    const { hovered, focusVisible, handlers } = useInteraction();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md, marginTop: compact ? 0 : theme.spacing.lg, marginBottom: compact ? 0 : theme.spacing.smd }}>
            <View style={{ flex: 1 }}>
                <AppText variant="sectionTitle" accessibilityRole="header">{title}</AppText>
                {subtitle ? <AppText variant="bodySmall" color="textSecondary" style={{ marginTop: theme.spacing.xxs }}>{subtitle}</AppText> : null}
            </View>
            {action ? (
                <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={action.accessibilityLabel ?? `${action.label}, ${title}`}
                    onPress={action.onPress}
                    hitSlop={hitSlopFor(24)}
                    {...handlers}
                    style={[
                        { minHeight: sizes.touchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.sm },
                        webPointer(),
                        focusRingStyle(theme, focusVisible)
                    ]}
                >
                    <AppText variant="link" color="primary" style={{ textDecorationLine: hovered ? 'underline' : 'none' }}>{action.label}</AppText>
                    <Icon name="chevron-forward" size="sm" color="primary" />
                </Pressable>
            ) : null}
        </View>
    );
}
