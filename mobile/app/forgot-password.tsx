import { View, TouchableOpacity, Button, TextInput, Text} from "react-native";
import { router } from "expo-router";


export default function ForgotPassword() {
    
    const handleforgotPassword = () => {
        console.log("Forgot Password.");
    };

return (
<View style={{ flex:1, padding: 40, backgroundColor: "#74c69d"}}>
<Text style={{fontSize: 24, marginBottom: 20, marginTop: 180, color: "#EAF6E8"}}>Habitat</Text>

<TextInput placeholder="Email" style={{borderWidth: 1, padding: 10, marginBottom: 10}}/>

<Button title="Send Code" onPress={handleforgotPassword} />
    
<TouchableOpacity style={{ marginTop: 20}} onPress={() => router.push("./login")}>
    <Text style={{color: "#EAF6E8"}}>Back</Text>
</TouchableOpacity>
    
</View>
);
}