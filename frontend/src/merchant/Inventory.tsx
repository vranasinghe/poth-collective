import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet, errorMessage } from "./api";
import { deleteBookAPI } from "../api/bookApi";
import { BookCover } from "../../components/BookCover";
import {
  AppText,
  BottomSheet,
  SecondaryButton,
  SearchField,
  FilterChips,
  StatusBadge,
  EmptyState,
  useBreakpoint,
  useTheme,
  useConfirm,
  useToast,
} from "../ui";
import {
  MerchantScreen,
  Stack,
  ShopScope,
  useMerchant,
  ResourceState,
  Select,
  Pager,
  NewShopState,
  AddBookButton,
  editBook,
} from "./shared";
export function InventoryRow({
  book: b,
  compact = false,
  onRemove,
  busy = false,
}: {
  book: any;
  compact?: boolean;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const bp = useBreakpoint();
  const t = useTheme();
  const table = bp.isDesktopUp && !compact;
  const status =
    b.stockCount === 0
      ? "Out of stock"
      : b.stockCount <= 5
        ? "Low stock"
        : "In stock";
  return (
    <View
      style={{
        flexDirection: table ? "row" : "column",
        gap: 16,
        paddingVertical: table ? 20 : 16,
        borderBottomWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 16,
          flex: table ? 2.2 : undefined,
          minWidth: 0,
        }}
      >
        <BookCover
          title={b.title}
          author={b.author}
          imageUrl={b.imageUrl}
          style={{ width: 56, height: 84, borderRadius: t.radii.sm }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="cardTitle" numberOfLines={2}>
            {b.title}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {b.author}
          </AppText>
          {!compact ? (
            <AppText variant="caption" color="textMuted">
              {b.shop?.name}
            </AppText>
          ) : null}
          {!table ? (
            <AppText variant="bodySmall">
              {b.category} · LKR {Number(b.price).toLocaleString()}
            </AppText>
          ) : null}
          {!table ? (
            <AppText
              variant="bodySmall"
              color={
                b.stockCount === 0
                  ? "danger"
                  : b.stockCount <= 5
                    ? "warning"
                    : "textSecondary"
              }
            >
              {b.stockCount} copies · {status}
            </AppText>
          ) : null}
        </View>
      </View>
      {table ? (
        <View style={{ flex: 0.8, justifyContent: "center" }}>
          <AppText variant="bodySmall">{b.category}</AppText>
        </View>
      ) : null}
      {table ? (
        <View
          style={{
            flex: table ? 0.9 : undefined,
            gap: 8,
            justifyContent: "center",
          }}
        >
          <AppText variant="bodySmall">{b.stockCount} copies</AppText>
          <StatusBadge
            tone={
              b.stockCount === 0
                ? "danger"
                : b.stockCount <= 5
                  ? "warning"
                  : "success"
            }
            label={status}
          />
        </View>
      ) : null}
      {table ? (
        <View style={{ flex: 0.8, justifyContent: "center" }}>
          <AppText variant="bodySmall">
            LKR {Number(b.price).toLocaleString()}
          </AppText>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          flex: table ? 1.2 : undefined,
        }}
      >
        <SecondaryButton
          title="Edit book"
          size="sm"
          onPress={() => editBook(b._id)}
          disabled={busy}
          accessibilityLabel={`Edit ${b.title}`}
        />
        {onRemove ? (
          <SecondaryButton
            title="Remove"
            size="sm"
            onPress={onRemove}
            disabled={busy}
            loading={busy}
            accessibilityLabel={`Remove ${b.title}`}
          />
        ) : null}
      </View>
    </View>
  );
}
export default function Inventory() {
  const { user } = useAuth();
  const { shopId, shops, shopsResource } = useMerchant();
  const params = useLocalSearchParams<{ stock?: string; resetKey?: string }>();
  const bp = useBreakpoint();
  const t = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const [filters, setFilters] = useState(false);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState(params.stock || "all");
  const [sort, setSort] = useState("title");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    setStock(params.stock || "all");
    setQ("");
    setQuery("");
    setCategory("");
    setSort("title");
    setPage(1);
  }, [params.stock, params.resetKey, shopId]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const resource = useResource<any>(
    `merchant-inventory:${JSON.stringify([shopId, query, stock, sort, category, page])}`,
    () =>
      merchantGet(
        "merchant/inventory",
        { shop: shopId, q: query, stock, sort, category, page, limit: 20 },
        user?.token,
      ),
  );
  useEffect(() => {
    if (resource.data?.categories) setCategories(resource.data.categories);
  }, [resource.data]);
  const remove = async (book: any) => {
    if (
      !user ||
      busy ||
      !(await confirm({
        title: `Remove ${book.title}?`,
        message:
          "Readers will no longer be able to order this book. Listings without order history may be permanently deleted. Existing order history is retained, and you still need to fulfil any open orders. You can add a new listing later.",
        confirmLabel: "Remove book",
        tone: "danger",
      }))
    )
      return;
    setBusy(book._id);
    try {
      const result = await deleteBookAPI(book._id, user.token);
      await resource.refresh();
      toast.success(result.data.message || "Book removed from sale.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const change = (setter: any) => (value: any) => {
    setter(value);
    setPage(1);
  };
  const filterContent = (
    <Stack gap={16}>
      <FilterChips
        label="Stock status"
        layout="wrap"
        value={stock}
        onChange={(v) => change(setStock)(v || "all")}
        options={[
          { value: "all", label: "All stock" },
          { value: "low", label: "Low stock (1–5)" },
          { value: "out", label: "Out of stock" },
          { value: "attention", label: "Needs attention" },
        ]}
      />
      <View
        style={{ flexDirection: bp.isTabletUp ? "row" : "column", gap: 16 }}
      >
        <View style={{ flex: 1 }}>
          <Select
            label="Category"
            value={category}
            onChange={change(setCategory)}
            options={[
              { value: "", label: "All categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            label="Sort inventory"
            value={sort}
            onChange={change(setSort)}
            options={[
              { value: "title", label: "Title A–Z" },
              { value: "stock", label: "Lowest stock first" },
              { value: "price-asc", label: "Price: low to high" },
              { value: "price-desc", label: "Price: high to low" },
              { value: "newest", label: "Recently added" },
            ]}
          />
        </View>
      </View>
      <SecondaryButton
        title="Reset inventory filters"
        onPress={() => {
          setQ("");
          setQuery("");
          setCategory("");
          setStock("all");
          setSort("title");
          setPage(1);
        }}
      />
    </Stack>
  );
  return (
    <MerchantScreen
      key={`${shopId}:${page}`}
      title="Your inventory"
      subtitle="Keep every shelf accurate and easy to discover."
      onRefresh={resource.refresh}
      refreshing={resource.loading && !!resource.data}
    >
      <ShopScope />
      {!shopsResource.loading && !shopsResource.error && shops.length === 0 ? (
        <NewShopState />
      ) : (
        <>
          <AddBookButton />
          <SearchField
            label="Search your inventory"
            value={q}
            onChangeText={setQ}
            onSubmit={() => {
              setQuery(q);
              setPage(1);
            }}
            placeholder="Search title or author"
          />
          {bp.isDesktopUp ? (
            filterContent
          ) : (
            <SecondaryButton
              title="Filter inventory"
              icon="options-outline"
              onPress={() => setFilters(true)}
            />
          )}

          <ResourceState resource={resource} />
          <AppText variant="bodySmall" accessibilityLiveRegion="polite">
            {resource.loading
              ? "Loading inventory…"
              : `${resource.data?.total ?? 0} active book ${resource.data?.total === 1 ? "listing" : "listings"}`}
          </AppText>
          {bp.isDesktopUp && resource.data?.items?.length ? (
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: t.colors.border,
              }}
            >
              {[
                ["Book", 2.2],
                ["Category", 0.8],
                ["Stock", 0.9],
                ["Price", 0.8],
                ["Actions", 1.2],
              ].map(([label, flex]) => (
                <View key={String(label)} style={{ flex: Number(flex) }}>
                  <AppText variant="label">{label}</AppText>
                </View>
              ))}
            </View>
          ) : null}
          <Stack gap={0}>
            {resource.data?.items?.map((b: any) => (
              <InventoryRow
                key={b._id}
                book={b}
                busy={busy === b._id}
                onRemove={() => {
                  void remove(b);
                }}
              />
            ))}
          </Stack>
          {resource.data?.total === 0 &&
          !resource.loading &&
          !resource.error ? (
            <EmptyState
              title="No books on this shelf"
              message="Add your first book or reset your filters to see other listings."
              action={{
                label: "Add a book",
                onPress: () => router.push("/owner/register-book"),
              }}
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
      <BottomSheet
        visible={filters}
        onClose={() => setFilters(false)}
        title="Inventory filters"
      >
        <Stack gap={16}>
          {filterContent}
          <SecondaryButton
            title="Show inventory"
            onPress={() => setFilters(false)}
          />
        </Stack>
      </BottomSheet>
    </MerchantScreen>
  );
}
