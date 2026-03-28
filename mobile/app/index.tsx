// temporary authentication screen
// changed with Somaiya's code
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function AuthScreen() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#EAF6E8",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "600", marginBottom: 20 }}>
        Welcome to Habitat 🌿
      </Text>

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)")} // this should be present to go to the tabs in the future
        style={{
          backgroundColor: "#2E6F40",
          padding: 15,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "white" }}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}