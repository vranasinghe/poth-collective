import React from "react";
import { View } from "react-native";
import { sizes } from "../../design/tokens";
import { useTheme } from "../../theme/ThemeContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { AppText } from "./AppText";
import { IconButton, IconButtonProps } from "./IconButton";

export type AppHeaderProps = {
  title: string;
  wrap?: boolean;
  subtitle?: string;
  /** Shows a back button when provided */
  onBack?: () => void;
  backLabel?: string;
  /** Up to three icon actions on the right. Each needs a `label`. */
  actions?: Pick<
    IconButtonProps,
    "icon" | "label" | "onPress" | "disabled" | "selected" | "testID"
  >[];
  /** `large`: serif screen title (default). `compact`: one-line card-title size for sub-screens. */
  size?: "large" | "compact";
  /** Draw the hairline under the header (default true) */
  divider?: boolean;
};

/**
 * Screen header: optional back button, title (and subtitle), and icon actions. It matches the page's width limit so
 * on desktop the title lines up with the content below it. Use inside `ScreenContainer header={...}`.
 */
export function AppHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Go back",
  actions = [],
  size = "large",
  divider = true,
  wrap = false,
}: AppHeaderProps) {
  const theme = useTheme();
  const { gutter } = useBreakpoint();
  return (
    <View
      style={{
        backgroundColor: theme.colors.canvas,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.border,
        zIndex: theme.zIndex.header,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: sizes.maxContentWidth.content,
          alignSelf: "center",
          minHeight: sizes.header,
          paddingHorizontal: Math.max(0, gutter - theme.spacing.sm),
          paddingVertical: theme.spacing.xs,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
        }}
      >
        {onBack ? (
          <IconButton icon="arrow-back" label={backLabel} onPress={onBack} />
        ) : (
          <View style={{ width: theme.spacing.sm }} />
        )}
        <View style={{ flex: 1, paddingVertical: theme.spacing.xs }}>
          <AppText
            variant={size === "large" ? "screenTitle" : "cardTitle"}
            numberOfLines={wrap ? undefined : 1}
          >
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="bodySmall"
              color="textSecondary"
              numberOfLines={wrap ? undefined : 1}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {actions.slice(0, 3).map((action) => (
          <IconButton key={action.label} {...action} />
        ))}
      </View>
    </View>
  );
}
