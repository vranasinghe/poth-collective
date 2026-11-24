import { Redirect, Stack } from "expo-router";
import { ThemeProvider } from "../../src/theme/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import { ScreenContainer, LoadingSkeleton } from "../../src/ui";
import { MerchantProvider } from "../../src/merchant/shared";
export default function OwnerLayout() {
  const { user, isLoading, isShopOwner } = useAuth();
  if (isLoading)
    return (
      <ScreenContainer>
        <LoadingSkeleton variant="profile" />
      </ScreenContainer>
    );
  if (!user) return <Redirect href="/auth" />;
  if (!isShopOwner) return <Redirect href="/(tabs)/dashboard" />;
  return (
    <ThemeProvider variant="owner">
      <MerchantProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </MerchantProvider>
    </ThemeProvider>
  );
}
