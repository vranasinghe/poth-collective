import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  getReviewsAPI,
  addReviewAPI,
  updateReviewAPI,
  deleteReviewAPI,
  getMyReviewsAPI,
} from "../api/reviewApi";
import {
  AppText,
  ReviewCard,
  RatingInput,
  TextField,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  SectionHeader,
  BottomSheet,
  ScreenContainer,
  AppHeader,
  useToast,
  useConfirm,
} from "../ui";
import { useResource } from "./useResource";
import { Stack, ResourceState } from "./shared";
import { errorMessage } from "./api";
import { Upload, appendImage } from "./Upload";
export function ReviewSection({
  id,
  model,
  onChanged,
}: {
  id: string;
  model: "Book" | "Shop";
  onChanged?: () => any;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const resource = useResource<any[]>(
    `reviews:${id}`,
    async () => (await getReviewsAPI(id)).data,
  );
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const own = resource.data?.find((r) => r.user?._id === user?._id);
  const save = async () => {
    setSubmitted(true);
    if (!comment.trim() || comment.length > 1000 || !user) return;
    setBusy(true);
    try {
      if (editing)
        await updateReviewAPI(
          editing._id,
          { rating, comment: comment.trim() },
          user.token,
        );
      else {
        const form = new FormData();
        form.append("targetId", id);
        form.append("targetModel", model);
        form.append("rating", String(rating));
        form.append("comment", comment.trim());
        if (image) await appendImage(form, "image", image);
        await addReviewAPI(form, user.token);
      }
      setComment("");
      setImage(null);
      setEditing(null);
      setSubmitted(false);
      await resource.refresh();
      onChanged?.();
      toast.success("Your review has been saved.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (review: any) => {
    if (
      !user ||
      !(await confirm({
        title: "Delete your review?",
        message: "Your rating will also be removed from the average.",
        confirmLabel: "Delete review",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      await deleteReviewAPI(review._id, user.token);
      await resource.refresh();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const form = (
    <Stack gap={16}>
      <RatingInput value={rating} onChange={setRating} />
      <TextField
        label="Your review"
        required
        multiline
        maxLength={1000}
        value={comment}
        onChangeText={setComment}
        error={
          submitted && !comment.trim()
            ? "Write a review before submitting."
            : undefined
        }
        helperText={`${comment.length}/1000 characters`}
      />
      {!editing ? (
        <Upload label="Attach a photo" value={image} onChange={setImage} />
      ) : null}
      <PrimaryButton
        title={editing ? "Save review" : "Publish review"}
        onPress={save}
        loading={busy}
      />
    </Stack>
  );
  return (
    <Stack gap={20}>
      <SectionHeader title="Reader reviews" />
      <ResourceState resource={resource} />
      {resource.data?.map((r) => (
        <ReviewCard
          key={r._id}
          author={`${r.user?.firstName || "Former reader"} ${r.user?.lastName || ""}`}
          rating={r.rating}
          comment={r.comment}
          date={r.createdAt}
          imageUrl={r.imageUrl}
          onEdit={
            r.user?._id === user?._id
              ? () => {
                  setEditing(r);
                  setComment(r.comment);
                  setRating(r.rating);
                }
              : undefined
          }
          onDelete={
            r.user?._id === user?._id && !busy ? () => remove(r) : undefined
          }
        />
      ))}
      {resource.data?.length === 0 ? (
        <EmptyState
          compact
          title="No reviews yet"
          message="Share your experience with other readers."
        />
      ) : null}
      {!own ? (
        <>
          <AppText variant="sectionTitle">Share your thoughts</AppText>
          {form}
        </>
      ) : null}
      <BottomSheet
        visible={!!editing}
        onClose={() => {
          setEditing(null);
          setComment("");
        }}
        title="Edit your review"
      >
        {form}
      </BottomSheet>
    </Stack>
  );
}
export default function MyReviews() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const resource = useResource<any[]>("my-reviews", async () =>
    user ? (await getMyReviewsAPI(user.token)).data : [],
  );
  const [selected, setSelected] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const save = async () => {
    setSubmitted(true);
    if (!comment.trim() || !user || !selected) return;
    setBusy(true);
    try {
      await updateReviewAPI(
        selected._id,
        { comment: comment.trim(), rating },
        user.token,
      );
      setSelected(null);
      await resource.refresh();
      toast.success("Review updated.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (r: any) => {
    if (
      !user ||
      !(await confirm({
        title: "Delete your review?",
        message:
          "Your rating will be removed from the average. This cannot be undone.",
        confirmLabel: "Delete review",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      await deleteReviewAPI(r._id, user.token);
      await resource.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer>
      <Stack>
        <AppHeader
          title="My reviews"
          onBack={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/account")
          }
        />
        <ResourceState resource={resource} />
        {resource.data?.length === 0 ? (
          <EmptyState
            title="Your voice belongs here"
            message="Open a book or bookshop to write your first review."
            action={{
              label: "Explore books",
              onPress: () => router.navigate("/(tabs)/explore"),
            }}
          />
        ) : null}
        {resource.data?.map((r) => (
          <View key={r._id}>
            <ReviewCard
              author="You"
              rating={r.rating}
              comment={r.comment}
              date={r.createdAt}
              imageUrl={r.imageUrl}
              target={r.targetId?.title || r.targetId?.name || r.targetModel}
              onEdit={
                !busy
                  ? () => {
                      setSelected(r);
                      setComment(r.comment);
                      setRating(r.rating);
                      setSubmitted(false);
                    }
                  : undefined
              }
              onDelete={!busy ? () => remove(r) : undefined}
            />
          </View>
        ))}
        <BottomSheet
          visible={!!selected}
          onClose={() => setSelected(null)}
          title="Edit your review"
        >
          <Stack gap={16}>
            <RatingInput value={rating} onChange={setRating} />
            <TextField
              label="Your review"
              required
              multiline
              maxLength={1000}
              value={comment}
              onChangeText={setComment}
              error={
                submitted && !comment.trim()
                  ? "Write a review before saving."
                  : undefined
              }
            />
            <PrimaryButton title="Save review" loading={busy} onPress={save} />
            <SecondaryButton
              title="Cancel"
              disabled={busy}
              onPress={() => setSelected(null)}
            />
          </Stack>
        </BottomSheet>
      </Stack>
    </ScreenContainer>
  );
}
