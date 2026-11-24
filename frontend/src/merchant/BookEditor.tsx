import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet, merchantUpload, errorMessage } from "./api";
import { BookCover } from "../../components/BookCover";
import { Upload, appendImage } from "../reader/Upload";
import {
  AppText,
  TextField,
  PrimaryButton,
  SecondaryButton,
  useToast,
  useConfirm,
} from "../ui";
import {
  MerchantScreen,
  Stack,
  ResourceState,
  Select,
  NewShopState,
  useMerchant,
} from "./shared";
import { bookErrors, BookDraft } from "./validation";
const empty: BookDraft = {
  title: "",
  author: "",
  description: "",
  category: "",
  price: "",
  stockCount: "",
  shop: "",
};
export default function BookEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const { shops, shopId, shopsResource } = useMerchant();
  const toast = useToast();
  const confirm = useConfirm();
  const resource = useResource<any>(`merchant-edit:${id || "new"}`, () =>
    id
      ? merchantGet(`merchant/inventory/${id}`, {}, user?.token)
      : Promise.resolve(null),
  );
  const [draft, setDraft] = useState<BookDraft>(empty);
  const [original, setOriginal] = useState<any>(null);
  const [loaded, setLoaded] = useState<string>();
  const [image, setImage] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const busy = saving || reloading;
  const [progress, setProgress] = useState<number>();
  const lock = useRef(false);
  useEffect(() => {
    const b = resource.data;
    if (id && b && loaded !== b._id) {
      setDraft({
        title: b.title,
        author: b.author,
        description: b.description,
        category: b.category,
        price: String(b.price),
        stockCount: String(b.stockCount),
        shop: b.shop?._id || b.shop,
      });
      setOriginal(b);
      setLoaded(b._id);
    }
  }, [resource.data, id, loaded]);
  useEffect(() => {
    if (!id && !draft.shop) {
      const chosen =
        shops.find((s: any) => s._id === shopId) ||
        (shops.length === 1 ? shops[0] : null);
      if (chosen) setDraft((d) => ({ ...d, shop: chosen._id }));
    }
  }, [shops, shopId, id, draft.shop]);
  const errors = bookErrors(draft);
  if (!id && draft.shop && !shops.some((s: any) => s._id === draft.shop))
    errors.shop = "This shop is no longer available. Choose another shop.";
  const change = (field: keyof BookDraft) => (value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));
  const validate = (field: keyof BookDraft) => (value: string) =>
    bookErrors({ ...draft, [field]: value })[field];
  const dirty =
    !!image ||
    Object.entries(draft).some(
      ([key, value]) =>
        key !== "shop" &&
        value !== (original ? String(original[key] ?? "") : ""),
    );
  const back = async () => {
    if (busy) return;
    if (
      !dirty ||
      (await confirm({
        title: "Discard book changes?",
        message: "Unsaved changes will be lost.",
        confirmLabel: "Discard changes",
        tone: "danger",
      }))
    ) {
      if (router.canGoBack()) router.back();
      else router.replace("/owner/(tabs)/inventory");
    }
  };
  const save = async () => {
    setSubmitted(true);
    if (
      !user ||
      lock.current ||
      reloading ||
      Object.keys(errors).length ||
      (id && !original)
    )
      return;
    lock.current = true;
    setSaving(true);
    setProgress(undefined);
    try {
      const form = new FormData();
      for (const [key, value] of Object.entries(draft)) {
        if (key !== "shop" || !id) form.append(key, value.trim());
      }
      if (id) form.append("expectedStockCount", String(original.stockCount));
      if (image) await appendImage(form, "image", image);
      await merchantUpload(
        id ? `books/${id}` : "books",
        id ? "PUT" : "POST",
        form,
        user.token,
        setProgress,
      );
      toast.success(
        id
          ? "Book updated. Your current inventory is ready."
          : "Book added to your shop.",
      );
      {
        if (router.canGoBack()) router.back();
        else router.replace("/owner/(tabs)/inventory");
      }
    } catch (e: any) {
      toast.error(errorMessage(e));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const reload = async () => {
    if (
      dirty &&
      !(await confirm({
        title: "Reload current book?",
        message:
          "This replaces your unsaved changes with the latest stock and details.",
        confirmLabel: "Reload book",
      }))
    )
      return;
    if (!id || !user || busy) return;
    setReloading(true);
    try {
      const b = await merchantGet(`merchant/inventory/${id}`, {}, user.token);
      setDraft({
        title: b.title,
        author: b.author,
        description: b.description,
        category: b.category,
        price: String(b.price),
        stockCount: String(b.stockCount),
        shop: b.shop?._id || b.shop,
      });
      setOriginal(b);
      setLoaded(b._id);
      setSubmitted(false);
      await resource.refresh();
      toast.info("Latest book details loaded.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setReloading(false);
    }
  };
  return (
    <MerchantScreen
      title={id ? "Edit book" : "Add to your shelves"}
      subtitle="The details readers need to choose their next book."
      form
      back
      onBack={back}
    >
      {id ? (
        <ResourceState resource={resource} />
      ) : (
        <ResourceState resource={shopsResource} />
      )}
      {!shopsResource.loading && !shopsResource.error && shops.length === 0 ? (
        <NewShopState />
      ) : (!id || original) && !resource.error ? (
        <Stack gap={20}>
          {submitted && Object.keys(errors).length ? (
            <AppText color="danger" accessibilityRole="alert">
              Please correct the highlighted fields before saving.
            </AppText>
          ) : null}
          {id ? (
            <>
              <AppText variant="label">
                Owning shop: {original.shop?.name}
              </AppText>
              <AppText variant="caption" color="textMuted">
                Books stay with their original shop. Reload if an order changes
                stock while you edit.
              </AppText>
            </>
          ) : (
            <Select
              label="Owning shop"
              value={draft.shop}
              onChange={change("shop")}
              disabled={busy}
              options={[
                { value: "", label: "Choose a shop" },
                ...shops.map((s: any) => ({ value: s._id, label: s.name })),
              ]}
            />
          )}
          {submitted && errors.shop ? (
            <AppText color="danger" accessibilityRole="alert">
              {errors.shop}
            </AppText>
          ) : null}
          <TextField
            label="Title"
            required
            value={draft.title}
            onChangeText={change("title")}
            maxLength={200}
            validate={validate("title")}
            error={submitted ? errors.title : undefined}
            disabled={busy}
          />
          <TextField
            label="Author"
            required
            value={draft.author}
            onChangeText={change("author")}
            maxLength={120}
            validate={validate("author")}
            error={submitted ? errors.author : undefined}
            disabled={busy}
          />
          <TextField
            label="Description"
            required
            multiline
            numberOfLines={5}
            value={draft.description}
            onChangeText={change("description")}
            maxLength={2000}
            validate={validate("description")}
            error={submitted ? errors.description : undefined}
            helperText={`${draft.description.length}/2000 characters`}
            disabled={busy}
          />
          <TextField
            label="Category"
            required
            value={draft.category}
            onChangeText={change("category")}
            maxLength={60}
            validate={validate("category")}
            error={submitted ? errors.category : undefined}
            disabled={busy}
          />
          <TextField
            label="Price (LKR)"
            required
            keyboardType="decimal-pad"
            value={draft.price}
            onChangeText={change("price")}
            validate={validate("price")}
            error={submitted ? errors.price : undefined}
            disabled={busy}
          />
          <TextField
            label="Stock count"
            required
            keyboardType="number-pad"
            value={draft.stockCount}
            onChangeText={change("stockCount")}
            validate={validate("stockCount")}
            error={submitted ? errors.stockCount : undefined}
            helperText="Whole copies available for new orders; reserved copies are already deducted."
            disabled={busy}
          />
          <AppText variant="sectionTitle">Book cover</AppText>
          {original && !image ? (
            <BookCover
              title={draft.title}
              author={draft.author}
              imageUrl={original.imageUrl}
              style={{ width: 160, height: 240, alignSelf: "center" }}
            />
          ) : null}
          <Upload
            label={
              original?.imageUrl
                ? "Replace cover image"
                : "Choose a cover image"
            }
            previewMode="cover"
            value={image}
            onChange={setImage}
            disabled={busy}
          />
          <AppText variant="caption" color="textMuted">
            Optional. Listings without a cover use Poth’s image fallback.
          </AppText>
          {saving && progress !== undefined ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Book upload"
              accessibilityValue={{ min: 0, max: 100, now: progress }}
            >
              <AppText>
                {progress < 100
                  ? `Uploading: ${progress}%`
                  : "Upload sent. Waiting for the server to save…"}
              </AppText>
            </View>
          ) : null}
          <PrimaryButton
            title={id ? "Save book" : "Add book"}
            onPress={() => {
              void save();
            }}
            loading={saving}
            disabled={!!resource.error || (id ? !original : !shops.length)}
          />
          <SecondaryButton
            title="Cancel changes"
            onPress={back}
            disabled={busy}
          />
          {id ? (
            <SecondaryButton
              title="Reload latest book"
              onPress={() => {
                void reload();
              }}
              loading={reloading}
              disabled={busy}
            />
          ) : null}
        </Stack>
      ) : null}
    </MerchantScreen>
  );
}
