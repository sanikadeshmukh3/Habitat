import { View, TouchableOpacity, Button, TextInput, Text, ImageBackground} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";


import { router } from "expo-router";

export default function Login() {
    const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");


  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token");
  
      if (token) {
        router.replace("/(tabs)/home");
      }
    };
  
    checkLogin();
  }, []);

    
    const handleLogin = async (): Promise<void> => {
        try {
          const response: Response = await fetch(
            "http://10.75.196.102:3000/login",  //use your computer's IP address
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email: email.trim(), password }),
            }
          );
      
          const data: { message: string; token?: string } =
            await response.json();
      
          console.log(data);
      
          if (response.ok && data.token) {
            await AsyncStorage.setItem("token", data.token);
            router.push("/(tabs)/home");
          } else {
            alert(data.message || "Login failed");
          }
        } catch (error) {
          console.error("Network error:", error);
          alert("Network error");
        }
      };
      
      
      

return (
<ImageBackground source={require("../assets/images/background.png")} style={{flex:1, padding:40}}> 
<View style={{ flex:1, padding: 40}}>
<Text style={{fontSize: 24, marginBottom: 20, marginTop: 180, color: "green"}}>Habitat</Text>

<TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{borderWidth: 1, padding: 10, marginBottom: 10}} autoCapitalize="none" autoCorrect={false}/>
<TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{borderWidth: 1, padding: 10, marginBottom: 20}} autoCapitalize="none" autoCorrect={false}/>

<Button title="Login" onPress={handleLogin} />

<TouchableOpacity style={{ marginTop: 20}} onPress={() => router.push("/signup")}>
    <Text>Create Account</Text>
</TouchableOpacity>
    
<TouchableOpacity style={{ marginTop: 10}} onPress={() => router.push("/forgot-password")}>
    <Text>Forgot Password?</Text>
</TouchableOpacity>
    
</View>
</ImageBackground>
);
}
// #b5e48c