import { Redirect, useLocalSearchParams } from "expo-router";
export default function InventoryLink() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/owner/(tabs)/inventory", params }} />;
}
