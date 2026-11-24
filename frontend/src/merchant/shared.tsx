import React, { createContext, ReactNode, useContext, useState } from "react";
import { View, Platform, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet } from "./api";
import {
  AppText,
  Icon,
  useInteraction,
  focusRingStyle,
  AppHeader,
  ScreenContainer,
  FormField,
  BottomSheet,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  useTheme,
  useBreakpoint,
  ResponsiveGrid,
} from "../ui";
import { Stack, ResourceState } from "../reader/shared";
export { Stack, ResourceState };
const MerchantContext = createContext<any>(null);
export function MerchantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [shopId, setShopId] = useState("");
  const shops = useResource<any[]>("merchant-shops", () =>
    merchantGet("shops/owner/me", {}, user?.token),
  );
  return (
    <MerchantContext.Provider
      value={{
        shopId,
        setShopId,
        shops: shops.data || [],
        shopsResource: shops,
        refreshShops: shops.refresh,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
}
export function useMerchant() {
  return useContext(MerchantContext);
}
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const { handlers, focusVisible, hovered } = useInteraction();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      {...handlers}
      style={({ pressed }) => [
        {
          minHeight: 48,
          padding: 12,
          borderWidth: 1,
          borderColor: t.colors.borderStrong,
          borderRadius: t.radii.sm,
          backgroundColor:
            selected || pressed
              ? t.colors.primarySoft
              : hovered
                ? t.colors.surfaceMuted
                : t.colors.surfaceRaised,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        focusRingStyle(t, focusVisible),
      ]}
    >
      <Icon
        name={selected ? "checkmark-circle-outline" : "ellipse-outline"}
        color="primary"
        size="md"
      />
      <AppText style={{ flex: 1 }}>{label}</AppText>
    </Pressable>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
  inlineOnIOS = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  inlineOnIOS?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const { handlers, focusVisible } = useInteraction();
  const choices = (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ gap: 8 }}
    >
      {options.map((o) => (
        <Choice
          key={o.value}
          label={o.label}
          selected={o.value === value}
          onPress={() => {
            if (!disabled) {
              onChange(o.value);
              setOpen(false);
            }
          }}
        />
      ))}
    </View>
  );
  if (Platform.OS === "ios")
    return (
      <FormField label={label}>
        {inlineOnIOS ? (
          choices
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityValue={{
                text:
                  options.find((o) => o.value === value)?.label ||
                  "Choose an option",
              }}
              accessibilityState={{ disabled, expanded: open }}
              disabled={disabled}
              onPress={() => setOpen(true)}
              {...handlers}
              style={({ pressed }) => [
                {
                  minHeight: 52,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: t.colors.borderStrong,
                  borderRadius: t.radii.sm,
                  backgroundColor: pressed
                    ? t.colors.primarySoft
                    : t.colors.surfaceRaised,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                },
                focusRingStyle(t, focusVisible),
              ]}
            >
              <AppText numberOfLines={2} style={{ flex: 1 }}>
                {options.find((o) => o.value === value)?.label ||
                  "Choose an option"}
              </AppText>
              <Icon name="chevron-down" color="primary" />
            </Pressable>
            <BottomSheet
              visible={open}
              onClose={() => setOpen(false)}
              title={label}
            >
              {choices}
            </BottomSheet>
          </>
        )}
      </FormField>
    );
  return (
    <FormField label={label}>
      <View
        style={{
          borderWidth: 1,
          borderColor: t.colors.borderStrong,
          borderRadius: t.radii.sm,
          overflow: "hidden",
          backgroundColor: t.colors.surfaceRaised,
        }}
      >
        <Picker
          accessibilityLabel={label}
          enabled={!disabled}
          selectedValue={value}
          onValueChange={(v) => onChange(String(v))}
          style={{
            height: 52,
            width: "100%",
            color: t.colors.text,
            backgroundColor: t.colors.surfaceRaised,
          }}
        >
          {options.map((o) => (
            <Picker.Item key={o.value} value={o.value} label={o.label} />
          ))}
        </Picker>
      </View>
    </FormField>
  );
}
export function ShopScope() {
  const { shops, shopId, setShopId, shopsResource } = useMerchant();
  return (
    <Stack gap={12}>
      <ResourceState resource={shopsResource} />
      {shops.length > 1 ? (
        <Select
          label="Shop scope"
          value={shopId}
          onChange={setShopId}
          options={[
            { value: "", label: "All my shops" },
            ...shops.map((s: any) => ({ value: s._id, label: s.name })),
          ]}
        />
      ) : shops[0] ? (
        <>
          <AppText variant="sectionTitle">{shops[0].name}</AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {shops[0].location}
          </AppText>
        </>
      ) : !shopsResource.loading && !shopsResource.error ? (
        <AppText color="textSecondary">No bookshop registered yet.</AppText>
      ) : null}
    </Stack>
  );
}
export function MerchantScreen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  form = false,
  back = false,
  onBack,
  spacing = 24,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => any;
  refreshing?: boolean;
  form?: boolean;
  back?: boolean;
  onBack?: () => void;
  spacing?: number;
}) {
  return (
    <ScreenContainer
      width={form ? "reading" : "content"}
      keyboardAvoiding
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      <Stack gap={spacing}>
        <AppHeader
          wrap
          title={title}
          subtitle={subtitle}
          onBack={
            onBack ||
            (back
              ? () =>
                  router.canGoBack() ? router.back() : router.replace("/owner")
              : undefined)
          }
          actions={
            onRefresh
              ? [
                  {
                    icon: "refresh-outline",
                    label: "Refresh current view",
                    onPress: onRefresh,
                  },
                ]
              : undefined
          }
        />
        {children}
      </Stack>
    </ScreenContainer>
  );
}
export function NewShopState() {
  return (
    <EmptyState
      title="Your bookshop starts here"
      message="Register your shop, then add your first book. Your inventory and orders will appear here."
      action={{
        label: "Register a shop",
        onPress: () => router.push("/owner/register-shop"),
      }}
    />
  );
}
export function Pager({
  page,
  pages,
  onChange,
  busy,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
  busy?: boolean;
}) {
  if (pages <= 1) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SecondaryButton
        title="Previous page"
        disabled={page === 1 || busy}
        onPress={() => onChange(page - 1)}
      />
      <AppText>
        Page {page} of {pages}
      </AppText>
      <SecondaryButton
        title="Next page"
        disabled={page >= pages || busy}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}
