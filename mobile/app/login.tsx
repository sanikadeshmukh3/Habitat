import { View, TouchableOpacity, Button, TextInput, Text, ImageBackground, ActivityIndicator} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import api from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


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
      await AsyncStorage.multiRemove(["token", "userId"]);
      // POST login using your centralized API instance
      const { data } = await api.post("/login", {
        email: email.trim(),
        password,
      });
      console.log("RAW LOGIN RESPONSE FROM SERVER:", JSON.stringify(data, null, 2));
  
      // `data` should contain { message, token? }
      // if (data.token) {
      //   // SAVE BOTH THE TOKEN AND THE USER ID
      //   await AsyncStorage.setItem("token", data.token);
        
      //   if (data.user && data.user.id) {
      //     await AsyncStorage.setItem("userId", data.user.id);
      //   } else if (data.id) {
      //     // Check if your backend sends it as .id or .userId
      //     await AsyncStorage.setItem("userId", data.id);
      //   }

      //   router.push("/(tabs)/home");
      // }
      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
        
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

        console.log("LOGIN DATA:", data);
        // This part looks good, but let's make it robust:
        const idToStore = data.user?.id || data.id || data.userId;
        if (idToStore) {
          await AsyncStorage.setItem("userId", idToStore);
        }

        // --- CHANGE THIS FROM push TO replace ---
        // 'replace' prevents the user from clicking 'back' into the old session
        router.replace("/(tabs)/home"); 
      }
    } catch (error: any) {
      console.log("FULL ERROR:", error);
    
      if (error.response) {
        //console.log("Server error:", error.response.data);
    
        if (error.response.status === 403) {
          await api.post("/resend-code", { email });

        router.push({
            pathname: "/verify",
            params: { email },
          });
        } else {
          alert(error.response.data?.message || "Server error");
        }
    
      } else if (error.request) {
        console.log("No response received:", error.request);
        alert("Cannot connect to server");
    
      } else {
       // console.log("Unexpected error:", error.message);
        alert("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };
      

      return (
        <ImageBackground source={require("../assets/images/background.png")} style={{ flex: 1, padding: 40 }}>
          <View style={{ flex: 1, padding: 40 }}>
            <Text style={{ fontSize: 26, marginBottom: 20, marginTop: 180, color: "#2d6a4f" }}>Habitat</Text>
    
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 }}
              autoCapitalize="none"
              autoCorrect={false}
            />
<View style={{ position: "relative", marginBottom: 20 }}>
  <TextInput
    placeholder="Password"
    secureTextEntry={!showPassword}
    value={password}
    onChangeText={setPassword}
    style={{
      borderWidth: 1,
      padding: 10,
      borderRadius: 8,
      paddingRight: 40, // space for icon
    }}
    autoCapitalize="none"
    autoCorrect={false}
  />

  <TouchableOpacity
    onPress={() => setShowPassword(prev => !prev)}
    style={{
      position: "absolute",
      right: 10,
      top: 12,
    }}
  >
    <Ionicons
      name={showPassword ? "eye" : "eye-off"}
      size={22}
      color="gray"
    />
  </TouchableOpacity>
</View>
    
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