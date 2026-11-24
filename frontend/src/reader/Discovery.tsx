import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  SearchField,
  FilterChips,
  TextField,
  SecondaryButton,
  EmptyState,
  ShopCard,
  ResponsiveGrid,
  BottomSheet,
  useBreakpoint,
} from "../ui";
import { readerGet } from "./api";
import { useResource } from "./useResource";
import { Stack, Books, ResourceState, goShop } from "./shared";
export default function Discovery() {
  const params = useLocalSearchParams<{
    kind?: string;
    q?: string;
    category?: string;
    sort?: string;
    following?: string;
    resetKey?: string;
  }>();
  const { user } = useAuth();
  const bp = useBreakpoint();
  const [kind, setKind] = useState(params.kind || "books");
  const [q, setQ] = useState(params.q || "");
  const [search, setSearch] = useState(q);
  const [category, setCategory] = useState(params.category || "");
  const [sort, setSort] = useState(params.sort || "title");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [stock, setStock] = useState(false);
  const [location, setLocation] = useState("");
  const [following, setFollowing] = useState(params.following === "true");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(false);
  useEffect(() => {
    setKind(params.kind || "books");
    setQ(params.q || "");
    setSearch(params.q || "");
    if (params.resetKey) { setMin(""); setMax(""); setStock(false); setLocation(""); setFilters(false); }
    setCategory(params.category || "");
    setSort(params.sort || "title");
    setFollowing(params.following === "true");
    setPage(1);
  }, [params.kind, params.q, params.category, params.sort, params.following, params.resetKey]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const priceError =
    kind === "books" &&
    ((min !== "" && (!Number.isFinite(Number(min)) || Number(min) < 0)) ||
      (max !== "" && (!Number.isFinite(Number(max)) || Number(max) < 0)) ||
      (min !== "" && max !== "" && Number(min) > Number(max)))
      ? "Enter a valid price range. Minimum must not exceed maximum."
      : undefined;
  const query =
    kind === "books"
      ? {
          page,
          limit: 20,
          q: search,
          category,
          sort,
          minPrice: min,
          maxPrice: max,
          inStock: stock,
        }
      : {
          page,
          limit: 20,
          q: search,
          location,
          sort: sort === "rating" ? "rating" : "name",
          following,
        };
  const resource = useResource<any>(
    JSON.stringify([kind, query, priceError]),
    () =>
      priceError
        ? Promise.resolve({ items: [], total: 0 })
        : readerGet(kind, query, user?.token),
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  useEffect(() => {
    if (resource.data?.categories) setCategories(resource.data.categories);
    if (resource.data?.locations) setLocations(resource.data.locations);
  }, [resource.data]);
  const reset = () => {
    setQ("");
    setSearch("");
    setCategory("");
    setMin("");
    setMax("");
    setStock(false);
    setLocation("");
    setFollowing(false);
    setSort("title");
    setPage(1);
  };
  const change = (setter: any) => (value: any) => {
    setter(value);
    setPage(1);
  };
  const filterContent = (
    <Stack gap={20}>
      {kind === "books" ? (
        <>
          <FilterChips
            label="Genre"
            value={category}
            onChange={change(setCategory)}
            layout="wrap"
            options={[
              { value: "", label: "All genres" },
              ...categories.map((c: string) => ({
                value: c,
                label: c,
              })),
            ]}
          />
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Min price (LKR)"
                keyboardType="decimal-pad"
                value={min}
                onChangeText={change(setMin)}
                error={priceError}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Max price (LKR)"
                keyboardType="decimal-pad"
                value={max}
                onChangeText={change(setMax)}
              />
            </View>
          </View>
          <FilterChips
            label="Availability"
            value={stock ? "stock" : "all"}
            onChange={(v) => {
              setStock(v === "stock");
              setPage(1);
            }}
            options={[
              { value: "all", label: "Any availability" },
              { value: "stock", label: "In stock" },
            ]}
          />
          <FilterChips
            label="Sort books"
            value={sort}
            onChange={change(setSort)}
            layout="wrap"
            options={[
              { value: "title", label: "Title A–Z" },
              { value: "price-asc", label: "Price: low to high" },
              { value: "price-desc", label: "Price: high to low" },
              { value: "rating", label: "Highest rated" },
              { value: "newest", label: "Recently added" },
            ]}
          />
        </>
      ) : (
        <>
          <FilterChips
            label="Location"
            value={location}
            onChange={change(setLocation)}
            layout="wrap"
            options={[
              { value: "", label: "All locations" },
              ...locations.map((c: string) => ({
                value: c,
                label: c,
              })),
            ]}
          />
          <FilterChips
            label="Bookshop sort"
            value={sort === "rating" ? "rating" : "name"}
            onChange={change(setSort)}
            options={[
              { value: "name", label: "Name A–Z" },
              { value: "rating", label: "Highest rated" },
            ]}
          />
          <FilterChips
            label="Followed shops"
            value={following ? "yes" : "all"}
            onChange={(v) => {
              setFollowing(v === "yes");
              setPage(1);
            }}
            options={[
              { value: "all", label: "All bookshops" },
              { value: "yes", label: "Following" },
            ]}
          />
        </>
      )}
      <SecondaryButton title="Reset filters" onPress={reset} />
    </Stack>
  );
  return (
    <ScreenContainer key={`${kind}:${page}`}>
      <Stack>
        <AppHeader
          title="Find your next read"
          subtitle="Good books. Independent bookshops. Endless possibility."
        />
        <FilterChips
          label="Explore"
          value={kind}
          onChange={(v) => {
            change(setKind)(v);
            setSort(v === "books" ? "title" : "name");
          }}
          options={[
            { value: "books", label: "Books" },
            { value: "shops", label: "Bookshops" },
          ]}
        />
        <SearchField
          label={
            kind === "books" ? "Search title or author" : "Search shop or city"
          }
          value={q}
          onChangeText={setQ}
          onSubmit={() => {
            setSearch(q);
            setPage(1);
          }}
          placeholder={
            kind === "books"
              ? "Search by title or author"
              : "Search bookshops or cities"
          }
        />
        {!bp.isDesktopUp ? (
          <SecondaryButton
            title="Filter and sort"
            icon="options-outline"
            onPress={() => setFilters(true)}
          />
        ) : null}
        <View
          style={{ flexDirection: bp.isDesktopUp ? "row" : "column", gap: 32 }}
        >
          {bp.isDesktopUp ? (
            <View style={{ width: 280 }}>{filterContent}</View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0, gap: 24 }}>
            <AppText
              variant="bodySmall"
              color="textSecondary"
              accessibilityLiveRegion="polite"
            >
              {resource.loading
                ? "Finding your shelf…"
                : `${resource.data?.total ?? 0} ${kind === "books" ? "books" : "bookshops"} found`}
            </AppText>
            {priceError ? (
              <AppText color="danger" accessibilityRole="alert">
                {priceError}
              </AppText>
            ) : (
              <ResourceState resource={resource} />
            )}
            {kind === "books" ? (
              <Books
                books={resource.data?.items || []}
                columns={{
                  compact: 2,
                  phone: 2,
                  tablet: 3,
                  desktop: 3,
                  wide: 3,
                }}
              />
            ) : (
              <ResponsiveGrid
                columns={{
                  compact: 1,
                  phone: 1,
                  tablet: 2,
                  desktop: 2,
                  wide: 3,
                }}
              >
                {resource.data?.items?.map((s: any) => (
                  <ShopCard
                    key={s._id}
                    name={s.name}
                    location={s.location}
                    image={s.imageUrl}
                    rating={s.averageRating}
                    ratingCount={s.numReviews}
                    following={s.followers?.includes(user?._id)}
                    onPress={() => goShop(s._id)}
                  />
                ))}
              </ResponsiveGrid>
            )}
            {!resource.loading &&
            !resource.error &&
            resource.data?.total === 0 &&
            !priceError ? (
              <EmptyState
                title="Nothing on this shelf yet"
                message="Try a different search or clear your filters."
                action={{ label: "Reset filters", onPress: reset }}
              />
            ) : null}
            {resource.data?.pages > 1 ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                }}
              >
                <SecondaryButton
                  title="Previous"
                  disabled={page <= 1 || resource.loading}
                  onPress={() => setPage((p) => p - 1)}
                />
                <AppText>
                  Page {page} of {resource.data.pages}
                </AppText>
                <SecondaryButton
                  title="Next"
                  disabled={page >= resource.data.pages || resource.loading}
                  onPress={() => setPage((p) => p + 1)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Stack>
      <BottomSheet
        visible={filters}
        onClose={() => setFilters(false)}
        title="Filter your discovery"
      >
        <Stack gap={16}>{filterContent}
        <SecondaryButton
          title="Show results"
          onPress={() => setFilters(false)}
        /></Stack>
      </BottomSheet>
    </ScreenContainer>
  );
}
