import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../reader/useResource";
import { merchantGet, merchantUpload, errorMessage } from "./api";
import { Upload, appendImage } from "../reader/Upload";
import { EditorialImage } from "../reader/shared";
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  TextField,
  SectionHeader,
  EmptyState,
  ResponsiveGrid,
  BottomSheet,
  formatDate,
  useTheme,
  useToast,
} from "../ui";
import {
  MerchantScreen,
  ShopScope,
  useMerchant,
  Stack,
  ResourceState,
  Metric,
  Select,
  NewShopState,
  openInventory,
  openOrders,
} from "./shared";
export function Distribution({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: { label: string; value: number }[];
  unit: string;
}) {
  const t = useTheme();
  const total = rows.reduce((n, r) => n + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Stack gap={16}>
      <SectionHeader
        title={title}
        subtitle={`${total} ${unit} across this scope`}
      />
      {total === 0 ? (
        <AppText color="textSecondary">No records to plot yet.</AppText>
      ) : (
        rows.map((r) => (
          <View
            key={r.label}
            accessible
            accessibilityLabel={`${r.label}: ${r.value} ${unit}`}
            style={{ gap: 8 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <AppText variant="bodySmall" style={{ flex: 1 }}>
                {r.label}
              </AppText>
              <AppText variant="bodySmall" weight="semibold">
                {r.value}
              </AppText>
            </View>
            <View
              accessibilityElementsHidden
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: t.colors.surfaceMuted,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 8,
                  width: `${(r.value / max) * 100}%`,
                  backgroundColor: t.colors.primary,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        ))
      )}
    </Stack>
  );
}
export default function Reports() {
  const { user } = useAuth();
  const { shopId, shops, shopsResource } = useMerchant();
  const toast = useToast();
  const t = useTheme();
  const summary = useResource<any>(`merchant-report:${shopId}`, () =>
    merchantGet("merchant/summary", { shop: shopId }, user?.token),
  );
  const reports = useResource<any[]>("merchant-published-reports", () =>
    merchantGet("reports", {}, user?.token),
  );
  const [publishShop, setPublishShop] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const lock = useRef(false);
  useEffect(() => {
    setPublishShop(shopId || (shops.length === 1 ? shops[0]._id : ""));
  }, [shopId, shops]);
  const preview = useResource<any>(
    `merchant-report-preview:${publishShop}`,
    () =>
      publishShop
        ? merchantGet(`reports/preview/${publishShop}`, {}, user?.token)
        : Promise.resolve(null),
  );
  const publish = async () => {
    setSubmitted(true);
    if (!user || !publishShop || !title.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("notes", notes.trim());
      if (image) await appendImage(form, "image", image);
      await merchantUpload(`reports/${publishShop}`, "POST", form, user.token);
      setTitle("");
      setNotes("");
      setImage(null);
      setSubmitted(false);
      await reports.refresh();
      await preview.refresh();
      toast.success("Stock update published to your followers.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const d = summary.data;
  const shown = (reports.data || []).filter(
    (r) => !shopId || r.shopId === shopId,
  );
  return (
    <MerchantScreen
      title="A clear view of your shop"
      subtitle="Stock and order reports from your own records."
      onRefresh={() => {
        summary.refresh();
        reports.refresh();
        preview.refresh();
      }}
      refreshing={summary.loading && !!d}
    >
      <ShopScope />
      <ResourceState resource={summary} />
      {!shopsResource.loading && !shopsResource.error && !shops.length ? (
        <NewShopState />
      ) : d ? (
        <Stack gap={32}>
          <ResponsiveGrid
            columns={{ compact: 2, phone: 2, tablet: 4, desktop: 4, wide: 4 }}
          >
            <Metric label="Active titles" value={d.inventory.activeBooks} />
            <Metric label="Copies available" value={d.inventory.units} />
            <Metric
              label="Low-stock titles"
              value={d.inventory.lowStock}
              note="1–5 copies"
            />
            <Metric label="Out of stock" value={d.inventory.outOfStock} />
          </ResponsiveGrid>
          <ResponsiveGrid
            columns={{ compact: 1, phone: 1, tablet: 2, desktop: 2, wide: 2 }}
          >
            <Distribution
              title="Inventory by category"
              unit="active titles"
              rows={d.categories.map((c: any) => ({
                label: c.category,
                value: c.books,
              }))}
            />
            <Distribution
              title="Orders by status"
              unit="retained orders"
              rows={Object.entries(d.statusCounts).map(([label, value]) => ({
                label,
                value: Number(value),
              }))}
            />
          </ResponsiveGrid>
          <AppText variant="caption" color="textMuted">
            Category bars count active listings, not sales. Order counts include
            retained finished records, including orders hidden from the working
            list. Updated {formatDate(d.generatedAt)}.
          </AppText>
          <SectionHeader
            title="Stock attention"
            subtitle="Up to six active listings with five copies or fewer, out of stock first."
          />
          {d.attention.length ? (
            d.attention.map((b: any) => (
              <View key={b._id} style={{ gap: 8 }}>
                <AppText variant="cardTitle">{b.title}</AppText>
                <AppText
                  variant="bodySmall"
                  color={b.stockCount === 0 ? "danger" : "warning"}
                >
                  {b.stockCount} copies · {b.shop?.name}
                </AppText>
              </View>
            ))
          ) : (
            <AppText color="textSecondary">
              No books currently need stock attention.
            </AppText>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <SecondaryButton
              title="Review low-stock books"
              onPress={() => openInventory("low")}
            />
            <SecondaryButton
              title="Review order records"
              onPress={() => openOrders()}
            />
          </View>
          <View
            style={{
              padding: 20,
              gap: 12,
              backgroundColor: t.colors.surfaceMuted,
              borderRadius: t.radii.md,
            }}
          >
            <AppText variant="sectionTitle">Sales and payment records</AppText>
            <AppText variant="bodySmall">
              Poth stores order totals, but does not track settled receipts,
              bank reconciliation or refund adjustments. These reports therefore
              show inventory and order counts without estimating revenue.
            </AppText>
          </View>
          <SectionHeader
            title="Publish a stock update"
            subtitle="Share a dated inventory snapshot with your followers."
          />
          <Select
            label="Shop for publication"
            value={publishShop}
            onChange={setPublishShop}
            disabled={busy}
            options={[
              { value: "", label: "Choose a shop" },
              ...shops.map((s: any) => ({ value: s._id, label: s.name })),
            ]}
          />
          {submitted && !publishShop ? (
            <AppText color="danger" accessibilityRole="alert">
              Choose the shop whose stock you want to publish.
            </AppText>
          ) : null}
          <ResourceState resource={preview} />
          {preview.data ? (
            <AppText variant="bodySmall">
              Preview: {preview.data.breakdown.length} book listings at{" "}
              {preview.data.shopName}. The server takes a fresh snapshot when
              you publish.
            </AppText>
          ) : null}
          <TextField
            label="Update title"
            required
            maxLength={150}
            value={title}
            onChangeText={setTitle}
            validate={(v) =>
              v.trim() ? undefined : "Give this update a title."
            }
            error={
              submitted && !title.trim()
                ? "Give this update a title."
                : undefined
            }
            disabled={busy}
          />
          <TextField
            label="Notes"
            multiline
            maxLength={2000}
            value={notes}
            onChangeText={setNotes}
            disabled={busy}
          />
          <Upload
            label="Attach an image"
            value={image}
            onChange={setImage}
            disabled={busy}
          />
          <PrimaryButton
            title="Publish stock update"
            onPress={publish}
            loading={busy}
            disabled={!preview.data || !!preview.error || preview.loading}
          />
          <SectionHeader title="Published stock updates" />
          <ResourceState resource={reports} />
          {shown.length === 0 && !reports.loading && !reports.error ? (
            <EmptyState
              compact
              title="Your first update is ahead"
              message="Publish a snapshot when you want followers to hear from your shop."
            />
          ) : null}
          {shown.slice(0, 12).map((r) => (
            <View
              key={r._id}
              style={{
                paddingVertical: 16,
                gap: 12,
                borderBottomWidth: 1,
                borderColor: t.colors.border,
              }}
            >
              <AppText variant="sectionTitle">{r.title}</AppText>
              <AppText variant="caption" color="textMuted">
                {r.shopName} · {formatDate(r.createdAt)}
              </AppText>
              <SecondaryButton
                title="View published snapshot"
                onPress={() => setSelected(r)}
              />
            </View>
          ))}
          {shown.length > 12 ? (
            <AppText variant="caption">
              Showing the latest 12 published updates.
            </AppText>
          ) : null}
          <BottomSheet
            visible={!!selected}
            onClose={() => setSelected(null)}
            title="Published stock snapshot"
          >
            {selected ? (
              <Stack gap={16}>
                <AppText variant="sectionTitle">{selected.title}</AppText>
                <AppText>{selected.notes}</AppText>
                <AppText variant="caption">
                  Snapshot published {formatDate(selected.createdAt)}; these are
                  historical counts.
                </AppText>
                {selected.imageUrl ? (
                  <EditorialImage
                    uri={selected.imageUrl}
                    label={selected.title}
                  />
                ) : null}
                {selected.breakdown.map((b: any, i: number) => (
                  <AppText key={i} variant="bodySmall">
                    {b.bookName}: {b.stockAmount} copies at publication
                  </AppText>
                ))}
              </Stack>
            ) : null}
          </BottomSheet>
        </Stack>
      ) : null}
    </MerchantScreen>
  );
}
