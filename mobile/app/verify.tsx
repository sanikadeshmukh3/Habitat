import { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "@/lib/api";

export default function Verify() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState("");

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
    
      if (status === 200) {
        alert("Email verified!");
        router.push("/login");
      } else {
        alert(data.message || "Verification failed");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      alert(error?.response?.data?.message || "Network error");
    }
  };

  return (
    <View style={{ flex: 1, padding: 40, justifyContent: "center" }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Enter Verification Code
      </Text>

      <TextInput
        placeholder="Code"
        value={code}
        onChangeText={setCode}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
        keyboardType="numeric"
      />

      <Button title="Verify" onPress={handleVerify} />
    </View>
  );
}