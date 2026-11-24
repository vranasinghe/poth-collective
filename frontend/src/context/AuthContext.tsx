import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import axios from "axios";
import { API_BASE_URL } from "../api/apiConfig";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  token: string;
  nearestCity?: string;
  phoneNumber?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  loginContext: (userData: User) => Promise<void>;
  logoutContext: () => Promise<void>;
  updateUserContext: (data: Partial<User>) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  loginContext: async () => {},
  logoutContext: async () => {},
  updateUserContext: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const rootSegment = useSegments()[0];
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("@poth_user");
        if (storedUser) {
          const saved = JSON.parse(storedUser);
          if (!saved?._id || !saved?.token) {
            await AsyncStorage.removeItem("@poth_user");
            return;
          }
          try {
            const { data } = await axios.get(
              `${API_BASE_URL}/api/users/profile`,
              {
                headers: { Authorization: `Bearer ${saved.token}` },
                timeout: 10000,
              },
            );
            const restored = { ...saved, ...data };
            await AsyncStorage.setItem("@poth_user", JSON.stringify(restored));
            setUser(restored);
          } catch (e: any) {
            if (e.response?.status === 401 || e.response?.status === 403)
              await AsyncStorage.removeItem("@poth_user");
            else setUser(saved);
          }
        }
      } catch (error) {
        console.error("Failed to load user data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (r) => r,
      async (error) => {
        if (
          error.response?.status === 401 &&
          user &&
          error.config?.headers?.Authorization === `Bearer ${user.token}`
        ) {
          await AsyncStorage.removeItem("@poth_user");
          setUser(null);
        }
        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [user]);

  useEffect(() => {
    if (isLoading) return;

    // A keyed stack remount during login must not strand a valid session on the auth route.
    if (user && (rootSegment === "auth" || rootSegment === "register")) {
      const owner =
        user.userType === "Shop Owner" || user.userType === "shopOwner";
      router.replace(owner ? "/owner" : "/(tabs)/dashboard");
      return;
    }
    // Unauthenticated users return to sign-in.
    // The /dev component gallery is reachable without an account in development builds only
    const isDevTool = __DEV__ && (rootSegment as string | undefined) === "dev";
    if (
      !user &&
      !isDevTool &&
      rootSegment !== "auth" &&
      rootSegment !== "register" &&
      rootSegment !== undefined
    ) {
      router.replace("/auth");
    }
  }, [user, isLoading, rootSegment, router]);

  const loginContext = async (userData: User) => {
    try {
      await AsyncStorage.setItem("@poth_user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to login", error);
      throw error;
    }
  };

  const logoutContext = async () => {
    try {
      await AsyncStorage.removeItem("@poth_user");
      setUser(null);
      router.replace("/auth");
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  const updateUserContext = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      try {
        await AsyncStorage.setItem("@poth_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (error) {
        console.error("Failed to update user context", error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginContext,
        logoutContext,
        updateUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  const isShopOwner =
    context.user?.userType === "Shop Owner" ||
    context.user?.userType === "shopOwner";
  return { ...context, isShopOwner };
};
