import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  getReaderOrdersAPI,
  deleteOrderAPI,
  updateOrderDeliveryAPI,
} from "../api/orderApi";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  OrderCard,
  FilterChips,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  BottomSheet,
  TextField,
  validatePhone,
  useConfirm,
  useToast,
  Icon,
  useTheme,
} from "../ui";
import { useResource } from "./useResource";
import { Stack, ResourceState } from "./shared";
import { errorMessage } from "./api";
export default function Orders() {
  const { user } = useAuth();
  const t = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const resource = useResource<any[]>("orders", async () =>
    user ? (await getReaderOrdersAPI(user._id)).data : [],
  );
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [delivery, setDelivery] = useState({
    address: "",
    city: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const remove = async (o: any) => {
    const cancel = o.status === "Pending";
    if (
      !(await confirm({
        title: cancel ? "Cancel this order?" : "Hide this order?",
        message: cancel
          ? "The reserved books will be returned to stock. Contact the shop about any payment already made."
          : "This removes it from your list. The order record is retained.",
        confirmLabel: cancel ? "Cancel order" : "Hide order",
        tone: "danger",
      }))
    )
      return;
    setBusy(o._id);
    try {
      await deleteOrderAPI(o._id);
      await resource.refresh();
      toast.success(
        cancel
          ? "Order cancelled. Contact the shop about any refund."
          : "Order hidden.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const saveDelivery = async () => {
    setSubmitted(true);
    if (
      !delivery.address.trim() ||
      !delivery.city.trim() ||
      validatePhone(delivery.phone)
    )
      return;
    setBusy(edit._id);
    try {
      await updateOrderDeliveryAPI(edit._id, delivery);
      setEdit(null);
      await resource.refresh();
      toast.success("Delivery details updated.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const orders = (resource.data || []).filter(
    (o) => filter === "All" || o.status === filter,
  );
  return (
    <ScreenContainer
      onRefresh={resource.refresh}
      refreshing={resource.loading && !!resource.data}
    >
      <Stack>
        <AppHeader
          title="Your orders"
          subtitle="From a bookshop’s shelf to your doorstep."
        />
        <FilterChips
          label="Order status"
          value={filter}
          onChange={(v) => setFilter(v || "All")}
          options={[
            "All",
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
          ].map((v) => ({ value: v, label: v }))}
        />
        <ResourceState resource={resource} />
        {!resource.loading && !resource.error && !orders.length ? (
          <EmptyState
            title={
              filter === "All"
                ? "Your reading journey starts here"
                : "No orders with this status"
            }
            message="Find a book you love and order from its bookshop."
            action={{
              label: "Explore books",
              onPress: () => router.navigate("/(tabs)/explore"),
            }}
          />
        ) : null}
        {orders.map((o) => (
          <View
            key={o._id}
            style={{
              gap: 16,
              paddingBottom: 24,
              borderBottomWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <OrderCard
              orderId={o._id}
              status={o.status}
              bookTitle={o.book?.title || "Book no longer listed"}
              bookAuthor={o.book?.author}
              bookImage={o.book?.imageUrl}
              counterpart={{
                label: "Shop",
                name: o.shop?.name || "Bookshop no longer listed",
              }}
              quantity={o.quantity}
              total={o.totalPrice}
              date={o.createdAt}
              actions={[
                ...(o.status === "Pending"
                  ? [
                      {
                        label: "Edit delivery",
                        onPress: () => {
                          setEdit(o);
                          setDelivery(o.deliveryDetails);
                          setSubmitted(false);
                        },
                        disabled: !!busy,
                      },
                      {
                        label: "Cancel order",
                        tone: "danger" as const,
                        onPress: () => remove(o),
                        loading: busy === o._id,
                        disabled: !!busy,
                      },
                    ]
                  : []),
                ...(["Delivered", "Cancelled"].includes(o.status)
                  ? [
                      {
                        label: "Hide order",
                        onPress: () => remove(o),
                        loading: busy === o._id,
                        disabled: !!busy,
                      },
                    ]
                  : []),
              ]}
            />
            {o.status === "Cancelled" ? (
              <AppText color="danger">
                Cancelled. Contact the shop about any payment already
                transferred.
              </AppText>
            ) : (
              <View
                accessibilityLabel={`Order progress: ${o.status}`}
                style={{ gap: 8 }}
              >
                {["Pending", "Confirmed", "Shipped", "Delivered"].map(
                  (step, i, steps) => (
                    <View
                      key={step}
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <Icon
                        name={
                          i <= steps.indexOf(o.status)
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        color={
                          i <= steps.indexOf(o.status) ? "primary" : "textMuted"
                        }
                        size="sm"
                      />
                      <AppText
                        variant="bodySmall"
                        weight={step === o.status ? "semibold" : "regular"}
                      >
                        {step === "Pending"
                          ? "Pending · awaiting shop review"
                          : step === o.status
                            ? `${step} · current status`
                            : step}
                      </AppText>
                    </View>
                  ),
                )}
              </View>
            )}
            <AppText variant="bodySmall" color="textSecondary">
              Delivery: {o.deliveryDetails?.address}, {o.deliveryDetails?.city}{" "}
              · {o.deliveryDetails?.phone}
            </AppText>
            {o.status === "Pending" ? (
              <AppText variant="caption" color="textMuted">
                Your slip is awaiting verification. Uploading it is not
                confirmation of payment.
              </AppText>
            ) : null}
            {["Confirmed", "Shipped"].includes(o.status) ? (
              <AppText variant="caption" color="textMuted">
                Contact the shop for changes. Reader cancellation is available
                only while Pending.
              </AppText>
            ) : null}
          </View>
        ))}
        <BottomSheet
          visible={!!edit}
          onClose={() => setEdit(null)}
          title="Edit delivery details"
        >
          <Stack gap={16}>
            {(["address", "city", "phone"] as const).map((field) => (
              <TextField
                key={field}
                label={
                  field === "phone"
                    ? "Delivery phone"
                    : field === "city"
                      ? "City"
                      : "Street address"
                }
                required
                value={delivery[field]}
                keyboardType={field === "phone" ? "phone-pad" : "default"}
                onChangeText={(v) => setDelivery((d) => ({ ...d, [field]: v }))}
                error={
                  submitted
                    ? field === "phone"
                      ? validatePhone(delivery.phone)
                      : !delivery[field].trim()
                        ? "This field is required."
                        : undefined
                    : undefined
                }
              />
            ))}
            <PrimaryButton
              title="Save delivery details"
              onPress={saveDelivery}
              loading={!!busy}
            />
            <SecondaryButton
              title="Cancel editing"
              onPress={() => setEdit(null)}
            />
          </Stack>
        </BottomSheet>
      </Stack>
    </ScreenContainer>
  );
}
