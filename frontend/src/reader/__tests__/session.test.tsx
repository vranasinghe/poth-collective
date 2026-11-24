import React from "react";
import { screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { renderUI } from "../../ui/__tests__/testUtils";
import { AppText } from "../../ui";
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    interceptors: { response: { use: jest.fn(), eject: jest.fn() } },
  },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
let mockRoot = "(tabs)";
const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useSegments: () => [mockRoot],
}));
const saved = {
  _id: "reader-a",
  firstName: "Saved",
  token: "valid-token",
  userType: "Customer",
  email: "a@example.test",
};
function Probe() {
  const { user, isLoading } = useAuth();
  return (
    <AppText>
      {isLoading
        ? "Restoring"
        : user
          ? `Signed in: ${user.firstName}`
          : "Signed out"}
    </AppText>
  );
}
beforeEach(async () => {
  jest.clearAllMocks();
  mockRoot = "(tabs)";
  await AsyncStorage.clear();
});
test("restores a valid session with refreshed server profile", async () => {
  await AsyncStorage.setItem("@poth_user", JSON.stringify(saved));
  (axios.get as jest.Mock).mockResolvedValue({
    data: { ...saved, firstName: "Current" },
  });
  await renderUI(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  expect(await screen.findByText("Signed in: Current")).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(JSON.parse((await AsyncStorage.getItem("@poth_user"))!).token).toBe(
    "valid-token",
  );
});
test("expired or deleted-user sessions are cleared and redirected", async () => {
  await AsyncStorage.setItem("@poth_user", JSON.stringify(saved));
  (axios.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });
  await renderUI(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  expect(await screen.findByText("Signed out")).toBeTruthy();
  expect(await AsyncStorage.getItem("@poth_user")).toBeNull();
  expect(mockReplace).toHaveBeenCalledWith("/auth");
});
test("a temporary connection failure does not discard a saved session", async () => {
  await AsyncStorage.setItem("@poth_user", JSON.stringify(saved));
  (axios.get as jest.Mock).mockRejectedValue(new Error("Offline"));
  await renderUI(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  expect(await screen.findByText("Signed in: Saved")).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
test("a saved record without a token cannot restore an authenticated session", async () => {
  await AsyncStorage.setItem(
    "@poth_user",
    JSON.stringify({ ...saved, token: undefined }),
  );
  await renderUI(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  expect(await screen.findByText("Signed out")).toBeTruthy();
  expect(axios.get).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem("@poth_user")).toBeNull();
});

test("a restored owner session leaves auth for the merchant workspace", async () => {
  mockRoot = "auth";
  const owner = { ...saved, userType: "Shop Owner" };
  await AsyncStorage.setItem("@poth_user", JSON.stringify(owner));
  (axios.get as jest.Mock).mockResolvedValue({ data: owner });
  await renderUI(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  expect(await screen.findByText("Signed in: Saved")).toBeTruthy();
  expect(mockReplace).toHaveBeenCalledWith("/owner");
});
