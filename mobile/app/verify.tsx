import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, FontSize, Spacing, Radius } from "@/constants/theme";

export default function Verify() {
  const { Colors } = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeExpired, setCodeExpired] = useState(false);

  const handleVerify = async () => {
    if (!code) {
      alert("Enter code");
      return;
    }

    try {
      const { data, status } = await api.post("/verify", {
        email,
        code,
      });

      if (status >= 200 && status < 300) {
        alert("Email verified! Log in to continue.");

        if (data.token) {
          await AsyncStorage.setItem("token", data.token);
          api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
        }

        const idToStore = data.userId || data.user?.id || data.id;
        if (idToStore) {
          await AsyncStorage.setItem("userId", idToStore);
        }

        // router.replace("/(tabs)/home");
        router.replace("/login");
      } else {
        alert(data.message || "Verification failed");
      }
    } catch (error: any) {
      const data = error.response?.data;

      if (data?.expired) {
        setCodeExpired(true);
      } else {
        alert(data?.message || "Network error");
      }
    }
  };

  const handleVerifyPress = async () => {
    if (loading) return;
    setLoading(true);
    await handleVerify();
    setLoading(false);
  };

  const handleResend = async () => {
    if (resending) return;

    setResending(true);

    try {
      await api.post("/resend-code", { email });
      alert("New verification code sent!");
      setCodeExpired(false);
    } catch {
      alert("Could not resend code");
    }

    setResending(false);
  };

  return (
    <View
      style={{
        flex: 1,
        padding: Spacing.xl,
        backgroundColor: Colors.pageBg,
      }}
    >
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: Spacing.top_margin,
          left: Spacing.lg,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          borderRadius: Radius.sm,
        }}
      >
        <Text style={{ color: Colors.primaryGreen, fontWeight: "600" }}>
          ← Back
        </Text>
      </TouchableOpacity>

      {/* Title */}
      <Text
        style={{
          fontSize: FontSize.xl,
          marginTop: 180,
          marginBottom: Spacing.md,
          color: Colors.darkBrown,
          fontWeight: "bold",
        }}
      >
        Verify Email
      </Text>

      {/* Code Input */}
      <Text style={{ color: Colors.darkBrown, marginBottom: 5 }}>
        Enter Code
      </Text>

      <TextInput
        placeholder="Code"
        placeholderTextColor={Colors.darkBrown}
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: Colors.midBrown,
          padding: Spacing.ms,
          marginBottom: Spacing.lg,
          borderRadius: Radius.sm,
          color: Colors.midBrown,
        }}
      />

      {/* Expired State */}
      {codeExpired && (
        <>
          <Text style={{ color: "red", marginBottom: Spacing.md }}>
            Code expired. Please request a new one.
          </Text>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            style={{
              backgroundColor: Colors.primaryGreen,
              paddingVertical: Spacing.md,
              borderRadius: Radius.sm,
              alignItems: "center",
              marginBottom: Spacing.lg,
            }}
          >
            {resending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={{ color: Colors.white, fontWeight: "bold" }}>
                Resend Code
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Verify Button */}
      <TouchableOpacity
        onPress={handleVerifyPress}
        disabled={loading}
        style={{
          backgroundColor: loading
            ? Colors.lightGreen
            : Colors.primaryGreen,
          paddingVertical: Spacing.md,
          borderRadius: Radius.sm,
          alignItems: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text
            style={{
              color: Colors.white,
              fontWeight: "bold",
              fontSize: FontSize.md,
            }}
          >
            Verify
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}