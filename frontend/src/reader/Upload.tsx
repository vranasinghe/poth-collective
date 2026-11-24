import React, { useState } from "react";
import { Platform, View, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AppText, SecondaryButton, useToast } from "../ui";
import { EditorialImage } from "./shared";
export async function appendImage(
  form: FormData,
  field: string,
  asset: ImagePicker.ImagePickerAsset,
) {
  const mime =
    asset.mimeType ||
    (/\.png(?:$|\?)/i.test(asset.uri) ? "image/png" : "image/jpeg");
  const name = mime === "image/png" ? "upload.png" : "upload.jpg";
  if (Platform.OS === "web") {
    const blob = await (await fetch(asset.uri)).blob();
    form.append(field, blob, name);
  } else form.append(field, { uri: asset.uri, name, type: mime } as any);
}
export function Upload({
  label,
  value,
  onChange,
  previewMode = "editorial",
  disabled = false,
}: {
  label: string;
  previewMode?: "editorial" | "cover";
  disabled?: boolean;
  value: ImagePicker.ImagePickerAsset | null;
  onChange: (a: ImagePicker.ImagePickerAsset | null) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (!result.canceled) {
        const a = result.assets[0];
        if (a.mimeType && !["image/jpeg", "image/png"].includes(a.mimeType))
          return toast.error("Choose a JPG or PNG image.");
        if (a.fileSize && a.fileSize > 5 * 1024 * 1024)
          return toast.error("Choose an image smaller than 5 MB.");
        onChange(a);
      }
    } catch {
      toast.error(
        "Could not open your photo library. Check permissions and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const camera = async () => {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.error(
          "Allow camera access to take a photo, or choose one from your library.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!result.canceled) {
        const a = result.assets[0];
        if (a.fileSize && a.fileSize > 5 * 1024 * 1024)
          toast.error("Choose an image smaller than 5 MB.");
        else onChange(a);
      }
    } catch {
      toast.error(
        "The camera is unavailable. Choose an image from your photo library.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 12 }}>
      <SecondaryButton
        title={value ? `Change ${label.toLowerCase()}` : label}
        icon="image-outline"
        onPress={pick}
        loading={busy}
        disabled={disabled}
      />
      {Platform.OS !== "web" ? (
        <SecondaryButton
          title="Take a photo"
          icon="camera-outline"
          onPress={camera}
          loading={busy}
          disabled={disabled}
        />
      ) : null}
      <AppText variant="caption" color="textMuted">
        JPG or PNG, up to 5 MB.
      </AppText>
      {value ? (
        <>
          {previewMode === "cover" ? (
            <Image
              source={{ uri: value.uri }}
              accessibilityLabel="Selected book cover preview"
              resizeMode="contain"
              style={{ width: "100%", height: 240 }}
            />
          ) : (
            <EditorialImage
              uri={value.uri}
              label="Selected image preview"
              height={160}
            />
          )}
          <SecondaryButton
            title="Remove image"
            disabled={disabled || busy}
            onPress={() => onChange(null)}
          />
        </>
      ) : null}
    </View>
  );
}