export function Metric({
  label,
  value,
  note,
  dense = false,
}: {
  label: string;
  value: number;
  note?: string;
  dense?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: dense ? 8 : 16,
        gap: dense ? 4 : 8,
        borderRadius: t.radii.md,
        backgroundColor: t.colors.surfaceRaised,
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      <AppText
        variant={dense ? "caption" : "bodySmall"}
        color="textSecondary"
        style={dense ? { minHeight: 32 } : undefined}
      >
        {label}
      </AppText>
      <AppText variant={dense ? "sectionTitle" : "screenTitle"}>
        {value.toLocaleString()}
      </AppText>
      {note ? (
        <AppText variant="caption" color="textMuted">
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
export function OperationalMetrics({ data }: { data: any }) {
  const { isPhone } = useBreakpoint();
  return (
    <ResponsiveGrid
      columns={{ compact: 3, phone: 3, tablet: 3, desktop: 3, wide: 3 }}
      gap={isPhone ? 8 : undefined}
    >
      <Metric
        dense={isPhone}
        label="Active books"
        value={data.inventory.activeBooks}
      />
      <Metric
        dense={isPhone}
        label="Low stock"
        value={data.inventory.lowStock}
        note={isPhone ? undefined : "1–5 copies remaining"}
      />
      <Metric
        dense={isPhone}
        label="Out of stock"
        value={data.inventory.outOfStock}
      />
      <Metric
        dense={isPhone}
        label="Pending orders"
        value={data.statusCounts.Pending}
      />
      <Metric
        dense={isPhone}
        label="Confirmed orders"
        value={data.statusCounts.Confirmed}
      />
      <Metric
        dense={isPhone}
        label="Delivered orders"
        value={data.statusCounts.Delivered}
      />
    </ResponsiveGrid>
  );
}
export const openInventory = (stock = "all") =>
  router.navigate({
    pathname: "/owner/(tabs)/inventory",
    params: { stock, resetKey: String(Date.now()) },
  });
export const openOrders = (status = "All") =>
  router.navigate({
    pathname: "/owner/(tabs)/orders",
    params: { status, resetKey: String(Date.now()) },
  });
export const editBook = (id: string) =>
  router.push({ pathname: "/owner/register-book", params: { id } });
export const orderDetail = (id: string) =>
  router.push({ pathname: "/owner/order", params: { id } });
export function AddBookButton({ compact = false }: { compact?: boolean }) {
  return (
    <PrimaryButton
      size={compact ? "sm" : "md"}
      title="Add a book"
      icon="add-outline"
      onPress={() => router.push("/owner/register-book")}
    />
  );
}
