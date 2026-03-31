import { View, TextInput, Text, TouchableOpacity, ActivityIndicator} from "react-native";
  import { router } from "expo-router";
  import { useState } from "react";
  
  export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
  
    const handleForgotPassword = async () => {
      const trimmedEmail = email.trim().toLowerCase();
  
      if (!trimmedEmail) {
        alert("Email is required");
        return;
      }
  
      try {
        const response = await fetch("http://localhost:3000/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: trimmedEmail }),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          alert("Code sent to your email");
  
          router.push({
            pathname: "/reset-password",
            params: { email: trimmedEmail },
          });
        } else {
          alert(data.message || "Error");
        }
      } catch (error) {
        console.error(error);
        alert("Network error");
      }
    };
  
    const handlePress = async () => {
      if (loading) return;
      setLoading(true);
      await handleForgotPassword();
      setLoading(false);
    };
  
    return (
      <View style={{ flex: 1, padding: 40, backgroundColor: "#74c69d" }}>
  
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: "#EAF6E8",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#2d6a4f", fontWeight: "600" }}>← Back</Text>
        </TouchableOpacity>
  
        <Text
          style={{
            fontSize: 24,
            marginBottom: 30,
            marginTop: 180,
            color: "#EAF6E8",
            fontWeight: "bold",
          }}
        >
          Forgot Password
        </Text>
  
        <Text style={{ color: "#EAF6E8", marginBottom: 5 }}>
          Enter your email
        </Text>
  
        <TextInput
          placeholder="Email"
          placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: "#EAF6E8",
            padding: 12,
            marginBottom: 25,
            borderRadius: 8,
            color: "#fff",
          }}
          autoCapitalize="none"
        />
  
        <TouchableOpacity
          onPress={handlePress}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#95d5b2" : "#2d6a4f",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              Send Code
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }