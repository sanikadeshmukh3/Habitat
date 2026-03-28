import { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function Verify() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState("");

  const handleVerify = async () => {
    if (!code) {
      alert("Enter code");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Email verified!");
        router.push("/login");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
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