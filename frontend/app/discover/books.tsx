import { Redirect, useLocalSearchParams } from "expo-router";
export default function BooksLink() {
  const params = useLocalSearchParams();
  return (
    <Redirect
      href={{
        pathname: "/(tabs)/explore",
        params: { ...params, kind: "books" },
      }}
    />
  );
}
