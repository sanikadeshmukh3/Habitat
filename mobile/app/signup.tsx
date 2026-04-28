import { useState } from "react";
import { router } from "expo-router";
import { View, TextInput,  Text,  TouchableOpacity,  ActivityIndicator} from "react-native";
import api from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, FontSize, Radius, Spacing } from "@/constants/theme";

export default function Signup() {
  const { Colors } = useTheme();

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
    
      if (status >= 200 && status < 300) {
        if (data.userId) {
          await AsyncStorage.setItem("userId", data.userId);
          console.log("Saved userId to storage:", data.userId);
        }
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
    <View style={{ flex: 1, padding: Spacing.xl, backgroundColor: Colors.pageBg }}>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ position: "absolute", top: Spacing.top_margin, left: Spacing.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.paleGreen, borderRadius: Radius.sm,
        }}
      >
        <Text style={{ color: Colors.primaryGreen, fontWeight: "600" }}>← Back</Text>
      </TouchableOpacity>

      <Text
        style={{fontSize: FontSize.xl, marginBottom: Spacing.lg, marginTop: 180, color: Colors.darkBrown, fontWeight: "bold",
        }}
      >
        Sign Up
      </Text>

      <TextInput
        placeholder="First Name"
        placeholderTextColor={Colors.midBrown}
        value={firstName}
        onChangeText={setFirstName}
        style={{ borderWidth: 1, borderColor: Colors.darkBrown, padding: Spacing.ms, marginBottom: Spacing.sm, borderRadius: Radius.sm, color: Colors.darkBrown,
        }}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Last Name"
        placeholderTextColor={Colors.midBrown}
        value={lastName}
        onChangeText={setLastName}
        style={{ borderWidth: 1, borderColor: Colors.darkBrown, padding: Spacing.ms, marginBottom: Spacing.sm, borderRadius: Radius.sm, color: Colors.darkBrown,
        }}
        autoCorrect={false}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor={Colors.midBrown}
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: Colors.darkBrown, padding: Spacing.ms, marginBottom: Spacing.sm, borderRadius: Radius.sm, color: Colors.darkBrown,
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={Colors.midBrown}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: Colors.darkBrown, padding: Spacing.ms, marginBottom: Spacing.sm, borderRadius: Radius.sm, color: Colors.darkBrown,
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor={Colors.midBrown}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{ borderWidth: 1, borderColor: Colors.darkBrown, padding: Spacing.ms, marginBottom: Spacing.lg, borderRadius: Radius.sm, color: Colors.darkBrown,
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        onPress={handlePress}
        disabled={loading}
        style={{ backgroundColor: loading ? Colors.lightGreen : Colors.primaryGreen, paddingVertical: Spacing.md, borderRadius: Radius.sm, alignItems: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={{ color: Colors.white, fontWeight: "bold", fontSize: 16 }}>
            Sign Up
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

//TODO: signup could probably benefit from a style sheet, I saw a lot of duplicated code