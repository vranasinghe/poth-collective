import { Redirect, useLocalSearchParams } from "expo-router";
export default function SearchLink() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/(tabs)/explore", params }} />;
}
