export type BookDraft = {
  title: string;
  author: string;
  description: string;
  category: string;
  price: string;
  stockCount: string;
  shop: string;
};
export const numberError = (
  value: string,
  label: string,
  max: number,
  integer = false,
) => {
  if (!value.trim()) return `${label} is required.`;
  if (
    !Number.isFinite(Number(value)) ||
    Number(value) < 0 ||
    Number(value) > max ||
    (integer && !Number.isInteger(Number(value)))
  )
    return `${label} must be ${integer ? "a whole number" : "a number"} from 0 to ${max.toLocaleString()}.`;
  if (!integer && !/^\d+(?:\.\d{1,2})?$/.test(value.trim()))
    return "Use a price with at most two decimal places.";
  return undefined;
};
export function bookErrors(draft: BookDraft) {
  const errors: Record<string, string> = {};
  const lengths: Record<string, number> = {
    title: 200,
    author: 120,
    description: 2000,
    category: 60,
  };
  for (const [field, max] of Object.entries(lengths)) {
    const value = draft[field as keyof BookDraft].trim();
    if (!value)
      errors[field] =
        `${field === "category" ? "Category" : field[0].toUpperCase() + field.slice(1)} is required.`;
    else if (value.length > max)
      errors[field] = `Use ${max} characters or fewer.`;
  }
  const price = numberError(draft.price, "Price", 10000000);
  if (price) errors.price = price;
  const stock = numberError(draft.stockCount, "Stock count", 1000000, true);
  if (stock) errors.stockCount = stock;
  if (!draft.shop) errors.shop = "Choose one of your shops.";
  return errors;
}
