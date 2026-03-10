import { View, TouchableOpacity, Button, TextInput, Text, Image} from "react-native";
import { router } from "expo-router";


export default function Maps() {
    
    const handleMaps = () => {
        console.log("Maps.");
    };

return (
<View style={{ flex:1, padding: 40,backgroundColor: "#EAF6E8", alignItems: "center", justifyContent: "center"}}>
<Text style={{fontSize: 26,fontFamily: "Inter_600SemiBold", marginBottom: 10, color: "#1b4332",textAlign: "center" }}>Find a professional!</Text>
<Text style={{fontSize: 16, fontFamily: "Inter_400Regular", marginBottom: 25,  color: "#1b4332", textAlign: "center"}}>**Note: must provide access to location</Text>

<Image 
source= {require("../../assets/images/rutgermap.png")}
style={{width: 250, height:250, marginBottom: 50 }}


/>

<TextInput placeholder="Message" style={{width:"100%", backgroundColor: "white", borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 20}}/>

<Button title="Contact" onPress={handleMaps} />
</View>
);
}