import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet } from "./api";
import {
  AppText,
  IconButton,
  SecondaryButton,
  SectionHeader,
  OrderCard,
  EmptyState,
  useBreakpoint,
} from "../ui";
import {
  MerchantScreen,
  ShopScope,
  useMerchant,
  ResourceState,
  OperationalMetrics,
  NewShopState,
  openInventory,
  openOrders,
  orderDetail,
  AddBookButton,
} from "./shared";
import { InventoryRow } from "./Inventory";
export default function Overview() {
  const { user } = useAuth();
  const { shopId, refreshShops } = useMerchant();
  const bp = useBreakpoint();
  const resource = useResource<any>(`merchant-summary:${shopId}`, () =>
    merchantGet("merchant/summary", { shop: shopId }, user?.token),
  );
  const d = resource.data;
  const refresh = () => {
    resource.refresh();
    refreshShops();
  };
  const shop =
    d?.shops.find((s: any) => s._id === shopId) ||
    (d?.shops.length === 1 ? d.shops[0] : null);
  return (
    <MerchantScreen
      title="The bookshop desk"
      subtitle={`Welcome back, ${user?.firstName || "bookseller"}.`}
      onRefresh={refresh}
      refreshing={resource.loading && !!d}
      spacing={bp.isPhone ? 16 : 24}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <ShopScope />
        </View>
        <IconButton
          icon="storefront-outline"
          label={shop ? "Open shop profile" : "Manage shop profiles"}
          appearance="tonal"
          onPress={() =>
            shop
              ? router.push({
                  pathname: "/owner/register-shop",
                  params: { id: shop._id },
                })
              : router.navigate("/owner/(tabs)/account")
          }
        />
      </View>
      <ResourceState resource={resource} />
      {d && d.shops.length === 0 ? (
        <NewShopState />
      ) : d ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <AddBookButton compact />
            <SecondaryButton
              size="sm"
              title="Review orders"
              icon="receipt-outline"
              onPress={() => openOrders("Pending")}
            />
          </View>
          <OperationalMetrics data={d} />
          <View
            style={{
              flexDirection: bp.isDesktopUp ? "row" : "column",
              gap: 32,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: bp.isPhone ? 8 : 16 }}>
              <SectionHeader
                compact={bp.isPhone}
                title="Inventory attention"
                subtitle="Out of stock first, then books with five copies or fewer."
                action={{
                  label: "View inventory",
                  onPress: () => openInventory("attention"),
                }}
              />
              {d.attention.length ? (
                d.attention.map((b: any) => (
                  <InventoryRow key={b._id} book={b} compact />
                ))
              ) : (
                <EmptyState
                  compact
                  title="Your shelves are in good shape"
                  message="No active books have five copies or fewer."
                />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
              <SectionHeader
                compact={bp.isPhone}
                title="Recent order updates"
                subtitle="Latest changes to your actual order records."
                action={{ label: "All orders", onPress: () => openOrders() }}
              />
              {d.recentOrders.length ? (
                d.recentOrders.map((o: any) => (
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
                    }}
                    quantity={o.quantity}
                    total={o.totalPrice}
                    date={o.updatedAt || o.createdAt}
                    actions={[
                      {
                        label: "Review order",
                        onPress: () => orderDetail(o._id),
                        tone: "secondary",
                      },
                    ]}
                  />
                ))
              ) : (
                <EmptyState
                  compact
                  title="Ready for your first order"
                  message="Orders will appear here when a reader submits one."
                  action={{
                    label: "Manage inventory",
                    onPress: () => openInventory(),
                  }}
                />
              )}
            </View>
          </View>
          <AppText variant="caption" color="textMuted">
            Order counts include retained order records. Low stock means 1–
            {d.lowStockThreshold} copies.
          </AppText>
        </>
      ) : null}
    </MerchantScreen>
  );
}
