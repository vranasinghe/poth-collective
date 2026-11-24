import React, { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { updateUserAPI, deleteUserAPI } from "../api/userApi";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  TextField,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  BottomSheet,
  validateEmail,
  validateNewPassword,
  initials,
  useConfirm,
  useToast,
} from "../ui";
import { Stack } from "../reader/shared";
import { errorMessage } from "../reader/api";
export default function Account() {
  const { user, updateUserContext, logoutContext } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [edit, setEdit] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const save = async () => {
    setSubmitted(true);
    if (
      !user ||
      !firstName.trim() ||
      validateEmail(email) ||
      (password && (validateNewPassword(password) || !currentPassword))
    )
      return;
    setBusy(true);
    try {
      const result = await updateUserAPI(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          ...(password ? { password, currentPassword } : {}),
        },
        user.token,
      );
      await updateUserContext(result.data);
      setEdit(false);
      setPassword("");
      setCurrentPassword("");
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
      !(await confirm({
        title: "Delete your Poth account?",
        message:
          "Your profile will be anonymised and your posts, reviews, comments and follows removed. Order history is retained for the parties involved. This cannot be undone.",
        confirmLabel: "Delete my account",
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
    <ScreenContainer width="reading" keyboardAvoiding>
      <Stack>
        <AppHeader title="Your reading life" />
        <AppText variant="display">
          {initials(`${user?.firstName || ""} ${user?.lastName || ""}`)}
        </AppText>
        <AppText variant="sectionTitle">
          {user?.firstName} {user?.lastName}
        </AppText>
        <AppText color="textSecondary">{user?.email}</AppText>
        <SecondaryButton
          title="My orders"
          icon="bag-outline"
          onPress={() => router.navigate("/(tabs)/orders")}
        />
        <SecondaryButton
          title="My reviews"
          icon="star-outline"
          onPress={() => router.push("/(tabs)/reviews")}
        />
        <SecondaryButton
          title="Followed bookshops"
          icon="storefront-outline"
          onPress={() =>
            router.navigate({
              pathname: "/(tabs)/explore",
              params: { kind: "shops", following: "true", resetKey: String(Date.now()) },
            })
          }
        />
        <SecondaryButton
          title="Bookshop updates"
          icon="notifications-outline"
          onPress={() => router.push("/(tabs)/alerts")}
        />
        <SecondaryButton
          title="My stories"
          icon="document-text-outline"
          onPress={() => router.push("/blog")}
        />
        <SecondaryButton
          title="Account settings"
          icon="settings-outline"
          onPress={() => {
            setFirstName(user?.firstName || "");
            setLastName(user?.lastName || "");
            setEmail(user?.email || "");
            setPassword("");
            setCurrentPassword("");
            setSubmitted(false);
            setEdit(true);
          }}
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
          Permanently remove your account. Order records are retained, as
          explained in the confirmation.
        </AppText>
        <PrimaryButton
          title="Delete account"
          tone="danger"
          onPress={remove}
          loading={busy}
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
              maxLength={60}
              value={firstName}
              onChangeText={setFirstName}
              error={
                submitted && !firstName.trim()
                  ? "Enter your first name."
                  : undefined
              }
            />
            <TextField
              label="Last name"
              maxLength={60}
              value={lastName}
              onChangeText={setLastName}
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
            />
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              helperText="Required only when changing your password."
              error={
                submitted && password && !currentPassword
                  ? "Enter your current password."
                  : undefined
              }
            />
            <PasswordField
              label="New password"
              mode="new"
              value={password}
              onChangeText={setPassword}
              helperText="Leave empty to keep your current password."
              error={
                submitted && password
                  ? validateNewPassword(password)
                  : undefined
              }
            />
            <PrimaryButton
              title="Save settings"
              onPress={save}
              loading={busy}
            />
            <SecondaryButton
              title="Cancel"
              onPress={() => setEdit(false)}
              disabled={busy}
            />
          </Stack>
        </BottomSheet>
      </Stack>
    </ScreenContainer>
  );
}
