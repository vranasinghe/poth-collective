import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { ScreenContainer, LoadingSkeleton } from "../src/ui";
export default function Entry() {
  const { user, isLoading, isShopOwner } = useAuth();
  if (isLoading)
    return (
      <ScreenContainer>
        <LoadingSkeleton variant="profile" />
      </ScreenContainer>
    );
  return (
    <Redirect
      href={!user ? "/auth" : isShopOwner ? "/owner" : "/(tabs)/dashboard"}
    />
  );
}
