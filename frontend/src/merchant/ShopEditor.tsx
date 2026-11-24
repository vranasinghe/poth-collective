import React, { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet, merchantUpload, errorMessage } from "./api";
import { deleteShopAPI } from "../api/shopApi";
import { Upload, appendImage } from "../reader/Upload";
import { EditorialImage } from "../reader/shared";
import {
  AppText,
  TextField,
  PrimaryButton,
  SecondaryButton,
  validatePhone,
  useConfirm,
  useToast,
} from "../ui";
import { MerchantScreen, Stack, ResourceState, useMerchant } from "./shared";
export default function ShopEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const { refreshShops, setShopId } = useMerchant();
  const toast = useToast();
  const confirm = useConfirm();
  const resource = useResource<any>(
    `merchant-shop-form:${id || "new"}`,
    async () => {
      if (!id) return null;
      const shops = await merchantGet("shops/owner/me", {}, user?.token);
      const own = shops.find((s: any) => s._id === id);
      if (!own) throw new Error("This shop is not available in your account.");
      return own;
    },
  );
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    contactNumber: "",
  });
  const [loaded, setLoaded] = useState<string>();
  const [image, setImage] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const s = resource.data;
    if (s && loaded !== s._id) {
      setForm({
        name: s.name,
        description: s.description,
        location: s.location,
        contactNumber: s.contactNumber,
      });
      setLoaded(s._id);
    }
  }, [resource.data, loaded]);
  const errors = {
    name:
      form.name.trim().length >= 2
        ? undefined
        : "Use a shop name of at least two characters.",
    description: form.description.trim()
      ? undefined
      : "Describe your bookshop.",
    location: form.location.trim()
      ? undefined
      : "Enter the shop’s city or location.",
    contactNumber: validatePhone(form.contactNumber),
  };
  const save = async () => {
    setSubmitted(true);
    if (
      !user ||
      lock.current ||
      Object.values(errors).some(Boolean) ||
      (id && !resource.data)
    )
      return;
    lock.current = true;
    setBusy(true);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key !== "location" || !id) body.append(key, value.trim());
      }
      if (image) await appendImage(body, "image", image);
      await merchantUpload(
        id ? `shops/${id}` : "shops",
        id ? "PUT" : "POST",
        body,
        user.token,
      );
      await refreshShops();
      toast.success(
        id
          ? "Shop profile updated."
          : "Your shop is registered. Add your first book next.",
      );
      if (router.canGoBack()) router.back();
      else router.replace("/owner");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !user ||
      busy ||
      !(await confirm({
        title: "Remove this shop from sale?",
        message:
          "Readers will no longer find this shop or order its books. Shops without order history and their associated content may be permanently deleted. Existing order history is retained. Finish or cancel open orders first. You can register a new shop later.",
        confirmLabel: "Remove shop",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await deleteShopAPI(id, user.token);
      setShopId("");
      await refreshShops();
      toast.success(result.data.message || "Shop removed.");
      router.replace("/owner");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const change = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <MerchantScreen
      title={id ? "Your shop profile" : "Register your bookshop"}
      subtitle="A clear introduction for the readers you’ll meet."
      form
      back
    >
      <ResourceState resource={resource} />
      {!id || resource.data ? (
        <Stack gap={20}>
          {submitted && Object.values(errors).some(Boolean) ? (
            <AppText color="danger" accessibilityRole="alert">
              Please correct the highlighted fields.
            </AppText>
          ) : null}
          <TextField
            label="Shop name"
            required
            maxLength={100}
            value={form.name}
            onChangeText={change("name")}
            validate={(v) => (v.trim().length >= 2 ? undefined : errors.name)}
            error={submitted ? errors.name : undefined}
            disabled={busy}
          />
          <TextField
            label="Description"
            required
            multiline
            maxLength={1000}
            value={form.description}
            onChangeText={change("description")}
            validate={(v) => (v.trim() ? undefined : "Describe your bookshop.")}
            error={submitted ? errors.description : undefined}
            disabled={busy}
          />
          <TextField
            label="Location or city"
            required
            maxLength={100}
            value={form.location}
            onChangeText={change("location")}
            disabled={!!id || busy}
            helperText={
              id
                ? "Location cannot be changed after registration under the existing shop policy."
                : undefined
            }
            validate={(v) =>
              v.trim() ? undefined : "Enter the shop’s location."
            }
            error={submitted ? errors.location : undefined}
          />
          <TextField
            label="Shop contact number"
            required
            keyboardType="phone-pad"
            value={form.contactNumber}
            onChangeText={change("contactNumber")}
            validate={validatePhone}
            error={submitted ? errors.contactNumber : undefined}
            disabled={busy}
          />
          {id && resource.data?.imageUrl && !image ? (
            <EditorialImage uri={resource.data.imageUrl} label={form.name} />
          ) : null}
          <Upload
            label="Choose shop image"
            value={image}
            onChange={setImage}
            disabled={busy}
          />
          <PrimaryButton
            title={id ? "Save shop profile" : "Register shop"}
            onPress={save}
            loading={busy}
          />
          <SecondaryButton
            title="Cancel"
            disabled={busy}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/owner")
            }
          />
          {id ? (
            <PrimaryButton
              title="Remove shop from sale"
              tone="danger"
              disabled={busy}
              onPress={remove}
            />
          ) : null}
        </Stack>
      ) : null}
    </MerchantScreen>
  );
}
