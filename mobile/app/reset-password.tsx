import { View, TextInput, Text, TouchableOpacity, ActivityIndicator, } from "react-native";
  import { useState, useEffect } from "react";
  import { useLocalSearchParams, router } from "expo-router";
  
  export default function ResetPassword() {
    const { email } = useLocalSearchParams<{ email: string }>();
  
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(30);
  
    // countdown timer
    useEffect(() => {
      if (timer === 0) return;
  
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
  
      return () => clearInterval(interval);
    }, [timer]);
  
    const handleReset = async () => {
      if (!code || !password) {
        alert("All fields are required");
        return;
      }
  
      if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
      }
  
      try {
        const response = await fetch("http://localhost:3000/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code,
            password,
          }),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          alert("Password reset successful");
          router.replace("/login");
        } else {
          alert(data.message || "Reset failed");
        }
      } catch (error) {
        console.error(error);
        alert("Network error");
      }
    };
  
    const handleResetPress = async () => {
      if (loading) return;
      setLoading(true);
      await handleReset();
      setLoading(false);
    };
  
    const handleResend = async () => {
      if (timer > 0 || resendLoading) return;
  
      setResendLoading(true);
  
      try {
        const response = await fetch("http://localhost:3000/resend-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const text = await response.text();
        console.log("RAW RESPONSE:", text);
  
        const data = JSON.parse(text);
  
        if (response.ok) {
          alert("New code sent");
          setTimer(30); 
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error(error);
        alert("Network error");
      }
  
      setResendLoading(false);
    };
  
    return (
      <View style={{ flex: 1, padding: 40, backgroundColor: "#74c69d" }}>
  
        <TouchableOpacity
          onPress={() => router.back()}
          style={{   position: "absolute",    top: 60,   left: 20,   paddingVertical: 6,    paddingHorizontal: 10,    backgroundColor: "#EAF6E8",    borderRadius: 8,
          }}
        >
          <Text style={{ color: "#2d6a4f", fontWeight: "600" }}>← Back</Text>
        </TouchableOpacity>
  
        <Text
          style={{  fontSize: 24,  marginBottom: 30,  marginTop: 180,  color: "#EAF6E8",  fontWeight: "bold",
          }}
        >
          Reset Password
        </Text>
  
        <Text style={{ color: "#EAF6E8", marginBottom: 5 }}>
          Enter Code
        </Text>
        <TextInput
          placeholder="Code"
          placeholderTextColor="#ccc"
          value={code}
          onChangeText={setCode}
          style={{   borderWidth: 1,  borderColor: "#EAF6E8",  padding: 12,  marginBottom: 10, borderRadius: 8,  color: "#fff",
          }}
        />
  
        <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
          <Text style={{ color: "#EAF6E8", marginBottom: 20 }}>
            {timer > 0
              ? `Resend code in ${timer}s`
              : resendLoading
              ? "Sending..."
              : "Resend Code"}
          </Text>
        </TouchableOpacity>
  
        <Text style={{ color: "#EAF6E8", marginBottom: 5 }}>
          New Password
        </Text>
        <TextInput
          placeholder="New Password"
          placeholderTextColor="#ccc"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1,  borderColor: "#EAF6E8",  padding: 12,  marginBottom: 25,  borderRadius: 8,  color: "#fff",
          }}
        />
  
        <TouchableOpacity
          onPress={handleResetPress}
          disabled={loading}
          style={{ backgroundColor: loading ? "#95d5b2" : "#2d6a4f", paddingVertical: 14, borderRadius: 10, alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              Reset Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }