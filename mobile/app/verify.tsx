import { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "@/lib/api";

export default function Verify() {
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
        router.push("/login");
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

      {codeExpired && (
        <>
          <Text style={{marginTop: 20, textAlign: "center", color: "red"}}>
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
            marginTop: 10,
            paddingVertical: 12,
            backgroundColor: "#2d6a4f",
            borderRadius: 8,
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