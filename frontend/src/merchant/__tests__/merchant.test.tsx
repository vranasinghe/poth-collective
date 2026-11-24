import React from "react";
import { Platform } from "react-native";
import { fireEvent, screen, waitFor, act } from "@testing-library/react-native";
import { renderUI, auditAccessibility } from "../../ui/__tests__/testUtils";
import { AuthContext } from "../../context/AuthContext";
import { MerchantProvider } from "../shared";
import { merchantGet, merchantUpload } from "../api";
import { deleteBookAPI } from "../../api/bookApi";
import { updateOrderStatusAPI } from "../../api/orderApi";
import Overview from "../Overview";
import Inventory from "../Inventory";
import BookEditor from "../BookEditor";
import Orders, { OrderDetail } from "../Orders";
import Reports from "../Reports";
import OwnerLayout from "../../../app/owner/_layout";
import { bookErrors } from "../validation";

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
let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    push: mockPush,
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => {
    const React = jest.requireActual("react");
    React.useEffect(cb, [cb]);
  },
  Redirect: ({ href }: { href: string }) => {
    const React = jest.requireActual("react");
    const { Text } = jest.requireActual("react-native");
    return React.createElement(Text, null, `redirect:${href}`);
  },
  Stack: () => null,
}));
jest.mock("../api", () => ({
  merchantGet: jest.fn(),
  merchantUpload: jest.fn(),
  errorMessage: (e: any) => e.message || "Request failed",
}));
jest.mock("../../api/bookApi", () => ({ deleteBookAPI: jest.fn() }));
jest.mock("../../api/orderApi", () => ({
  updateOrderStatusAPI: jest.fn(),
  deleteOrderAPI: jest.fn(),
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("@react-native-picker/picker", () => {
  const React = jest.requireActual("react");
  const { View, Text } = jest.requireActual("react-native");
  function Picker({ children, ...props }: any) {
    return React.createElement(View, props, children);
  }
  Picker.Item = function PickerItem({ label }: any) {
    return React.createElement(Text, null, label);
  };
  return { Picker };
});
const shop = { _id: "shop-1", name: "The real bookshop", location: "Colombo" };
const book = {
  _id: "book-1",
  title: "Owned book",
  author: "Writer",
  description: "A useful book",
  category: "Fiction",
  price: 1000,
  stockCount: 3,
  shop,
  imageUrl: "",
};
let mockBook: any = book;
const user = {
  _id: "owner-a",
  firstName: "Owner",
  lastName: "A",
  email: "owner@example.test",
  userType: "Shop Owner",
  token: "owner-token",
};
let mockShops: any[] = [shop];
let mockStatus = "Pending";
const transitions: Record<string, string[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};
const order = () => ({
  _id: "order-1",
  status: mockStatus,
  book,
  reader: { firstName: "Reader", lastName: "B", email: "reader@example.test" },
  shop,
  quantity: 1,
  totalPrice: 1000,
  createdAt: "2026-11-24T00:00:00Z",
  deliveryDetails: {
    address: "12 Test Road",
    city: "Colombo",
    phone: "0771234567",
  },
  paymentSlipUrl: "https://uploads.test.invalid/slip.png",
  allowedStatuses: transitions[mockStatus],
});
const load = async (path: string) => {
  if (path === "shops/owner/me") return mockShops;
  if (path === "merchant/summary")
    return {
      shops: mockShops,
      inventory: { activeBooks: 1, units: 3, lowStock: 1, outOfStock: 0 },
      statusCounts: {
        Pending: 1,
        Confirmed: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0,
      },
      categories: [{ category: "Fiction", books: 1, units: 3 }],
      attention: [book],
      recentOrders: [],
      lowStockThreshold: 5,
      generatedAt: "2026-11-24T00:00:00Z",
    };
  if (path === "merchant/inventory")
    return {
      items: [book],
      total: 1,
      page: 1,
      pages: 1,
      categories: ["Fiction"],
    };
  if (path.startsWith("merchant/inventory/")) return mockBook;
  if (path === "merchant/orders")
    return { items: [], total: 0, page: 1, pages: 0 };
  if (path.startsWith("merchant/orders/")) return order();
  if (path === "reports") return [];
  if (path.startsWith("reports/preview"))
    return {
      shopName: shop.name,
      breakdown: [{ bookName: book.title, stockAmount: 3 }],
    };
  return null;
};
const auth = (child: any, role = "Shop Owner") => (
  <AuthContext.Provider
    value={{
      user: { ...user, userType: role },
      isLoading: false,
      loginContext: jest.fn(),
      logoutContext: jest.fn(),
      updateUserContext: jest.fn(),
    }}
  >
    {child}
  </AuthContext.Provider>
);
const mounted = (child: any) =>
  renderUI(auth(<MerchantProvider>{child}</MerchantProvider>));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockBook = book;
  mockShops = [shop];
  mockStatus = "Pending";
  (merchantGet as jest.Mock).mockImplementation(load);
  (merchantUpload as jest.Mock).mockResolvedValue(book);
});

describe.each(["ios", "android"] as const)("%s merchant components", (os) => {
  beforeEach(() =>
    Object.defineProperty(Platform, "OS", { configurable: true, value: os }),
  );
  test("overview uses authorized metrics and removes fabricated sample activity", async () => {
    await mounted(<Overview />);
    expect(await screen.findByText("Active books")).toBeTruthy();
    expect(screen.getAllByText("Low stock").length).toBeGreaterThan(0);
    expect(screen.queryByText("15")).toBeNull();
    expect(screen.queryByText("The Midnight Library")).toBeNull();
    expect(merchantGet).toHaveBeenCalledWith(
      "merchant/summary",
      { shop: "" },
      user.token,
    );
    expect(auditAccessibility()).toEqual([]);
  }, 20000);
  test("empty owner accounts get a usable registration action", async () => {
    mockShops = [];
    await mounted(<Inventory />);
    expect(await screen.findByText("Your bookshop starts here")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Register a shop" }),
    ).toBeTruthy();
  });
  test("inventory removal is gated by confirmation and cancel performs no write", async () => {
    await mounted(<Inventory />);
    await screen.findByText("Owned book");
    await fireEvent.press(
      screen.getByRole("button", { name: "Remove Owned book" }),
    );
    expect(await screen.findByText("Remove Owned book?")).toBeTruthy();
    expect(deleteBookAPI).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteBookAPI).not.toHaveBeenCalled();
  });
  test("book form shows inline validation and never submits an invalid draft", async () => {
    await mounted(<BookEditor />);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Add book" }),
    );
    expect(screen.getByText("Title is required.")).toBeTruthy();
    expect(screen.getByText("Stock count is required.")).toBeTruthy();
    expect(merchantUpload).not.toHaveBeenCalled();
    expect(auditAccessibility()).toEqual([]);
  });
  test.each(["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"])(
    "%s orders offer only legal next actions",
    async (status) => {
      mockStatus = status;
      mockParams = { id: "order-1" };
      await mounted(<OrderDetail />);
      await screen.findByText("Order #RDER-1");
      expect(screen.getByText("reader@example.test")).toBeTruthy();
      const buttons = {
        Confirmed: "Confirm order",
        Shipped: "Mark shipped",
        Delivered: "Mark delivered",
        Cancelled: "Cancel order",
      };
      for (const [next, label] of Object.entries(buttons)) {
        const control = screen.queryByRole("button", {
          name: label,
        });
        if (transitions[status].includes(next)) expect(control).toBeTruthy();
        else expect(control).toBeNull();
      }
      if (status === "Pending") {
        expect(
          screen.getByRole("button", { name: "Confirm order" }).props
            .accessibilityState.disabled,
        ).toBe(true);
        await fireEvent.press(
          screen.getByRole("radio", { name: "I checked the transfer records" }),
        );
        expect(
          screen.getByRole("button", { name: "Confirm order" }).props
            .accessibilityState.disabled,
        ).toBe(false);
      }
      expect(updateOrderStatusAPI).not.toHaveBeenCalled();
    },
  );
  test("reload latest book replaces stale stock with an authorized fresh response", async () => {
    mockParams = { id: "book-1" };
    await mounted(<BookEditor />);
    await screen.findByRole("button", { name: "Save book" });
    await waitFor(() =>
      expect(screen.getByLabelText("Stock count").props.value).toBe("3"),
    );
    mockBook = { ...book, stockCount: 8 };
    await fireEvent.press(
      screen.getByRole("button", { name: "Reload latest book" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Stock count").props.value).toBe("8"),
    );
    expect(merchantGet).toHaveBeenCalledWith(
      "merchant/inventory/book-1",
      {},
      user.token,
    );
  });
  test("reports chart real counts with no fabricated sales number", async () => {
    await mounted(<Reports />);
    expect(await screen.findByText("Inventory by category")).toBeTruthy();
    expect(screen.getByLabelText("Fiction: 1 active titles")).toBeTruthy();
    expect(screen.getByText(/does not track settled receipts/)).toBeTruthy();
  });
});

test("valid book creation ignores a second submit while the first request is pending", async () => {
  let finish: any;
  (merchantUpload as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mounted(<BookEditor />);
  await screen.findByRole("button", { name: "Add book" });
  for (const [label, value] of [
    ["Title", "A new book"],
    ["Author", "A writer"],
    ["Description", "A description"],
    ["Category", "Fiction"],
    ["Price (LKR)", "1250.50"],
    ["Stock count", "5"],
  ])
    await fireEvent.changeText(screen.getByLabelText(label), value);
  await fireEvent.press(screen.getByRole("button", { name: "Add book" }));
  await fireEvent.press(screen.getByRole("button", { name: "Add book" }));
  await waitFor(() => expect(merchantUpload).toHaveBeenCalledTimes(1));
  await act(async () => {
    finish(book);
  });
});
test("a customer cannot mount the owner workspace or trigger private requests", async () => {
  await renderUI(auth(<OwnerLayout />, "Customer"));
  expect(screen.getByText("redirect:/(tabs)/dashboard")).toBeTruthy();
  expect(merchantGet).not.toHaveBeenCalled();
});
test("API failures keep recovery available", async () => {
  (merchantGet as jest.Mock).mockImplementation(async (path: string) => {
    if (path === "merchant/orders")
      throw { response: { data: { message: "Owner service unavailable" } } };
    return load(path);
  });
  await mounted(<Orders />);
  expect(await screen.findByText("Owner service unavailable")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});
const valid = {
  title: "T",
  author: "A",
  description: "D",
  category: "Fiction",
  price: "0",
  stockCount: "0",
  shop: "shop-1",
};
test.each([
  { price: "-1" },
  { price: "1.234" },
  { stockCount: "1.5" },
  { stockCount: "-1" },
  { shop: "" },
])("invalid merchant draft is rejected: %j", (change) => {
  expect(
    Object.keys(bookErrors({ ...valid, ...change })).length,
  ).toBeGreaterThan(0);
});
test("zero-price and zero-stock values remain valid, without invented defaults", () =>
  expect(bookErrors(valid)).toEqual({}));
