import { router } from "expo-router";
import { View, TouchableOpacity, Button, TextInput, Text} from "react-native";

export default function Signup() {
    
    const handleSignup = () => {
        console.log("Signing up.");
    };

return (
<View style={{ flex:1, padding: 40, backgroundColor: "#74c69d"}}>
<Text style={{fontSize: 24, marginBottom: 20, marginTop: 180, color: "#EAF6E8"}}>Habitat</Text>

<TextInput placeholder="First Name" style={{borderWidth: 1, padding: 10, marginBottom: 10}} autoCorrect={false}/>
<TextInput placeholder="Last Name" style={{borderWidth: 1, padding: 10, marginBottom: 10}}  autoCorrect={false}/>
<TextInput placeholder="Email" style={{borderWidth: 1, padding: 10, marginBottom: 10}} autoCapitalize="none" autoCorrect={false}/>
<TextInput placeholder="Password" secureTextEntry style={{borderWidth: 1, padding: 10, marginBottom: 10}} autoCapitalize="none" autoCorrect={false} />
<TextInput placeholder="Re enter Password" secureTextEntry style={{borderWidth: 1, padding: 10, marginBottom: 20}} />

<Button title="Sign up" onPress={handleSignup} />

<TouchableOpacity style={{ marginTop: 20}} onPress={() => router.push("/login")}>
    <Text style={{color: "#EAF6E8"}}>Back</Text>
</TouchableOpacity>

</View>
);
}