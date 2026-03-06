import { router } from "expo-router";
import { View, TouchableOpacity, Button, TextInput, Text} from "react-native";

export default function Signup() {
    
    const handleSignup = () => {
        console.log("Signing up.");
    };

return (
<View style={{ flex:1, padding: 40, backgroundColor: "#74c69d"}}>
<Text style={{fontSize: 24, marginBottom: 20, marginTop: 180, color: "green"}}>Habitat</Text>

<TextInput placeholder="First Name" style={{borderWidth: 1, padding: 10, marginBottom: 10}}/>
<TextInput placeholder="Last Name" style={{borderWidth: 1, padding: 10, marginBottom: 10}}/>
<TextInput placeholder="Email" style={{borderWidth: 1, padding: 10, marginBottom: 10}}/>
<TextInput placeholder="Password" secureTextEntry style={{borderWidth: 1, padding: 10, marginBottom: 10}} />
<TextInput placeholder="Re enter Password" secureTextEntry style={{borderWidth: 1, padding: 10, marginBottom: 20}} />

<Button title="Sign up" onPress={handleSignup} />

<TouchableOpacity style={{ marginTop: 20}} onPress={() => router.push("/login")}>
    <Text>Back</Text>
</TouchableOpacity>

</View>
);
}