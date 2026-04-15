// import React, { useState, useEffect } from "react";
// import {
//   View,
//   TextInput,
//   FlatList,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
// } from "react-native";
// import { router } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// export default function SearchScreen() {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState<any[]>([]);
//   const [senderId, setSenderId] = useState<string | null>(null);

//   const [requestedIds, setRequestedIds] = useState(new Set<string>());
//   const [friendsIds, setFriendsIds] = useState(new Set<string>());

//   // 1. Load logged-in user ID
//   useEffect(() => {
//     const loadUserId = async () => {
//       const id = await AsyncStorage.getItem("userId");
//       setSenderId(id);
//     };
//     loadUserId();
//   }, []);

//   const searchUsers = async (text: string) => {
//     setQuery(text);
  
//     if (!text) {
//       setResults([]);
//       return;
//     }
  
//     try {
//       const res = await fetch(
//         `http://10.75.170.31:3000/users/search?query=${encodeURIComponent(text)}`
//       );
  
//       const data = await res.json();
  
//       console.log("SEARCH RESPONSE:", data);
  
//       setResults(Array.isArray(data) ? data : []);
//     } catch (err) {
//       console.error("Search error:", err);
//     }
//   };





// import React, { useState, useEffect } from "react";
// import {
//   View,
//   TextInput,
//   FlatList,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
// } from "react-native";
// import { router } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// export default function SearchScreen() {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState<any[]>([]);
//   const [senderId, setSenderId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   const [requestedIds, setRequestedIds] = useState(new Set<string>());
//   const [friendsIds, setFriendsIds] = useState(new Set<string>());

//   // 1. Load logged-in user ID
//   useEffect(() => {
//     const loadUserId = async () => {
//       const id = await AsyncStorage.getItem("userId");
//       setSenderId(id);
//     };
//     loadUserId();
//   }, []);

//   // 2. "As You Type" Search with Debouncing
//   useEffect(() => {
//     if (!query.trim()) {
//       setResults([]);
//       return;
//     }

//     const cleaned = query.trim().replace(/^@/, "");

//     // Wait 300ms after the user stops typing before fetching
//     const delayDebounceFn = setTimeout(async () => {
//       setLoading(true);
//       try {
//         const res = await fetch(
//           `http://10.75.170.31:3000/users/search?query=${encodeURIComponent(cleaned)}`
//         );

//         // Read the raw text FIRST to catch the "null" issue
//         const rawText = await res.text();
//         console.log("RAW SERVER RESPONSE:", rawText);

//         // If rawText is literal "null" or empty, default to []
//         const data = (rawText && rawText !== "null") ? JSON.parse(rawText) : [];
//         console.log("Parsed Data:", data);

//         setResults(Array.isArray(data) ? data : []);
//       } catch (err) {
//         console.error("Search error:", err);
//         setResults([]); // Guarantee an array on error
//       } finally {
//         setLoading(false);
//       }
//     }, 300);

//     // Cleanup the timeout if the user types again before 300ms is up
//     return () => clearTimeout(delayDebounceFn);
//   }, [query]); // This effect runs every time 'query' changes

//   // ... keep your sendRequest, getButton, renderUserCard, and return() the same ...


//   const sendRequest = async (friendId: string) => {
//     if (!senderId) {
//       console.warn("Sender ID not loaded yet");
//       return;
//     }
//     console.log("Searching for:", friendId);

//     if (friendsIds.has(friendId)) {
//       Alert.alert("Already Friends", "You are already friends with this user.");
//       return;
//     }

//     try {
//       const res = await fetch("http://10.75.170.31:3000/friend/request", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           senderId,
//           friendId,
//         }),
//       });

//       if (!res.ok) throw new Error(`Failed to send friend request: ${res.status}`);

//       setRequestedIds((prev) => new Set(prev).add(friendId));
//     } catch (err) {
//       console.error("Request error:", err);
//       Alert.alert("Error", "Failed to send friend request.");
//     }
//   };



//   const getButton = (item: any) => {
//     if (friendsIds.has(item.id)) {
//       return <Text style={styles.friendText}>Friends</Text>;
//     }

//     if (requestedIds.has(item.id)) {
//       return <Text style={styles.requestedText}>Requested</Text>;
//     }

