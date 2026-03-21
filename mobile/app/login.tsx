import { View, TouchableOpacity, Button, TextInput, Text, ImageBackground} from "react-native";
import { useState } from "react";


import { router } from "expo-router";

export default function Login() {
    const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

    
    const handleLogin = async (): Promise<void> => {
        try {
          const response: Response = await fetch(
            "http://localhost:3000/login",  //use your computer's IP address
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, password }),
            }
          );
      
          const data: { message: string; userId?: string } =
            await response.json();
      
          console.log(data);
      
          if (response.ok) {
            router.push("/(tabs)/home");
          } else {
            alert(data.message);
          }
        } catch (error) {
          console.error("Network error:", error);
        }
      };
      
      
      

return (
<ImageBackground source={require("../assets/images/background.png")} style={{flex:1, padding:40}}> 
<View style={{ flex:1, padding: 40}}>
<Text style={{fontSize: 24, marginBottom: 20, marginTop: 180, color: "green"}}>Habitat</Text>

<TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{borderWidth: 1, padding: 10, marginBottom: 10}} autoCapitalize="none" autoCorrect={false}/>
<TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{borderWidth: 1, padding: 10, marginBottom: 20}} autoCapitalize="none" autoCorrect={false}/>

<Button title="Login" onPress={handleLogin} />

<TouchableOpacity style={{ marginTop: 20}} onPress={() => router.push("./signup")}>
    <Text>Create Account</Text>
</TouchableOpacity>
    
<TouchableOpacity style={{ marginTop: 10}} onPress={() => router.push("./forgot-password")}>
    <Text>Forgot Password?</Text>
</TouchableOpacity>
    
</View>
</ImageBackground>
);
}
// #b5e48c