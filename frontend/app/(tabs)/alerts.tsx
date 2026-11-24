import React from "react";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  SecondaryButton,
  EmptyState,
  formatDate,
} from "../../src/ui";
import { readerGet } from "../../src/reader/api";
import { useResource } from "../../src/reader/useResource";
import {
  Stack,
  ResourceState,
  EditorialImage,
  goShop,
} from "../../src/reader/shared";
export default function ShopUpdates() {
  const { user } = useAuth();
  const resource = useResource<any[]>("shop-updates", () =>
    readerGet("reports", {}, user?.token),
  );
  return (
    <ScreenContainer width="reading">
      <Stack>
        <AppHeader
          title="From your bookshops"
          subtitle="Published stock updates from shops you follow."
          onBack={() => router.back()}
        />
        <ResourceState resource={resource} />
        {resource.data?.length === 0 ? (
          <EmptyState
            title="Keep your favourite shops close"
            message="Follow a bookshop to see its published stock updates here."
            action={{
              label: "Discover bookshops",
              onPress: () =>
                router.navigate({
                  pathname: "/(tabs)/explore",
                  params: { kind: "shops" },
                }),
            }}
          />
        ) : null}
        {resource.data?.map((r) => (
          <Stack key={r._id} gap={16}>
            <AppText variant="sectionTitle">{r.title}</AppText>
            <AppText variant="caption" color="textMuted">
              {r.shopName} · {formatDate(r.createdAt)}
            </AppText>
            {r.notes ? <AppText>{r.notes}</AppText> : null}
            {r.imageUrl ? (
              <EditorialImage uri={r.imageUrl} label={r.title} />
            ) : null}
            {r.breakdown?.map((b: any, i: number) => (
              <AppText key={i} variant="bodySmall">
                {b.bookName} · {b.stockAmount} in stock at publication
              </AppText>
            ))}
            <SecondaryButton
              title="Visit bookshop"
              onPress={() => goShop(r.shopId)}
            />
          </Stack>
        ))}
      </Stack>
    </ScreenContainer>
  );
}
