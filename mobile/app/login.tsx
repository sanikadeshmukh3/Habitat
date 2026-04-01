import { View, TouchableOpacity, Button, TextInput, Text, ImageBackground, ActivityIndicator} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import api from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);


  // useEffect(() => {
  //   const checkLogin = async () => {
  //     const token = await AsyncStorage.getItem("token");
  
  //     if (token) {
  //       router.replace("/(tabs)/home");
  //     }
  //   };
  
  //   checkLogin();
  // }, []);

    
  const handleLogin = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
  
    try {
      // POST login using your centralized API instance
      const { data } = await api.post("/login", {
        email: email.trim(),
        password,
      });
  
      // `data` should contain { message, token? }
      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
        router.push("/(tabs)/home");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error: any) {

      if (error.response?.status === 403) { // specifically for the situation in which a user is created but not verified
        router.push({
          pathname: "/verify",
          params: { email },
        });
      } else {
        console.error("Login error:", error);
        alert(error?.response?.data?.message || "Network or server error");
      }
    } finally {
      setLoading(false);
    }
  };
      

      return (
        <ImageBackground source={require("../assets/images/background.png")} style={{ flex: 1, padding: 40 }}>
          <View style={{ flex: 1, padding: 40 }}>
            <Text style={{ fontSize: 24, marginBottom: 20, marginTop: 180, color: "green" }}>Habitat</Text>
    
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
              style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
              autoCapitalize="none"
              autoCorrect={false}
            />
    
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading} 
              style={{  backgroundColor: loading ? "#95d5b2" : "#2d6a4f",  paddingVertical: 14,  borderRadius: 10,  alignItems: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Login</Text>
              )}
            </TouchableOpacity>
    
            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.push("/signup")}>
              <Text>Create Account</Text>
            </TouchableOpacity>
    
            <TouchableOpacity style={{ marginTop: 10 }} onPress={() => router.push("/forgot-password")}>
              <Text>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      );
    }