//     return (
//       <TouchableOpacity
//         style={styles.addBtn}
//         onPress={() => sendRequest(item.id)}
//       >
//         <Text style={styles.addText}>Add</Text>
//       </TouchableOpacity>

      
//     );
//   };

//   const renderUserCard = ({ item }: { item: any }) => {
//     return (
//       <TouchableOpacity
//         style={styles.card}
//         onPress={() =>
//           router.push({
//             pathname: "/friend/[friendId]",
//             params: { friendId: item.id },
//           })
//         }
//       >
//         <View style={styles.avatar}>
//           <Text style={styles.avatarText}>
//             {item.firstName?.charAt(0)?.toUpperCase() || "?"}
//           </Text>
//         </View>

//         <View style={styles.info}>
//           <Text style={styles.name}>
//             {item.firstName} {item.lastName}
//           </Text>
//           <Text style={styles.tag}>@{item.username}</Text>
//         </View>

//         {getButton(item)}
//       </TouchableOpacity>
//     );
//   };

//   const handleSearch = async () => {
//     if (!query.trim()) {
//       setResults([]);
//       return;
//     }
  
//     const cleaned = query.trim().replace(/^@/, "");
  
//     try {
//       const res = await fetch(
//         `http://10.75.170.31:3000/users/search?query=${cleaned}`
//       );
//       const data = await res.json();
  
//       console.log("Results:", data);
//       setResults(Array.isArray(data) ? data : []);
//     } catch (err) {
//       console.error("Search error:", err);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <TextInput
//         placeholder="Search users..."
//         value={query}
//         onChangeText={setQuery}
//         style={styles.input}
//         placeholderTextColor="#6B4F3A"
//         // onSubmitEditing={handleSearch}
//         // returnKeyType="search"
//       />

//     {/* <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
//       <Text style={styles.searchBtnText}>Search</Text>
//     </TouchableOpacity>
//        */}

//       <FlatList
//         data={results}
//         keyExtractor={(item) => item.id}
//         renderItem={renderUserCard}
//         showsVerticalScrollIndicator={false}
//         ListEmptyComponent={
//           query ? <Text style={{ textAlign: "center", marginTop: 20 }}>No results found</Text> : null
//         }
//       />
//     </View>
//   );
// }

// const COLORS = {
//   forest: "#234B3A",
//   moss: "#5F7A61",
//   sage: "#AFC3A2",
//   cream: "#F7F1E8",
//   brown: "#6B4F3A",
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#EAF6E8",
//     padding: 16,
//     paddingTop: 100,
//   },

//   input: {
//     borderWidth: 1,
//     borderColor: "rgba(77,58,45,0.15)",
//     padding: 12,
//     borderRadius: 14,
//     marginBottom: 14,
//     backgroundColor: "rgba(255,255,255,0.8)",
//     color: COLORS.brown,
//   },

//   card: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 14,
//     marginBottom: 12,
//     borderRadius: 18,
//     backgroundColor: "rgba(255,255,255,0.85)",
//     borderWidth: 1,
//     borderColor: "rgba(77,58,45,0.08)",
//   },

//   avatar: {
//     width: 46,
//     height: 46,
//     borderRadius: 23,
//     backgroundColor: COLORS.sage,
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   avatarText: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: COLORS.forest,
//   },

//   info: {
//     flex: 1,
//     marginLeft: 12,
//   },

//   name: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: COLORS.brown,
//   },

//   tag: {
//     fontSize: 13,
//     color: COLORS.moss,
//     marginTop: 2,
//   },

//   addBtn: {
//     backgroundColor: COLORS.forest,
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: 999,
//   },

//   addText: {
//     color: "white",
//     fontSize: 13,
//   },

//   requestedText: {
//     color: "#888",
//     fontSize: 13,
//   },

//   friendText: {
//     color: COLORS.moss,
//     fontSize: 13,
//     fontWeight: "600",
//   },

//   searchBtn: {
//     backgroundColor: COLORS.moss,
//     padding: 10,
//     borderRadius: 10,
//     alignItems: "center",
//     marginBottom: 12,
//   },
  
//   searchBtnText: {
//     color: "white",
//     fontWeight: "600",
//   },
// });


