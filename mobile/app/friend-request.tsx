import api from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type FriendRequest = {
  id: string; // this is requestId
  sender: {
    id: string;
    username: string;
    firstName: string;
    lastName?: string;
  };
};

export default function FriendRequestScreen() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Load logged-in user
  useEffect(() => {
    const loadUser = async () => {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
    };
    loadUser();
  }, []);

  // Fetch friend requests
  useEffect(() => {
    if (!userId) return;

    const fetchRequests = async () => {
      try {
        const { data } = await api.get(`/friend/requests`, {
          params: { userId }
        });
        
        setRequests(data);
      } catch (err) {
        console.error("Fetch requests error:", err);
        setRequests([]);
      }
    };

    fetchRequests();
  }, [userId]);

  // Accept request
  const acceptRequest = async (requestId: string) => {
    try {
      await fetch(`http://localhost:3000/friend/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      // remove from UI
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  // Render each request
  const renderItem = ({ item }: { item: FriendRequest }) => {
    const name = `${item.sender.firstName} ${item.sender.lastName ?? ""}`;

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.username}>@{item.sender.username}</Text>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => acceptRequest(item.id)}
        >
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friend Requests</Text>

      {requests.length === 0 ? (
        <Text>No requests</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#eee",
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: "600" },
  username: { color: "#666", marginBottom: 10 },
  acceptBtn: { backgroundColor: "green", padding: 8, borderRadius: 8 },
  btnText: { color: "white", fontWeight: "600" },
});