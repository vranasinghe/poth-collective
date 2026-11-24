import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, hitSlopFor, useInteraction, webPointer } from '../interaction';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type ChipOption = { value: string; label: string; count?: number };

type Common = {
    options: ChipOption[];
    /** Accessible name of the whole group, e.g. "Filter orders by status" */
    label: string;
    /** `scroll`: one horizontal row that scrolls (default). `wrap`: wraps onto several lines. */
    layout?: 'scroll' | 'wrap';
};
export type FilterChipsProps =
    | (Common & { multiple?: false; value: string | null; onChange: (value: string | null) => void })
    | (Common & { multiple: true; value: string[]; onChange: (value: string[]) => void });

function Chip({ option, selected, multiple, onPress }: { option: ChipOption; selected: boolean; multiple: boolean; onPress: () => void }) {
    const theme = useTheme();
    const { hovered, focusVisible, handlers } = useInteraction();
    return (
        <Pressable
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityLabel={option.count !== undefined ? `${option.label}, ${option.count}` : option.label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            hitSlop={hitSlopFor(sizes.chip)}
            {...handlers}
            style={({ pressed }) => [
                {
                    minHeight: sizes.chip,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs + 2,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radii.full,
                    borderWidth: 1.5,
                    borderColor: selected ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: selected
                        ? pressed ? theme.colors.primaryPressed : theme.colors.primary
                        : pressed ? theme.colors.pressedOverlay : hovered ? theme.colors.hoverOverlay : theme.colors.surfaceRaised
                },
                webPointer(),
                focusRingStyle(theme, focusVisible)
            ]}
        >
            {selected ? <Icon name="checkmark" size="sm" color="onPrimary" /> : null}
            <AppText variant="bodySmall" weight="medium" color={selected ? 'onPrimary' : 'text'}>{option.label}</AppText>
            {option.count !== undefined ? (
                <AppText variant="caption" color={selected ? 'onPrimary' : 'textMuted'}>{option.count}</AppText>
            ) : null}
        </Pressable>
    );
}

/** Filter or category chips. Single-select (radio) by default; `multiple` makes them checkboxes. Selection shows a check mark, not just a colour. */
export function FilterChips(props: FilterChipsProps) {
    const theme = useTheme();
    const { options, label, layout = 'scroll' } = props;
    const isSelected = (v: string) => (props.multiple ? props.value.includes(v) : props.value === v);

    const toggle = (v: string) => {
        if (props.multiple) {
            props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
        } else {
            props.onChange(props.value === v ? null : v);
        }
    };

    const chips = options.map((o) => <Chip key={o.value} option={o} selected={isSelected(o.value)} multiple={!!props.multiple} onPress={() => toggle(o.value)} />);
    const group = { accessibilityRole: 'radiogroup' as const, accessibilityLabel: label };

    if (layout === 'wrap') {
        return <View {...group} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>{chips}</View>;
    }
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} {...group} contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs, paddingRight: theme.spacing.md }}>
            {chips}
        </ScrollView>
    );
}
