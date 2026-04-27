import React from "react";
import { View, Text, TouchableOpacity, Button } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthScreen() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#EAF6E8",
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "600",
          marginBottom: 20,
        }}
      >
        Welcome to Habitat 🌿
      </Text>

      {/* Reset button */}
      <Button
        title="Reset App Data"
        onPress={() => AsyncStorage.clear()}
      />

      {/* Continue to login */}
      <TouchableOpacity
        onPress={() => router.replace("/login")}
        style={{
          backgroundColor: "#2E6F40",
          paddingVertical: 15,
          paddingHorizontal: 40,
          borderRadius: 12,
          marginTop: 25,
          width: 220,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>
          Continue
        </Text>
      </TouchableOpacity>

      {/* NEW onboarding button */}
      <TouchableOpacity
        onPress={() => router.push("./tutorial")}
        style={{
          backgroundColor: "#ffffff",
          paddingVertical: 15,
          paddingHorizontal: 40,
          borderRadius: 12,
          marginTop: 15,
          width: 220,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#2E6F40",
        }}
      >
        <Text style={{ color: "#2E6F40", fontWeight: "600" }}>
          View App Tour
        </Text>
      </TouchableOpacity>
    </View>
  );
}