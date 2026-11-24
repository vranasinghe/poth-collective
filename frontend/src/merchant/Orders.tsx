import React, { useEffect, useState } from "react";
import { View, Image, Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet, errorMessage } from "./api";
import { updateOrderStatusAPI, deleteOrderAPI } from "../api/orderApi";
import {
  AppText,
  OrderCard,
  PrimaryButton,
  SecondaryButton,
  FilterChips,
  EmptyState,
  StatusBadge,
  formatDate,
  useConfirm,
  useToast,
  useTheme,
} from "../ui";
import {
  MerchantScreen,
  Stack,
  ResourceState,
  ShopScope,
  useMerchant,
  NewShopState,
  Pager,
  orderDetail,
} from "./shared";
export default function Orders() {
  const { user } = useAuth();
  const { shopId, shops, shopsResource } = useMerchant();
  const params = useLocalSearchParams<{ status?: string; resetKey?: string }>();
  const [status, setStatus] = useState(params.status || "All");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setStatus(params.status || "All");
    setPage(1);
  }, [params.status, params.resetKey, shopId]);
  const resource = useResource<any>(
    `merchant-orders:${shopId}:${status}:${page}`,
    () =>
      merchantGet(
        "merchant/orders",
        { shop: shopId, status, page, limit: 20 },
        user?.token,
      ),
  );
  return (
    <MerchantScreen
      key={`${shopId}:${page}`}
      title="Orders to take care of"
      subtitle="A clear next step for every reader’s order."
      onRefresh={resource.refresh}
      refreshing={resource.loading && !!resource.data}
    >
      <ShopScope />
      {!shopsResource.loading &&
      !shopsResource.error &&
      !shops.length &&
      resource.data?.total === 0 ? (
        <NewShopState />
      ) : (
        <>
          <FilterChips
            label="Order status"
            value={status}
            onChange={(v) => {
              setStatus(v || "All");
              setPage(1);
            }}
            layout="wrap"
            options={[
              "All",
              "Pending",
              "Confirmed",
              "Shipped",
              "Delivered",
              "Cancelled",
            ].map((s) => ({ value: s, label: s }))}
          />
          <ResourceState resource={resource} />
          <AppText variant="bodySmall" accessibilityLiveRegion="polite">
            {resource.loading
              ? "Loading your orders…"
              : `${resource.data?.total ?? 0} ${resource.data?.total === 1 ? "order" : "orders"}`}
          </AppText>
          {resource.data?.items.map((o: any) => (
            <OrderCard
              key={o._id}
              orderId={o._id}
              status={o.status}
              bookTitle={o.book?.title || "Removed book"}
              bookAuthor={o.book?.author}
              bookImage={o.book?.imageUrl}
              counterpart={{
                label: "Customer",
                name: `${o.reader?.firstName || "Former"} ${o.reader?.lastName || "reader"}`,
                detail: o.shop?.name,
              }}
              quantity={o.quantity}
              total={o.totalPrice}
              date={o.createdAt}
              actions={[
                {
                  label: "Review order",
                  tone: "secondary",
                  onPress: () => orderDetail(o._id),
                },
              ]}
            />
          ))}
          {resource.data?.total === 0 &&
          !resource.error &&
          !resource.loading ? (
            <EmptyState
              title={
                status === "All"
                  ? "Ready for your first order"
                  : `No ${status.toLowerCase()} orders`
              }
              message="Orders submitted by readers will appear here. Other statuses remain available above."
            />
          ) : null}
          <Pager
            page={page}
            pages={resource.data?.pages || 0}
            onChange={setPage}
            busy={resource.loading}
          />
        </>
      )}
    </MerchantScreen>
  );
}
export function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const t = useTheme();
  const resource = useResource<any>(`merchant-order:${id}`, () =>
    merchantGet(`merchant/orders/${id}`, {}, user?.token),
  );
  const o = resource.data;
  const change = async (next: string) => {
    if (busy || !o?.allowedStatuses.includes(next)) return;
    if (next === "Confirmed" && !reviewed) return;
    if (
      !(await confirm({
        title: `Mark order ${next.toLowerCase()}?`,
        message:
          next === "Cancelled"
            ? "Stock will be returned. Arrange any refund directly with the customer."
            : next === "Confirmed"
              ? "Confirm only after checking the transfer against your own records. Poth does not independently verify payment."
              : `This changes the order from ${o.status} to ${next}.`,
        confirmLabel:
          next === "Cancelled" ? "Cancel order" : `Mark ${next.toLowerCase()}`,
        tone: next === "Cancelled" ? "danger" : "default",
      }))
    )
      return;
    setBusy(true);
    try {
      await updateOrderStatusAPI(id, next);
      await resource.refresh();
      setReviewed(false);
      toast.success(`Order marked ${next.toLowerCase()}.`);
    } catch (e) {
      toast.error(errorMessage(e));
      await resource.refresh();
    } finally {
      setBusy(false);
    }
  };
  const hide = async () => {
    if (
      !(await confirm({
        title: "Hide this finished order?",
        message:
          "It leaves your list. The order record and report counts are retained.",
        confirmLabel: "Hide order",
      }))
    )
      return;
    setBusy(true);
    try {
      await deleteOrderAPI(id);
      router.replace("/owner/(tabs)/orders");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <MerchantScreen
      title="Order details"
      form
      back
      onRefresh={resource.refresh}
    >
      <ResourceState resource={resource} />
      {o ? (
        <Stack>
          <AppText variant="sectionTitle">
            Order #{o._id.slice(-6).toUpperCase()}
          </AppText>
          <StatusBadge status={o.status} />
          <AppText color="textSecondary">
            Placed {formatDate(o.createdAt)} · {o.shop?.name || "Archived shop"}
          </AppText>
          <AppText variant="sectionTitle">
            {o.book?.title || "Removed book"}
          </AppText>
          <AppText>{o.book?.author}</AppText>
          <AppText>
            Quantity: {o.quantity} · LKR {Number(o.totalPrice).toLocaleString()}
          </AppText>
          <AppText variant="sectionTitle">Customer and delivery</AppText>
          <AppText>
            {o.reader?.firstName || "Former"} {o.reader?.lastName || "reader"}
          </AppText>
          {o.reader?.email ? <AppText>{o.reader.email}</AppText> : null}
          <AppText>{o.deliveryDetails?.address}</AppText>
          <AppText>
            {o.deliveryDetails?.city} · {o.deliveryDetails?.phone}
          </AppText>
          <AppText variant="sectionTitle">Payment evidence</AppText>
          <AppText>
            Review the slip and check your own bank records. A slip upload is
            not proof that a payment was verified by Poth.
          </AppText>
          <SecondaryButton
            title="Review payment slip"
            icon="image-outline"
            disabled={!o.paymentSlipUrl || busy}
            onPress={() =>
              router.push({
                pathname: "/owner/view-slip",
                params: { orderId: o._id },
              })
            }
          />
          {o.status === "Pending" ? (
            <FilterChips
              label="Payment evidence review acknowledgement"
              value={reviewed ? "reviewed" : "not-reviewed"}
              onChange={(v) => setReviewed(v === "reviewed")}
              layout="wrap"
              options={[
                { value: "not-reviewed", label: "Not yet reviewed" },
                { value: "reviewed", label: "I checked the transfer records" },
              ]}
            />
          ) : null}
          {o.allowedStatuses.map((next: string) => (
            <PrimaryButton
              key={next}
              title={
                next === "Confirmed"
                  ? "Confirm order"
                  : next === "Cancelled"
                    ? "Cancel order"
                    : next === "Shipped"
                      ? "Mark shipped"
                      : "Mark delivered"
              }
              tone={next === "Cancelled" ? "danger" : "default"}
              loading={busy}
              disabled={busy || (next === "Confirmed" && !reviewed)}
              onPress={() => change(next)}
            />
          ))}
          {["Delivered", "Cancelled"].includes(o.status) ? (
            <SecondaryButton
              title="Hide finished order"
              onPress={hide}
              disabled={busy}
            />
          ) : null}
          <View
            style={{
              gap: 8,
              padding: 20,
              backgroundColor: t.colors.surfaceMuted,
              borderRadius: t.radii.md,
            }}
          >
            <AppText variant="label">Current lifecycle</AppText>
            <AppText>
              {o.status === "Cancelled"
                ? "Cancelled"
                : `Pending → Confirmed → Shipped → Delivered. Current status: ${o.status}.`}
            </AppText>
          </View>
        </Stack>
      ) : null}
    </MerchantScreen>
  );
}
export function PaymentSlip() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { user } = useAuth();
  const [failed, setFailed] = useState(false);
  const resource = useResource<any>(`merchant-slip:${orderId}`, () =>
    orderId
      ? merchantGet(`merchant/orders/${orderId}`, {}, user?.token)
      : Promise.resolve(null),
  );
  const uri = resource.data?.paymentSlipUrl;
  return (
    <MerchantScreen
      title="Payment slip"
      subtitle="Evidence for shop review; not independent payment verification."
      back
    >
      <ResourceState resource={resource} />
      {uri && !failed ? (
        <Image
          accessibilityLabel="Payment slip submitted by the customer"
          source={{ uri }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: 520 }}
        />
      ) : !resource.loading ? (
        <EmptyState
          title="Slip image unavailable"
          message={
            orderId
              ? "The upload could not be displayed. Reload the order or ask the customer to resend the evidence."
              : "Open a payment slip from an authorized order."
          }
          action={{
            label: "Reload evidence",
            onPress: () => {
              setFailed(false);
              resource.refresh();
            },
          }}
        />
      ) : null}
      {uri ? (
        <SecondaryButton
          title="Open full-size slip"
          onPress={async () => {
            try {
              await Linking.openURL(uri);
            } catch {
              setFailed(true);
            }
          }}
        />
      ) : null}
    </MerchantScreen>
  );
}
