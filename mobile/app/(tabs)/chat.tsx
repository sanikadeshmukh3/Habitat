import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
};

// hardcoding chat previews until the actual functionality is implemented
const chats: ChatPreview[] = [
  {
    id: "1",
    name: "Alex",
    lastMessage: "Did you finish your workout today?",
    time: "2:41 PM",
  },
  {
    id: "2",
    name: "Maya",
    lastMessage: "Let’s stay consistent this week 💪",
    time: "1:15 PM",
  },
  {
    id: "3",
    name: "Jordan",
    lastMessage: "Proud of your progress!",
    time: "Yesterday",
  },
];

export default function Chat() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require("../../assets/images/leaf.png")}
      style={styles.background}
      imageStyle={{ opacity: 0.08 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Chats</Text>
          <Ionicons name="person-add-outline" size={18} color="green" />
          <Text style={styles.contactsText}>Add from Contacts</Text>

          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chatRow}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/chat-room" as any,
                    params: { name: item.name },
                  })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.friendName}>{item.name}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                  </View>

                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#EAF6E8",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2E6F40",
    marginBottom: 10,
  },
  contactsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B4332", // darker green
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignSelf: "flex-start",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  contactsText: {
    color: "green",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 14,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CDECCD",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2E6F40",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E6F40",
  },
  time: {
    fontSize: 12,
    color: "#6B9080",
  },
  lastMessage: {
    marginTop: 4,
    fontSize: 14,
    color: "#355E3B",
  },
});
