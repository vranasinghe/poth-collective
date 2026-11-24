import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  RatingStars,
  StatusBadge,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  useBreakpoint,
  useTheme,
} from "../../src/ui";
import { BookCover } from "../../components/BookCover";
import { readerGet } from "../../src/reader/api";
import { useResource } from "../../src/reader/useResource";
import { Stack, ResourceState, Books, goShop } from "../../src/reader/shared";
import { ReviewSection } from "../../src/reader/Reviews";
export default function BookDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bp = useBreakpoint();
  const t = useTheme();
  const book = useResource<any>(`book:${id}`, () => readerGet(`books/${id}`));
  const b = book.data;
  const related = useResource<any>(`related:${b?.category || ""}:${id}`, () =>
    b
      ? readerGet("books", {
          page: 1,
          limit: 5,
          category: b.category,
          inStock: true,
        })
      : Promise.resolve({ items: [] }),
  );
  return (
    <ScreenContainer keyboardAvoiding>
      <Stack gap={32}>
        <AppHeader
          title="The bookshelf"
          onBack={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/explore")
          }
        />
        <ResourceState resource={book} />
        {b ? (
          <>
            <View
              style={{
                flexDirection: bp.isTabletUp ? "row" : "column",
                gap: 32,
              }}
            >
              <View
                style={{
                  backgroundColor: t.colors.surfaceMuted,
                  borderRadius: t.radii.lg,
                  alignItems: "center",
                  padding: 32,
                  width: bp.isTabletUp ? 320 : "100%",
                }}
              >
                <BookCover
                  title={b.title}
                  author={b.author}
                  imageUrl={b.imageUrl}
                  style={{
                    width: 184,
                    height: 276,
                    borderRadius: t.radii.sm,
                    ...t.shadows.medium,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 16 }}>
                <AppText variant="display">{b.title}</AppText>
                <AppText variant="sectionTitle" color="textSecondary">
                  by {b.author}
                </AppText>
                <RatingStars value={b.averageRating} count={b.numReviews} />
                <AppText color="textMuted">
                  {b.numReviews || 0} reviews · {b.category}
                </AppText>
                <AppText variant="sectionTitle">
                  LKR{" "}
                  {Number(b.price).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </AppText>
                <StatusBadge
                  tone={b.stockCount > 0 ? "success" : "warning"}
                  label={
                    b.stockCount > 0
                      ? `${b.stockCount} available`
                      : "Out of stock"
                  }
                />
                {b.shop ? (
                  <SecondaryButton
                    title={`Visit ${b.shop.name}`}
                    icon="storefront-outline"
                    onPress={() => goShop(b.shop._id)}
                  />
                ) : null}
                <PrimaryButton
                  title={b.stockCount > 0 ? "Order this book" : "Out of stock"}
                  icon="bag-outline"
                  disabled={b.stockCount <= 0 || !b.shop}
                  onPress={() =>
                    router.push({
                      pathname: "/orders/create",
                      params: { bookId: b._id },
                    })
                  }
                />
                <AppText variant="caption" color="textMuted">
                  Payment slips are reviewed by the bookshop before
                  confirmation.
                </AppText>
              </View>
            </View>
            <Stack gap={16}>
              <SectionHeader title="About this book" />
              <AppText style={{ maxWidth: 720 }}>{b.description}</AppText>
              {b.shop?.location ? (
                <AppText color="textSecondary">
                  Available at {b.shop.name}, {b.shop.location}.
                </AppText>
              ) : null}
            </Stack>
            <ReviewSection id={id} model="Book" onChanged={book.refresh} />
            {related.data?.items?.filter(
              (r: any) => r._id !== id && r.title !== b.title,
            ).length ? (
              <Stack gap={16}>
                <SectionHeader title="On the same shelf" />
                <Books
                  books={related.data.items
                    .filter((r: any) => r._id !== id && r.title !== b.title)
                    .slice(0, 4)}
                />
              </Stack>
            ) : null}
          </>
        ) : null}
      </Stack>
    </ScreenContainer>
  );
}
