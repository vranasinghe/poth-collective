import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  ScreenContainer,
  AppText,
  IconButton,
  SearchField,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  FilterChips,
  ShopCard,
  EmptyState,
  useTheme,
  useBreakpoint,
  ResponsiveGrid,
} from "../../src/ui";
import { BookCover } from "../../components/BookCover";
import { readerGet } from "../../src/reader/api";
import { useResource } from "../../src/reader/useResource";
import {
  Stack,
  Books,
  ResourceState,
  goBook,
  goShop,
} from "../../src/reader/shared";
import { BlogPreview } from "../../src/reader/Community";
export default function Home() {
  const { user } = useAuth();
  const t = useTheme();
  const bp = useBreakpoint();
  const [q, setQ] = useState("");
  const books = useResource("home-books", () =>
    readerGet("books", { page: 1, limit: 5, sort: "rating", inStock: true }),
  );
  const arrivals = useResource("home-new", () =>
    readerGet("books", { page: 1, limit: 4, sort: "newest", inStock: true }),
  );
  const shops = useResource("home-shops", () =>
    readerGet("shops", { page: 1, limit: 3, sort: "rating" }, user?.token),
  );
  const community = useResource<any[]>("home-community", () =>
    readerGet("blogs"),
  );
  const featured = books.data?.items?.[0];
  const rated = (books.data?.items || []).filter((b: any) => b.numReviews > 0);
  const explore = (params: any = {}) =>
    router.navigate({ pathname: "/(tabs)/explore", params: { kind: "books", q: "", category: "", sort: "title", following: "false", resetKey: String(Date.now()), ...params } });
  return (
    <ScreenContainer
      onRefresh={() => {
        books.refresh();
        arrivals.refresh();
        shops.refresh();
        community.refresh();
      }}
      refreshing={false}
    >
      <Stack gap={32}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" color="textSecondary">
              Hello, {user?.firstName || "Reader"}
            </AppText>
            <AppText variant="screenTitle">A good day for a book.</AppText>
          </View>
          <IconButton
            icon="person-outline"
            label="Open your profile"
            appearance="tonal"
            onPress={() => router.navigate("/(tabs)/account")}
          />
        </View>
        <SearchField
          label="Search books and bookshops"
          placeholder="A title, an author, a bookshop…"
          value={q}
          onChangeText={setQ}
          onSubmit={() => explore({ q, kind: "books" })}
        />
        <ResourceState resource={books} />
        {featured ? (
          <View
            style={{
              backgroundColor: t.colors.primarySoft,
              borderRadius: t.radii.lg,
              padding: bp.isPhone ? 24 : 40,
              flexDirection: bp.isPhone ? "column" : "row",
              gap: 32,
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, gap: 16, width: "100%" }}>
              <AppText variant="display" color="primary">
                Your next chapter starts here.
              </AppText>
              <AppText color="textSecondary">
                Explore {featured.title} by {featured.author}, available from{" "}
                {featured.shop?.name || "a Poth bookshop"}.
              </AppText>
              <PrimaryButton
                title="Discover this book"
                iconRight="arrow-forward"
                onPress={() => goBook(featured._id)}
              />
            </View>
            <BookCover
              title={featured.title}
              author={featured.author}
              imageUrl={featured.imageUrl}
              style={{
                width: bp.isPhone ? 140 : 184,
                height: bp.isPhone ? 210 : 276,
                borderRadius: t.radii.sm,
                ...t.shadows.medium,
              }}
            />
          </View>
        ) : !books.loading && !books.error ? (
          <EmptyState
            title="Your next chapter awaits"
            message="Bookshops will appear here as their catalogues become available."
            action={{
              label: "Explore bookshops",
              onPress: () => explore({ kind: "shops" }),
            }}
          />
        ) : null}
        {books.data?.items?.length ? (
          <Stack gap={16}>
            <SectionHeader
              title={rated.length ? "Highly rated reads" : "On the shelves"}
              subtitle={
                rated.length
                  ? "Rated by the Poth community."
                  : "Available books from the current catalogue."
              }
              action={{
                label: "All books",
                onPress: () => explore({ sort: "rating" }),
              }}
            />
            <Books
              books={
                rated.length ? rated.slice(0, 4) : books.data.items.slice(0, 4)
              }
            />
          </Stack>
        ) : null}
        {books.data?.categories?.length ? (
          <Stack gap={16}>
            <SectionHeader
              title="Follow your curiosity"
              subtitle="Find a shelf that feels like you."
            />
            <FilterChips
              label="Browse by genre"
              value=""
              onChange={(category) => explore({ category, kind: "books" })}
              layout="wrap"
              options={books.data.categories.map((c: string) => ({
                value: c,
                label: c,
              }))}
            />
          </Stack>
        ) : null}
        <Stack gap={16}>
          <SectionHeader
            title="Bookshops worth knowing"
            subtitle="Find your local literary corner."
            action={{
              label: "All bookshops",
              onPress: () => explore({ kind: "shops" }),
            }}
          />
          <ResourceState resource={shops} />
          <ResponsiveGrid
            columns={{ compact: 1, phone: 1, tablet: 2, desktop: 3, wide: 3 }}
          >
            {shops.data?.items.map((s: any) => (
              <ShopCard
                key={s._id}
                name={s.name}
                location={s.location}
                image={s.imageUrl}
                rating={s.averageRating}
                ratingCount={s.numReviews}
                onPress={() => goShop(s._id)}
              />
            ))}
          </ResponsiveGrid>
          {shops.data?.total === 0 ? (
            <AppText color="textSecondary">
              No bookshops listed yet. Check back soon.
            </AppText>
          ) : null}
        </Stack>
        <ResourceState resource={arrivals} />
        {arrivals.data?.items?.some((b: any) => b.createdAt) ? (
          <Stack gap={16}>
            <SectionHeader
              title="New to the shelves"
              subtitle="Recently added to Poth, whatever their publication date."
              action={{
                label: "See arrivals",
                onPress: () => explore({ sort: "newest" }),
              }}
            />
            <Books
              books={arrivals.data.items
                .filter((b: any) => b.createdAt)
                .slice(0, 4)}
            />
          </Stack>
        ) : null}
        <Stack gap={16}>
          <SectionHeader
            title="Between the pages"
            subtitle="Stories and ideas from fellow readers."
            action={{
              label: "Community",
              onPress: () => router.navigate("/(tabs)/blogs"),
            }}
          />
          <ResourceState resource={community} />
          {community.data?.slice(0, 2).map((b) => (
            <BlogPreview key={b._id} blog={b} />
          ))}
          {community.data?.length === 0 ? (
            <EmptyState
              compact
              title="Start a conversation"
              message="Share a reading discovery with the community."
              action={{
                label: "Write a post",
                onPress: () => router.push("/blog/create"),
              }}
            />
          ) : null}
        </Stack>
        <SecondaryButton
          title="Updates from followed shops"
          icon="notifications-outline"
          onPress={() => router.push("/(tabs)/alerts")}
        />
      </Stack>
    </ScreenContainer>
  );
}
