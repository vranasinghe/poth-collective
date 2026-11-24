import React, { ReactNode, useEffect, useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import {
  AppText,
  BookCard,
  ResponsiveGrid,
  useTheme,
  Icon,
  ErrorState,
  LoadingSkeleton,
} from "../ui";
export const goBook = (id: string) =>
  router.push({ pathname: "/book/[id]", params: { id } });
export const goShop = (id: string) =>
  router.push({ pathname: "/shop/[id]", params: { id } });
export function Books({ books, columns }: { books: any[]; columns?: any }) {
  return (
    <ResponsiveGrid columns={columns}>
      {books.map((b) => (
        <BookCard
          key={b._id}
          title={b.title}
          author={b.author}
          shopName={b.shop?.name}
          image={b.imageUrl}
          rating={b.averageRating || 0}
          ratingCount={b.numReviews}
          price={b.price}
          stock={b.stockCount}
          onPress={() => goBook(b._id)}
        />
      ))}
    </ResponsiveGrid>
  );
}
export function Stack({
  children,
  gap = 24,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return <View style={{ gap }}>{children}</View>;
}
export function ResourceState({
  resource,
}: {
  resource: {
    error?: string;
    loading: boolean;
    data?: any;
    refresh: () => any;
  };
}) {
  if (resource.error)
    return (
      <ErrorState
        message={resource.error}
        onRetry={resource.refresh}
        retrying={resource.loading}
      />
    );
  if (resource.loading && !resource.data)
    return <LoadingSkeleton variant="list" />;
  return null;
}
export function EditorialImage({
  uri,
  label,
  height = 200,
}: {
  uri?: string;
  label: string;
  height?: number;
}) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed && !/placeholder/.test(uri) ? (
    <Image
      accessibilityLabel={label}
      source={{ uri }}
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height,
        borderRadius: t.radii.md,
        backgroundColor: t.colors.surfaceMuted,
      }}
      resizeMode="cover"
    />
  ) : (
    <View
      accessibilityLabel={label}
      style={{
        height,
        backgroundColor: t.colors.primarySoft,
        borderRadius: t.radii.md,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Icon name="book-outline" size="hero" color="primary" />
      <AppText serif variant="sectionTitle" color="primary">
        {label}
      </AppText>
    </View>
  );
}
