import api from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";

// for now I am hardcoding the habits to get a glimpse of how it would look like
// ALPHA RELEASE - no features

// the API response model
type DashboardHabit = {
  id: string;
  name: string;
  streak: number;
  //category: string;
};

type Friend = {
  id: string;
  name: string;
  progress: number;
};

const COLORS = {
  forest: "#234B3A",
};

const { width } = Dimensions.get("window");

const CARD_WIDTH = 260;
const SPACING = 20;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;

export default function HomeScreen() {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;

  const [habits, setHabits] = useState<DashboardHabit[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [requests, setRequests] = useState<any[]>([]); // You can type this better later
  const [processingId, setProcessingId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const fetchDashboard = async () => {
        try {
          // Use your 'api' utility instead of 'fetch'
          // This ensures the token from api.ts is ALWAYS used
          const response = await api.get("/dashboard");

          console.log("DASHBOARD DATA:", response.data);

          setHabits(response.data.habits || []);
          setFriends(response.data.friends || []);
          setRequests(response.data.requests || []);
        } catch (err) {
          console.error("Dashboard Fetch Error:", err);
        }
      };

      fetchDashboard();
    }, []),
  );

  // the toggle option when adding a habit
  const toggleMenu = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
    }).start();

    setOpen(!open);
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await api.post("/friend/accept", { requestId });

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      // if (refetchFriends) refetchFriends();
    } catch (err) {
      console.error("Accept error:", err);
      Alert.alert("Error", "Could not accept friend request.");
    }
  };

  const rejectRequest = (requestId: string) => {
    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this friend request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingId(requestId);
              await api.post("/friend/reject", { requestId });
              setProcessingId(null);

              // remove from UI immediately
              setRequests((prev) => prev.filter((r) => r.id !== requestId));
            } catch (err) {
              setProcessingId(null);
              console.error("Reject error:", err);
              Alert.alert("Error", "Could not reject request.");
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <ImageBackground
        source={require("../../assets/images/leaf.png")}
        style={styles.background}
        imageStyle={{ opacity: 0.08 }} // want the leaves to be a bit transparent on the screen
      >
        <View
          style={[
            styles.overlay,
            {
              shadowColor: "#9BE7A0",
              shadowRadius: 40,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          >
            <View style={styles.topNav}>
              <TouchableOpacity
                style={styles.navButton}
                activeOpacity={0.7}
                onPress={() => router.push("/calendar")}
              >
                <Text style={styles.navText}>Calendar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                activeOpacity={0.7}
                onPress={() => router.push("/settings")}
              >
                <Text style={styles.navText}>Settings</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.welcomeRow}>
              <Text style={styles.welcome}>Welcome!</Text>

              <TouchableOpacity
                onPress={() => router.push("/profile")}
                style={styles.profileButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={34}
                  color="#2E6F40"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.pointsLabel}>Current Points</Text>

            <View style={styles.pointsBox}>
              <Text style={styles.points}>112</Text>
            </View>

            <Text style={styles.sectionTitle}>Your Habits</Text>

            <Animated.FlatList
              data={habits}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={{
                paddingHorizontal: (width - CARD_WIDTH) / 2,
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true },
              )}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => {
                const inputRange = [
                  (index - 1) * SNAP_INTERVAL,
                  index * SNAP_INTERVAL,
                  (index + 1) * SNAP_INTERVAL,
                ];

                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.9, 1, 0.9],
                  extrapolate: "clamp",
                });

                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.6, 1, 0.6],
                  extrapolate: "clamp",
                });

                return (
                  <Animated.View
                    style={{
                      width: SNAP_INTERVAL,
                      alignItems: "center",
                      transform: [{ scale }],
                      opacity,
                    }}
                  >
                    <TouchableOpacity
                      style={styles.habitCardNew}
                      activeOpacity={0.9}
                    >
                      {/* overlays */}
                      <View style={styles.cardOverlay} />

                      {/* content */}
                      <Text style={styles.habitTitleNew}>{item.name}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }}
            />

            <View style={styles.fabWrapper}>
              {open && (
                <Animated.View
                  style={[
                    styles.popupContainer,
                    {
                      opacity: animation,
                      transform: [
                        {
                          translateY: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    style={styles.popupButton}
                    onPress={() => router.push("/create-habit-ai")}
                  >
                    <Text style={styles.popupText}>Add a habit with AI</Text>
                  </Pressable>

                  <Pressable
                    style={styles.popupButton}
                    onPress={() => router.push("/create-habit")}
                  >
                    <Text style={styles.popupText}>My Own Habit</Text>
                  </Pressable>
                </Animated.View>
              )}

              <TouchableOpacity style={styles.fab} onPress={toggleMenu}>
                <Text style={styles.fabText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <Text style={styles.sectionTitle2}>Network</Text>
                <TouchableOpacity onPress={() => router.push("/search" as any)}>
                  <Ionicons
                    name="person-add-outline"
                    size={24}
                    color="#2E6F40"
                  />
                </TouchableOpacity>
              </View>

              {/* FORCE TAB BUTTONS TO SHOW */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "friends" && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab("friends")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "friends" && styles.activeTabText,
                    ]}
                  >
                    Friends
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "requests" && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab("requests")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "requests" && styles.activeTabText,
                    ]}
                  >
                    Requests ({requests?.length || 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB CONTENT */}
              {activeTab === "friends" ? (
                <View>
                  {friends && friends.length > 0 ? (
                    friends.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={styles.friendRow}
                        onPress={() =>
                          router.push({
                            pathname: "/friend/[friendId]" as any,
                            params: { friendId: f.id },
                          })
                        }
                      >
                        {/* Avatar */}
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendAvatarText}>
                            {f.name?.charAt(0)?.toUpperCase() || "?"}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.friendName}>{f.name}</Text>

                          {/* Progress bar
      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            { width: `${(f.progress || 0) * 100}%` },
          ]}
        />
      </View> */}
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ textAlign: "center", padding: 20 }}>
                      No friends yet.
                    </Text>
                  )}
                </View>
              ) : (
                <View>
                  {requests && requests.length > 0 ? (
                    requests.map((r) => (
                      <View key={r.id} style={{ marginBottom: 10 }}>
                        <Text style={{ color: "#2E6F40" }}>{r.name}</Text>

                        <View
                          style={{
                            flexDirection: "row",
                            gap: 10,
                            marginTop: 6,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => acceptRequest(r.id)}
                            style={{
                              backgroundColor: "#2E6F40",
                              padding: 6,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: "white" }}>Accept</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => rejectRequest(r.id)}
                            disabled={processingId === r.id}
                            style={{
                              backgroundColor:
                                processingId === r.id ? "#aaa" : "#ccc",
                              padding: 6,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: "#333" }}>
                              {processingId === r.id ? "..." : "Decline"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ textAlign: "center", padding: 20 }}>
                      No requests yet.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </>
  );
}

// CSS and UI - might need to be changed after testing
const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#EAF6E8",
  },
  overlay: {
    flex: 1,
    padding: 20,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#355E3B",
  },
  welcome: {
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
    color: "#2F4F2F",
  },
  pointsLabel: {
    textAlign: "center",
    marginTop: 10,
    color: "#4F7942",
  },
  pointsBox: {
    marginTop: 20,
    alignSelf: "center",
    paddingVertical: 25,
    paddingHorizontal: 40,
    borderRadius: 25,
    backgroundColor: "#2E6F40",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  points: {
    fontSize: 40,
    fontWeight: "700",
    color: "white",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 20,
    color: "#355E3B",
  },
  habitTitleNew: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },

  habitCategory: {
    fontSize: 14,
    color: "#B7E4C7",
    fontWeight: "500",
  },
  habitCard: {
    width: 280,
    backgroundColor: "#2E6F40", // darker eco green
    borderRadius: 18,
    padding: 20,
    marginRight: 15,
  },
  habitCardNew: {
    width: 260,
    height: 180,
    backgroundColor: "#2E6F40",
    borderRadius: 24,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",

    // 🌿 iOS shadow (soft + spread)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,

    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(183, 228, 199, 0.4)",
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 10,
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "35%",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  progressBackground: {
    height: 10,
    backgroundColor: "#4C9A67",
    borderRadius: 6,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#95D5B2",
  },
  habitButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#B7E4C7",
    borderRadius: 8,
  },
  largeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#B7E4C7",
    borderRadius: 10,
  },
  buttonText: {
    color: "#1B4332",
    fontWeight: "500",
  },

  sectionCard: {
    backgroundColor: "#CDECCD",
    borderRadius: 20,
    padding: 25,
    marginTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  sectionTitle2: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4332",
    marginBottom: 15,
  },
  friendContainer: {
    marginBottom: 20,
  },
  friendText: {
    color: "#355E3B",
    marginBottom: 6,
    fontWeight: "500",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
  },

  friendAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#2E6F40",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  friendAvatarText: {
    color: "white",
    fontWeight: "600",
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E6F40",
    marginBottom: 5,
  },
  fabWrapper: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2E6F40",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  fabText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
  },
  popupContainer: {
    marginBottom: 10,
    backgroundColor: "#74C69D",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: 200,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  popupButton: {
    paddingVertical: 10,
  },
  popupText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    width: "85%",
    backgroundColor: "#EAF6E8",
    borderRadius: 24,
    padding: 25,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2E6F40",
    marginBottom: 15,
    textAlign: "center",
  },

  modalDescription: {
    fontSize: 14,
    color: "#355E3B",
    marginBottom: 15,
    textAlign: "center",
  },
  modalProgress: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
    color: "#1B4332",
  },

  closeButton: {
    backgroundColor: "#2E6F40",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  closeText: {
    color: "white",
    fontWeight: "600",
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(46, 111, 64, 0.08)",
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  profileButton: {
    backgroundColor: "rgba(46,111,64,0.08)",
    padding: 6,
    borderRadius: 30,
  },

  addBtn: {
    marginTop: 10,
    backgroundColor: COLORS.forest,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "center",
  },

  addText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(46, 111, 64, 0.15)", // subtle transparent green
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#2E6F40",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E6F40",
  },
  activeTabText: {
    color: "#FFF",
  },
});