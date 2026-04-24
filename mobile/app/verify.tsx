import { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, FontSize, Spacing, Radius } from "@/constants/theme";

export default function Verify() {
  const { Colors } = useTheme();

  const { email } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [codeExpired, setCodeExpired] = useState(false);
  const [resending, setResending] = useState(false);

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
        alert("Email verified!");
        if (data.token){
          await AsyncStorage.setItem("token", data.token);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
        const idToStore = data.userId || data.user?.id || data.id;
        if (idToStore) {
          await AsyncStorage.setItem("userId", idToStore);
          console.log("Verify Screen - Saved userId: ", idToStore);
        }
        router.replace("/(tabs)/home")
        // router.push("/login");
      } else {
        alert(data.message || "Verification failed");
      }
    } catch (error: any) {
      const data = error.response?.data;

      if (data?.expired) {
        setCodeExpired(true);
      } else {
        console.error("Verification error:", error);
        alert(error?.response?.data?.message || "Network error");
      }
    }
  };

  return (
    <View style={{ flex: 1, padding: Spacing.xl, justifyContent: "center" }}>
      <Text style={{ fontSize: FontSize.lg, marginBottom: Spacing.md }}>
        Enter Verification Code
      </Text>

      <TextInput
        placeholder="Code"
        value={code}
        onChangeText={setCode}
        style={{ borderWidth: 1, padding: Spacing.ms, marginBottom: Spacing.md }}
        keyboardType="numeric"
      />

      <Button title="Verify" onPress={handleVerify} />

      {codeExpired && (
        <>
          <Text style={{marginTop: Spacing.lg, textAlign: "center", color: "red"}}>
          Code Expired
          </Text>

          <TouchableOpacity
          onPress={async () => {
            try {
              setResending(true);
              await api.post("/resend-code", { email });
              alert("New verification code sent!");
              setCodeExpired(false);
            } catch {
              alert("Could not resend code");
            } finally {
              setResending(false);
            }
          }}
          style={{
            marginTop: Spacing.ms,
            paddingVertical: Spacing.ms,
            backgroundColor: Colors.primaryGreen,
            borderRadius: Radius.sm,
            alignItems: "center",
          }}
          >
            <Text style={{color: "white", fontWeight: "bold"}}>
              { resending ? "Sending..." : "Resend code"}
            </Text>

          </TouchableOpacity>
        </>
      )}
    </View>
  );
}