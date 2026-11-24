import React from "react";
import { Platform, View } from "react-native";
import { fireEvent, screen, act, waitFor } from "@testing-library/react-native";
import { renderUI, auditAccessibility } from "../../ui/__tests__/testUtils";
import { AuthContext } from "../../context/AuthContext";
import { useResource } from "../useResource";
import { AppText } from "../../ui";
import { readerGet } from "../api";
import { getReaderOrdersAPI } from "../../api/orderApi";
import Discovery from "../Discovery";
import Orders from "../Orders";
import BookDetails from "../../../app/book/[id]";

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
let mockParams: Record<string, string> = { id: "book-1" };
jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: any) => {
    const React = jest.requireActual("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("../api", () => ({
  readerGet: jest.fn(),
  errorMessage: (e: any) => e.message || "Try again",
}));
jest.mock("../../api/orderApi", () => ({
  getReaderOrdersAPI: jest.fn(),
  deleteOrderAPI: jest.fn(),
  updateOrderDeliveryAPI: jest.fn(),
}));
jest.mock("../../api/reviewApi", () => ({
  getReviewsAPI: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
const user = {
  _id: "a",
  firstName: "Reader",
  lastName: "A",
  email: "a@example.test",
  userType: "Customer",
  token: "token-a",
};
const auth = (child: any, account = user) => (
  <AuthContext.Provider
    value={{
      user: account,
      isLoading: false,
      loginContext: jest.fn(),
      logoutContext: jest.fn(),
      updateUserContext: jest.fn(),
    }}
  >
    {child}
  </AuthContext.Provider>
);
const book = {
  _id: "book-1",
  title: "A very long but real book title that should wrap safely",
  author: "Writer",
  category: "Fiction",
  price: 1250,
  stockCount: 0,
  averageRating: 0,
  numReviews: 0,
  description: "Description",
  shop: { _id: "shop-1", name: "Bookshop" },
};
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "book-1" };
  (getReaderOrdersAPI as jest.Mock).mockResolvedValue({ data: [] });
});

describe.each(["ios", "android"] as const)(
  "%s reader components",
  (platform) => {
    beforeEach(() => {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: platform,
      });
    });
    test("empty orders stay usable and have named controls", async () => {
      await renderUI(auth(<Orders />));
      expect(
        await screen.findByText("Your reading journey starts here"),
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Explore books" }),
      ).toBeTruthy();
      expect(auditAccessibility()).toEqual([]);
    });
    test("out-of-stock books cannot be ordered", async () => {
      (readerGet as jest.Mock).mockImplementation((path: string) =>
        Promise.resolve(path === "books/book-1" ? book : { items: [] }),
      );
      await renderUI(auth(<BookDetails />));
      const order = await screen.findByRole("button", { name: "Out of stock" });
      expect(order.props.accessibilityState.disabled).toBe(true);
      expect(screen.getByText("0 reviews · Fiction")).toBeTruthy();
      expect(auditAccessibility()).toEqual([]);
    });
    test("discovery exposes recovery instead of a silent empty catalogue", async () => {
      (readerGet as jest.Mock).mockRejectedValue(
        new Error("Connection unavailable"),
      );
      await renderUI(auth(<Discovery />));
      expect(await screen.findByText("Connection unavailable")).toBeTruthy();
      (readerGet as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
        categories: [],
      });
      await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("Nothing on this shelf yet")).toBeTruthy();
    });
  },
);

test("late responses from a previous account never appear in the new account", async () => {
  let finishA: any;
  const loaderA = () =>
    new Promise<string>((resolve) => {
      finishA = resolve;
    });
  const loaderB = () => Promise.resolve("Account B only");
  function Probe({ load }: { load: () => Promise<string> }) {
    const r = useResource("private", load);
    return (
      <View>
        <AppText>{r.data || "Loading"}</AppText>
      </View>
    );
  }
  await renderUI(auth(<Probe load={loaderA} />));
  await screen.rerender(auth(<Probe load={loaderB} />, { ...user, _id: "b" }));
  expect(await screen.findByText("Account B only")).toBeTruthy();
  await act(async () => {
    finishA("Secret from account A");
  });
  expect(screen.queryByText("Secret from account A")).toBeNull();
});


test('explicit fresh entry clears retained price and stock filters; ordinary rerenders keep them', async () => {
 (readerGet as jest.Mock).mockResolvedValue({ items: [], total: 0, categories: ['Fiction'] });
 await renderUI(auth(<Discovery />));
 await screen.findByText('Nothing on this shelf yet');
 await fireEvent.press(screen.getByRole('button', { name: 'Filter and sort' }));
 await fireEvent.changeText(screen.getByLabelText('Min price (LKR)'), '9000');
 await fireEvent.press(screen.getByRole('radio', { name: 'In stock' }));
 await waitFor(() => expect(readerGet).toHaveBeenLastCalledWith('books', expect.objectContaining({ minPrice: '9000', inStock: true }), user.token));
 await screen.rerender(auth(<Discovery />));
 expect(screen.getByLabelText('Min price (LKR)').props.value).toBe('9000');
 mockParams = { kind: 'books', category: 'Fiction', resetKey: 'fresh-entry' };
 await screen.rerender(auth(<Discovery />));
 await waitFor(() => expect(readerGet).toHaveBeenLastCalledWith('books', expect.objectContaining({ minPrice: '', maxPrice: '', inStock: false, category: 'Fiction', page: 1 }), user.token));
});
