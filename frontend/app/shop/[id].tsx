import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  RatingStars,
  PrimaryButton,
  SectionHeader,
  SecondaryButton,
  useToast,
} from "../../src/ui";
import { useAuth } from "../../src/context/AuthContext";
import { toggleFollowShopAPI } from "../../src/api/shopApi";
import { readerGet, errorMessage } from "../../src/reader/api";
import { useResource } from "../../src/reader/useResource";
import {
  Stack,
  ResourceState,
  Books,
  EditorialImage,
} from "../../src/reader/shared";
import { ReviewSection } from "../../src/reader/Reviews";
import OwnerShopProfile from "../../components/OwnerShopProfile";
export default function ShopRoute() {
  const { isShopOwner } = useAuth();
  return isShopOwner ? <OwnerShopProfile /> : <ReaderShop />;
}
function ReaderShop() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const shop = useResource<any>(`shop:${id}`, () =>
    readerGet(`shops/${id}`, {}, user?.token),
  );
  const books = useResource<any>(`shop-books:${id}:${page}`, () =>
    readerGet("books", { page, limit: 20, shop: id, inStock: true }),
  );
  const s = shop.data;
  const follow = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await toggleFollowShopAPI(id, user.token);
      await shop.refresh();
      toast.success(
        s.followers?.includes(user._id)
          ? "Bookshop unfollowed."
          : "Bookshop followed. Find its updates in your profile.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer key={`${id}:${page}`} keyboardAvoiding>
      <Stack gap={32}>
        <AppHeader
          title="Independent bookshops"
          onBack={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/explore")
          }
        />
        <ResourceState resource={shop} />
        {s ? (
          <>
            <EditorialImage uri={s.imageUrl} label={s.name} height={240} />
            <AppText variant="display">{s.name}</AppText>
            <AppText color="textSecondary">
              {s.location} · {s.contactNumber}
            </AppText>
            <RatingStars value={s.averageRating} count={s.numReviews} />
            <AppText>{s.description}</AppText>
            <PrimaryButton
              title={
                s.followers?.includes(user?._id)
                  ? "Unfollow bookshop"
                  : "Follow bookshop"
              }
              icon="storefront-outline"
              onPress={follow}
              loading={busy}
            />
            <Stack gap={16}>
              <SectionHeader
                title="Available in this bookshop"
                subtitle={`${books.data?.total ?? 0} books in stock`}
              />
              <ResourceState resource={books} />
              <Books books={books.data?.items || []} />
              {books.data?.total === 0 ? (
                <AppText color="textSecondary">
                  This shop has no available books yet.
                </AppText>
              ) : null}
              {books.data?.pages > 1 ? (
                <>
                  <SecondaryButton
                    title="Previous books"
                    disabled={page === 1}
                    onPress={() => setPage((p) => p - 1)}
                  />
                  <AppText>
                    Page {page} of {books.data.pages}
                  </AppText>
                  <SecondaryButton
                    title="Next books"
                    disabled={page >= books.data.pages}
                    onPress={() => setPage((p) => p + 1)}
                  />
                </>
              ) : null}
            </Stack>
            <ReviewSection id={id} model="Shop" onChanged={shop.refresh} />
          </>
        ) : null}
      </Stack>
    </ScreenContainer>
  );
}
