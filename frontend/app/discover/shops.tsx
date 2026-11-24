import { Redirect, useLocalSearchParams } from "expo-router";
export default function ShopsLink() {
  const params = useLocalSearchParams();
  return (
    <Redirect
      href={{
        pathname: "/(tabs)/explore",
        params: { ...params, kind: "shops" },
      }}
    />
  );
}
