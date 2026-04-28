import type { ThemeName } from "@/constants/theme";
import { ThemeProvider, useTheme } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

// Create a client
const queryClient = new QueryClient();

const THEME_STORAGE_KEY = '@app_theme';

export const unstable_settings = {
  initialRouteName: "login",
};

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        setTheme(saved as ThemeName);
      }
    };

    loadTheme();
  }, []);

  return <>{children}</>;
}

// no tabs from the beginning
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeInitializer>
          <Stack
            screenOptions={{
              headerShown: false, // 🔥 THIS removes the "(tabs)" header
            }}
          >
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen
              name="forgot-password"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="verify" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeInitializer>
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}