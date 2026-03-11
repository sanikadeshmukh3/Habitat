import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ChatRoom() {
  const { name } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat with {name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
});