import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/lib/api";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [senderId, setSenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const filteredResults = results.filter(user => user.id !== senderId);

  // We only need this to update the UI instantly when they click "Add"
  const [requestedIds, setRequestedIds] = useState(new Set<string>());

  // 1. Load logged-in user ID
  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem("userId");
      console.log("DEBUG: Loaded senderId from storage:", id);
      setSenderId(id);
    };
    loadUserId();
  }, []);

// 2. "As You Type" Search with Debouncing
useEffect(() => {
  console.log(`[Search triggered] Query: "${query}", SenderId: ${senderId}`);

  if (!query.trim()) {
    setResults([]);
    return;
  }

  if (!senderId) {
    console.warn("WARNING: senderId is null! The search will still run, but friendship status won't work.");
    // Removed the 'return;' here so the search still works even if the ID is missing!
  }

  const cleaned = query.trim().replace(/^@/, "");

  const delayDebounceFn = setTimeout(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/search", {
        params: {
          query: cleaned,
          userId: senderId || "",
        },
      });
  
      console.log("SERVER RESPONSE:", res.data);
      setResults(Array.isArray(res.data) ? res.data : []);
      
    } catch (err) {
      console.error("Search fetch error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  return () => clearTimeout(delayDebounceFn);
}, [query, senderId]); 

const sendRequest = async (friendId: string) => {
  if (!senderId) {
    Alert.alert("Error", "User not loaded yet. Try again.");
    return;
  }
  // Don't let the user add themselves
  if (senderId === friendId) {
    Alert.alert("Wait", "You cannot add yourself as a friend.");
    return;
  }

  try {
    // api.post(url, data)
    await api.post("/friend/request", {
      senderId,
      friendId,
    });
    setRequestedIds((prev) => new Set(prev).add(friendId));
    
  } catch (err) {
    console.error("Request error:", err);
    Alert.alert("Error", "Failed to send friend request.");
  }
};

  // const getButton = (item: any) => {
  //   // Check the flag provided by the backend!
  //   if (item.isFriend) {
  //     return <Text style={styles.friendText}>Friends</Text>;
  //   }

  //   // Check backend flag OR if they just clicked it right now
  //   if (item.isRequested || requestedIds.has(item.id)) {
  //     return <Text style={styles.requestedText}>Requested</Text>;
  //   }

  //   return (
  //     <TouchableOpacity
  //       style={styles.addBtn}
  //       onPress={() => sendRequest(item.id)}
  //     >
  //       <Text style={styles.addText}>Add</Text>
  //     </TouchableOpacity>
  //   );
  // };

  const getButton = (item: any) => {
    // Add console log here to see what 'item' actually contains
    // console.log("User Item:", item);
  
    if (item.isFriend || item.areFriends) {
      return <Text style={styles.friendText}>Friends</Text>;
    }
  
    // Check for various possible backend naming conventions
    const isPending = item.isRequested || item.pending || item.hasRequest;
    
    if (isPending || requestedIds.has(item.id)) {
      return <Text style={styles.requestedText}>Requested</Text>;
    }
  
    return (
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => sendRequest(item.id)}
      >
        <Text style={styles.addText}>Add</Text>
      </TouchableOpacity>
    );
  };

  const renderUserCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/friend/[friendId]" as any,
            params: { friendId: item.id },
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.tag}>@{item.username}</Text>
        </View>

        {getButton(item)}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search users..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        placeholderTextColor="#6B4F3A"
      />

      {loading && <ActivityIndicator size="small" color="#5F7A61" style={{ marginBottom: 10 }} />}

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        renderItem={renderUserCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          (query && !loading) ? <Text style={{ textAlign: "center", marginTop: 20 }}>No results found</Text> : null
        }
      />
    </View>
  );
}

const COLORS = {
  forest: "#234B3A",
  moss: "#5F7A61",
  sage: "#AFC3A2",
  cream: "#F7F1E8",
  brown: "#6B4F3A",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF6E8",
    padding: 16,
    paddingTop: 100,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(77,58,45,0.15)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.8)",
    color: COLORS.brown,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(77,58,45,0.08)",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.forest,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.brown,
  },
  tag: {
    fontSize: 13,
    color: COLORS.moss,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.forest,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  addText: {
    color: "white",
    fontSize: 13,
  },
  requestedText: {
    color: "#888",
    fontSize: 13,
  },
  friendText: {
    color: COLORS.moss,
    fontSize: 13,
    fontWeight: "600",
  },
});