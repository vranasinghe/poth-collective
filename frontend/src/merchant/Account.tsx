import React, { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { updateUserAPI, deleteUserAPI } from "../api/userApi";
import {
  AppText,
  PrimaryButton,
  SecondaryButton,
  TextField,
  PasswordField,
  BottomSheet,
  validateEmail,
  validateNewPassword,
  useConfirm,
  useToast,
} from "../ui";
import { errorMessage } from "./api";
import {
  MerchantScreen,
  useMerchant,
  Stack,
  ResourceState,
  NewShopState,
} from "./shared";
export default function Account() {
  const { user, updateUserContext, logoutContext } = useAuth();
  const { shops, shopsResource, refreshShops } = useMerchant();
  const confirm = useConfirm();
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [first, setFirst] = useState(user?.firstName || "");
  const [last, setLast] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setSubmitted(true);
    if (
      !user ||
      !first.trim() ||
      validateEmail(email) ||
      (password && (validateNewPassword(password) || !current))
    )
      return;
    setBusy(true);
    try {
      const result = await updateUserAPI(
        {
          firstName: first.trim(),
          lastName: last.trim(),
          email: email.trim(),
          ...(password ? { password, currentPassword: current } : {}),
        },
        user.token,
      );
      await updateUserContext(result.data);
      setEdit(false);
      setPassword("");
      setCurrent("");
      toast.success("Account settings saved.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !user ||
      busy ||
      !(await confirm({
        title: "Delete your owner account?",
        message:
          "Your personal profile is anonymised and community content removed. Your shops and catalogue are removed from sale. Order history is retained; open shipments or shop orders can prevent deletion. This cannot be undone.",
        confirmLabel: "Delete account",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      await deleteUserAPI(user.token);
      await logoutContext();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <MerchantScreen
      title="Your account"
      subtitle="Your profile, bookshops and account controls."
      onRefresh={refreshShops}
    >
      <AppText variant="sectionTitle">
        {user?.firstName} {user?.lastName}
      </AppText>
      <AppText color="textSecondary">{user?.email}</AppText>
      <SecondaryButton
        title="Edit account settings"
        icon="settings-outline"
        onPress={() => {
          setFirst(user?.firstName || "");
          setLast(user?.lastName || "");
          setEmail(user?.email || "");
          setCurrent("");
          setPassword("");
          setSubmitted(false);
          setEdit(true);
        }}
      />
      <AppText variant="sectionTitle">Your bookshops</AppText>
      <ResourceState resource={shopsResource} />
      {!shops.length && !shopsResource.loading && !shopsResource.error ? (
        <NewShopState />
      ) : (
        shops.map((s: any) => (
          <Stack key={s._id} gap={8}>
            <AppText variant="cardTitle">{s.name}</AppText>
            <AppText variant="bodySmall" color="textSecondary">
              {s.location}
            </AppText>
            <SecondaryButton
              title="Manage shop profile"
              onPress={() =>
                router.push({
                  pathname: "/owner/register-shop",
                  params: { id: s._id },
                })
              }
            />
          </Stack>
        ))
      )}
      <SecondaryButton
        title="Register another shop"
        icon="add-outline"
        onPress={() => router.push("/owner/register-shop")}
      />
      <SecondaryButton
        title="My reviews"
        icon="star-outline"
        onPress={() => router.push("/owner/(tabs)/reviews")}
      />
      <SecondaryButton
        title="Log out"
        icon="log-out-outline"
        disabled={busy}
        onPress={async () => {
          if (
            await confirm({
              title: "Log out of Poth?",
              confirmLabel: "Log out",
            })
          )
            await logoutContext();
        }}
      />
      <AppText variant="sectionTitle">Account deletion</AppText>
      <AppText variant="bodySmall" color="textSecondary">
        Finish or cancel your shop’s open orders before deleting your account.
        Your order history will be retained.
      </AppText>
      <PrimaryButton
        title="Delete owner account"
        tone="danger"
        disabled={busy}
        onPress={remove}
      />
      <BottomSheet
        visible={edit}
        onClose={() => setEdit(false)}
        title="Account settings"
      >
        <Stack gap={16}>
          <TextField
            label="First name"
            required
            maxLength={50}
            value={first}
            onChangeText={setFirst}
            error={
              submitted && !first.trim() ? "Enter your first name." : undefined
            }
            disabled={busy}
          />
          <TextField
            label="Last name"
            maxLength={50}
            value={last}
            onChangeText={setLast}
            disabled={busy}
          />
          <TextField
            label="Email address"
            required
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            validate={validateEmail}
            error={submitted ? validateEmail(email) : undefined}
            disabled={busy}
          />
          <PasswordField
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            helperText="Required only to set a new password."
            error={
              submitted && password && !current
                ? "Enter your current password."
                : undefined
            }
            disabled={busy}
          />
          <PasswordField
            label="New password"
            mode="new"
            value={password}
            onChangeText={setPassword}
            helperText="Leave empty to keep the current password."
            error={
              submitted && password ? validateNewPassword(password) : undefined
            }
            disabled={busy}
          />
          <PrimaryButton title="Save settings" onPress={save} loading={busy} />
          <SecondaryButton
            title="Cancel"
            onPress={() => setEdit(false)}
            disabled={busy}
          />
        </Stack>
      </BottomSheet>
    </MerchantScreen>
  );
}
