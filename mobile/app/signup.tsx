import { useState } from "react";
import { router } from "expo-router";
import { View, TextInput,  Text,  TouchableOpacity,  ActivityIndicator} from "react-native";
import api from "@/lib/api";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      const { data, status } = await api.post("/signup", {
        email: trimmedEmail,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });
    
      if (status === 200) {
        router.push({
          pathname: "/verify",
          params: { email: trimmedEmail },
        });
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      alert(error?.response?.data?.message || "Network error");
    }
  };

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    await handleSignup();
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, padding: 40, backgroundColor: "#74c69d" }}>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ position: "absolute", top: 60, left: 20, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#EAF6E8", borderRadius: 8,
        }}
      >
        <Text style={{ color: "#2d6a4f", fontWeight: "600" }}>← Back</Text>
      </TouchableOpacity>

      <Text
        style={{fontSize: 24, marginBottom: 30, marginTop: 180, color: "#EAF6E8", fontWeight: "bold",
        }}
      >
        Sign Up
      </Text>

      <TextInput
        placeholder="First Name"
        placeholderTextColor="#ccc"
        value={firstName}
        onChangeText={setFirstName}
        style={{ borderWidth: 1, borderColor: "#EAF6E8",padding: 12, marginBottom: 10,borderRadius: 8, color: "#fff",
        }}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Last Name"
        placeholderTextColor="#ccc"
        value={lastName}
        onChangeText={setLastName}
        style={{ borderWidth: 1, borderColor: "#EAF6E8", padding: 12, marginBottom: 10, borderRadius: 8, color: "#fff",
        }}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#ccc"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: "#EAF6E8", padding: 12, marginBottom: 10, borderRadius: 8, color: "#fff",
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#ccc"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: "#EAF6E8", padding: 12, marginBottom: 10, borderRadius: 8, color: "#fff",
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#ccc"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{ borderWidth: 1, borderColor: "#EAF6E8",padding: 12, marginBottom: 25,borderRadius: 8, color: "#fff",
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        onPress={handlePress}
        disabled={loading}
        style={{ backgroundColor: loading ? "#95d5b2" : "#2d6a4f",paddingVertical: 14, borderRadius: 10, alignItems: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            Sign Up
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}