import { View, TextInput, Text, TouchableOpacity, ActivityIndicator} from "react-native";
  import { router } from "expo-router";
  import { useState } from "react";
import { useTheme, FontSize, Radius, Spacing } from '@/constants/theme';
import api from "@/lib/api";
  
  export default function ForgotPassword() {
    const { Colors } = useTheme();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
  
    const handleForgotPassword = async () => {
      const trimmedEmail = email.trim().toLowerCase();
  
      if (!trimmedEmail) {
        alert("Email is required");
        return;
      }
  
      try {
        const { data, status } = await api.post("/forgot-password", {
          email: trimmedEmail,
        });
      
        if (status === 200) {
          alert("Code sent to your email");
      
          router.push({
            pathname: "/reset-password",
            params: { email: trimmedEmail },
          });
        } else {
          alert(data.message || "Error");
        }
      } catch (error: any) {
        console.error("Forgot password error:", error);
        alert(error?.response?.data?.message || "Network error");
      }
    };
  
    const handlePress = async () => {
      if (loading) return;
      setLoading(true);
      await handleForgotPassword();
      setLoading(false);
    };
  
    return (
      <View style={{ flex: 1, padding: Spacing.top_margin, backgroundColor: Colors.pageBg }}>
  
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.md,
            backgroundColor: Colors.white,
            borderRadius: Radius.sm,
          }}
        >
          <Text style={{ color: Colors.primaryGreen, fontWeight: "600" }}>← Back</Text>
        </TouchableOpacity>
  
        <Text
          style={{
            fontSize: FontSize.xl,
            marginBottom: Spacing.xl,
            marginTop: 180,
            color: Colors.darkBrown,
            fontWeight: "bold",
          }}
        >
          Forgot Password
        </Text>
  
        <Text style={{ color: Colors.darkBrown, marginBottom: Spacing.xs }}>
          Enter your email
        </Text>
  
        <TextInput
          placeholder="Email"
          placeholderTextColor={Colors.midBrown}
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: Colors.white,
            padding: Spacing.ms,
            marginBottom: Spacing.lg,
            borderRadius: Radius.sm,
            color: Colors.darkBrown,
          }}
          autoCapitalize="none"
        />
  
        <TouchableOpacity
          onPress={handlePress}
          disabled={loading}
          style={{
            backgroundColor: loading ? Colors.lightGreen : Colors.primaryGreen,
            paddingVertical: Spacing.md,
            borderRadius: Radius.sm,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={{ color: Colors.white, fontWeight: "bold", fontSize: FontSize.lg }}>
              Send Code
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }