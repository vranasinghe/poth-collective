import React, { useState } from "react";
import axios from "axios";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { API_BASE_URL } from "../../src/api/apiConfig";
import { createOrderAPI } from "../../src/api/orderApi";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  TextField,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  StatusBadge,
  validatePhone,
  useToast,
  useConfirm,
  EmptyState,
} from "../../src/ui";
import { useResource } from "../../src/reader/useResource";
import { Stack, ResourceState } from "../../src/reader/shared";
import { Upload, appendImage } from "../../src/reader/Upload";
import { errorMessage } from "../../src/reader/api";
export default function Checkout() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const getQuote = async () =>
    (
      await axios.post(
        `${API_BASE_URL}/api/orders/quote`,
        { book: bookId, quantity },
        { timeout: 15000, headers: { Authorization: `Bearer ${user?.token}` } },
      )
    ).data;
  const quote = useResource<any>(`quote:${bookId}:${quantity}`, getQuote);
  const q = quote.data;
  const place = async () => {
    setSubmitted(true);
    if (
      !address.trim() ||
      !city.trim() ||
      validatePhone(phone) ||
      !image ||
      !q ||
      !user ||
      busy
    )
      return;
    if (
      !(await confirm({
        title: "Place this order?",
        message: `LKR ${q.totalPrice.toLocaleString()} for ${quantity} book(s). The shop must verify your payment slip before confirming.`,
        confirmLabel: "Place order",
      }))
    )
      return;
    setBusy(true);
    try {
      const fresh = await getQuote();
      if (fresh.totalPrice !== q.totalPrice) {
        await quote.refresh();
        toast.warning(
          "The price changed. Review the updated total before placing your order.",
        );
        return;
      }
      const form = new FormData();
      form.append("book", bookId);
      form.append("quotedUnitPrice", String(q.unitPrice));
      form.append("quantity", String(quantity));
      form.append(
        "deliveryDetails",
        JSON.stringify({
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
        }),
      );
      await appendImage(form, "paymentSlip", image);
      const result = await createOrderAPI(form);
      setCreated(result.data);
    } catch (e) {
      toast.error(errorMessage(e));
      await quote.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer width="reading" keyboardAvoiding>
      <Stack>
        <AppHeader
          title={created ? "Order received" : "Your checkout"}
          onBack={() => router.back()}
        />
        {created ? (
          <>
            <StatusBadge status="Pending" />
            <AppText variant="screenTitle">Thank you for your order.</AppText>
            <AppText>
              Order #{created._id.slice(-6).toUpperCase()} · LKR{" "}
              {created.totalPrice.toLocaleString()}
            </AppText>
            <AppText>
              Your payment slip has been submitted for review. This does not
              mean payment has been verified. The bookshop will update your
              order after checking it.
            </AppText>
            <PrimaryButton
              title="View my orders"
              onPress={() => router.replace("/(tabs)/orders")}
            />
          </>
        ) : !bookId ? (
          <EmptyState
            title="Choose a book first"
            message="Open a book from Explore to begin checkout."
            action={{
              label: "Explore books",
              onPress: () => router.replace("/(tabs)/explore"),
            }}
          />
        ) : (
          <>
            <ResourceState resource={quote} />
            {q ? (
              <>
                <AppText variant="sectionTitle">{q.book.title}</AppText>
                <AppText color="textSecondary">
                  {q.book.author} · {q.shop.name}, {q.shop.location}
                </AppText>
              </>
            ) : null}
            <AppText variant="label">Quantity</AppText>
            <View
              style={{ flexDirection: "row", gap: 20, alignItems: "center" }}
            >
              <IconButton
                icon="remove-outline"
                label="Decrease quantity"
                disabled={quantity <= 1 || busy}
                onPress={() => setQuantity((n) => n - 1)}
              />
              <AppText>{quantity}</AppText>
              <IconButton
                icon="add-outline"
                label="Increase quantity"
                disabled={
                  busy || quantity >= Math.min(q?.stockCount ?? 100, 100)
                }
                onPress={() => setQuantity((n) => n + 1)}
              />
            </View>
            {q ? (
              <Stack gap={8}>
                <AppText variant="sectionTitle">Order summary</AppText>
                <AppText>
                  LKR {q.unitPrice.toLocaleString()} × {quantity}
                </AppText>
                <AppText variant="sectionTitle">
                  Total: LKR {q.totalPrice.toLocaleString()}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  Live price from the bookshop. The server checks price and
                  stock again when you place the order. No delivery charge is
                  provided by this system; confirm delivery arrangements with
                  the shop.
                </AppText>
              </Stack>
            ) : null}
            <AppText variant="sectionTitle">Delivery details</AppText>
            <TextField
              label="Street address"
              required
              value={address}
              maxLength={200}
              onChangeText={setAddress}
              error={
                submitted && !address.trim()
                  ? "Enter your delivery address."
                  : undefined
              }
            />
            <TextField
              label="City"
              required
              value={city}
              maxLength={80}
              onChangeText={setCity}
              error={submitted && !city.trim() ? "Enter your city." : undefined}
            />
            <TextField
              label="Delivery phone"
              required
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              validate={validatePhone}
              error={submitted ? validatePhone(phone) : undefined}
            />
            <AppText variant="sectionTitle">Payment verification</AppText>
            <AppText>
              Contact {q?.shop.name || "the bookshop"}
              {q?.shop.contactNumber ? ` on ${q.shop.contactNumber}` : ""} for
              bank transfer instructions. Attach your payment slip after making
              the transfer. The shop checks the slip before confirming the
              order. Uploading a slip does not verify payment.
            </AppText>
            <Upload
              label="Upload payment slip"
              value={image}
              onChange={setImage}
            />
            {submitted && !image ? (
              <AppText color="danger" accessibilityRole="alert">
                Attach your payment slip.
              </AppText>
            ) : null}
            <PrimaryButton
              title="Place order for shop review"
              icon="bag-check-outline"
              loading={busy}
              disabled={!q || quote.loading || !!quote.error}
              onPress={place}
            />
            <SecondaryButton
              title="Continue browsing"
              disabled={busy}
              onPress={() => router.navigate("/(tabs)/explore")}
            />
          </>
        )}
      </Stack>
    </ScreenContainer>
  );
}
