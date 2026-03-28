import { useState } from "react";
import { router } from "expo-router";
import { View, TouchableOpacity, Button, TextInput, Text } from "react-native";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedEmail || !password || !trimmedFirstName || !trimmedLastName) {
      alert("All fields are required");
      return;
    }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
  alert("Invalid email format");
  return;
  }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("http://10.75.196.102:3000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        }),
      });

      const data = await response.json();

      console.log(data);

      if (response.ok) {
        // alert("Account created!");
        router.push({
          pathname: "/verify",
          params: { email: trimmedEmail },
        });
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Network error");
    }
  };

  return (
    <View style={{ flex: 1, padding: 40, backgroundColor: "#74c69d" }}>
      <Text style={{ fontSize: 24, marginBottom: 20, marginTop: 180, color: "#EAF6E8" }}>
        Habitat
      </Text>

      <TextInput
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Re enter Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />

      <Button title="Sign up" onPress={handleSignup} />

      <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.push("/login")}>
        <Text style={{ color: "#EAF6E8" }}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}