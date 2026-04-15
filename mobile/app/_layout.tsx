import {
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-native-reanimated";
import { ThemeProvider } from "@/constants/theme";

import { useColorScheme } from "@/hooks/use-color-scheme";

// Create a client
const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: "login",
};

// no tabs from the beginning
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}
