import React, { forwardRef, useState } from 'react';
import { Platform, StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { fontFamilyFor } from '../../design/fonts';
import { maxFontSizeMultiplier, sizes, textStyles } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export type SearchFieldProps = {
    value: string;
    onChangeText: (text: string) => void;
    /** Fired on the keyboard's search/enter key */
    onSubmit?: (text: string) => void;
    placeholder?: string;
    /** Accessible name (there is no visible label). Defaults to "Search". */
    label?: string;
    autoFocus?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
};

/** Pill-shaped search input with a clear button. The container is exposed to assistive tech as a search landmark. */
export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField(
    { value, onChangeText, onSubmit, placeholder = 'Search books and shops', label = 'Search', autoFocus, style, testID },
    ref
) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const body = textStyles.body;

    return (
        <View
            accessibilityRole="search"
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: sizes.searchField,
                    borderRadius: theme.radii.full,
                    borderWidth: 1.5,
                    borderColor: focused ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: theme.colors.surfaceRaised,
                    paddingLeft: theme.spacing.md,
                    paddingRight: theme.spacing.xs,
                    gap: theme.spacing.sm
                },
                style
            ]}
        >
            <Icon name="search-outline" size="md" color="textMuted" />
            <TextInput
                ref={ref}
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={() => onSubmit?.(value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.primary}
                cursorColor={theme.colors.primary}
                returnKeyType="search"
                inputMode="search"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={autoFocus}
                allowFontScaling
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                accessibilityLabel={label}
                testID={testID}
                style={[
                    {
                        flex: 1,
                        minWidth: 0,
                        minHeight: sizes.searchField - 4,
                        color: theme.colors.text,
                        fontFamily: fontFamilyFor(body.family, body.weight),
                        fontSize: body.size
                    },
                    (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object
                ]}
            />
            {value ? <IconButton icon="close-circle" label="Clear search" size="sm" color="textMuted" onPress={() => onChangeText('')} /> : <View style={{ width: theme.spacing.sm }} />}
        </View>
    );
});
