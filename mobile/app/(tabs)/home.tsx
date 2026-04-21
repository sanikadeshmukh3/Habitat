import StackingActivationModal from "@/components/StackingActivationModal";
import StackingEnrollmentModal from "@/components/StackingEnrollmentModal";
import StackingStatusCard from "@/components/StackingStatusCard";
import api from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

type DashboardHabit = {
  id: string;
  name: string;
  streak: number;
};

type Friend = {
  id: string;
  name: string;
  progress: number;
};

// stacking — shape of the activation suggestion returned by /stacking/app-open
type ActivationSuggestion = {
  nextEntryId: string;
  nextHabitName: string;
  completedHabitName: string;
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
  const [requests, setRequests] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [points, setPoints] = useState<number>(0);

  // stacking state
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [triggeringHabitNames, setTriggeringHabitNames] = useState<string[]>([]);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationSuggestion, setActivationSuggestion] = useState<ActivationSuggestion | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const fetchDashboard = async () => {
        try {
          const response = await api.get("/dashboard");

          console.log("DASHBOARD DATA:", response.data);

          setHabits(response.data.habits || []);
          setFriends(response.data.friends || []);
          setRequests(response.data.requests || []);
          setPoints(response.data.user?.points ?? 0);
        } catch (err) {
          console.error("Dashboard Fetch Error:", err);
        }
      };

      // stacking — runs monitoring pipeline and checks proving windows on every focus
      const runAppOpen = async () => {
        try {
          const response = await api.post("/stacking/app-open", {});
          const { enrollmentId, triggerStacking, triggeringHabitNames, activationSuggestion } = response.data;

          setEnrollmentId(enrollmentId ?? null);

          // show enrollment modal only if stacking is triggered and user isn't already enrolled
          if (triggerStacking && !enrollmentId) {
            setTriggeringHabitNames(triggeringHabitNames ?? []);
            setShowEnrollmentModal(true);
          }

          // show activation modal if a habit just cleared its proving window
          if (activationSuggestion) {
            setActivationSuggestion(activationSuggestion);
            setShowActivationModal(true);
          }
        } catch (err) {
          console.error("App open stacking check error:", err);
        }
      };

      fetchDashboard();
      runAppOpen();
    }, []),
  );

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

  // stacking — confirms before opting the user out of their active schedule
  const handleOptOut = () => {
    if (!enrollmentId) return;

    Alert.alert(
      "Opt Out of Habit Stacking",
      "Are you sure? All dormant habits will be reactivated and your current progress will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Opt Out",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/stacking/opt-out", { enrollmentId });
              setEnrollmentId(null);
            } catch (err) {
              console.error("Opt out error:", err);
              Alert.alert("Error", "Could not opt out. Please try again.");
            }
          },
        },
      ],
    );
  };

  return (
    <ImageBackground
      source={require("../../assets/images/leaf.png")}
      style={styles.background}
      imageStyle={{ opacity: 0.08 }}
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
          {/* TOP NAV */}
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

          {/* ── UPDATED: use `points` state instead of hardcoded 112 ── */}
          <View style={styles.pointsBox}>
            <Text style={styles.points}>{points}</Text>
          </View>

          {/* HABITS */}
          <Text style={styles.sectionTitle}>Your Habits</Text>

          <Animated.FlatList
            data={habits}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            snapToOffsets={habits.map((_, i) => i * SNAP_INTERVAL)}
            decelerationRate="fast"
            snapToAlignment="center"
            contentContainerStyle={{
              paddingHorizontal: 20,
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={20}
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
                outputRange: [0.4, 1, 0.4],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  style={{
                    width: CARD_WIDTH,
                   // marginHorizontal: SPACING,
                    alignItems: "center",
                    transform: [{ scale }],
                    opacity,
                  }}
                >
                  <TouchableOpacity
                    style={styles.habitCardNew}
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({
                        pathname: "/habit-detail",
                        params: { id: item.id },
                      })
                    }
                  >
                    <View style={styles.cardOverlay} />
                    <Text style={styles.habitTitleNew}>{item.name}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />

          {/* STACKING STATUS CARD — shown only when user has an active enrollment */}
          {enrollmentId && (
            <StackingStatusCard
              enrollmentId={enrollmentId}
              onOptOut={handleOptOut}
            />
          )}

          {/* FAB */}
          <View style={styles.fabWrapper}>
            {open && (
              <Animated.View style={styles.popupContainer}>
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

          {/* NETWORK CARD — unchanged from your original */}
          <View style={[styles.sectionCard, { height: 300 }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={styles.sectionTitle2}>Network</Text>

              <TouchableOpacity onPress={() => router.push("/search")}>
                <Ionicons name="person-add-outline" size={24} color="#2E6F40" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "friends" && styles.activeTab]}
                onPress={() => setActiveTab("friends")}
              >
                <Text
                  style={[styles.tabText, activeTab === "friends" && styles.activeTabText]}
                >
                  Friends
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "requests" && styles.activeTab]}
                onPress={() => setActiveTab("requests")}
              >
                <Text
                  style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}
                >
                  Requests {requests.length > 0 ? `(${requests.length})` : ""}
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "friends" ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {friends.length === 0 ? (
                  <Text style={{ color: "#355E3B", textAlign: "center", marginTop: 20 }}>
                    No friends yet — search for people to add!
                  </Text>
                ) : (
                  friends.map((f) => (
                    <View key={f.id} style={styles.friendRow}>
                      <View style={styles.friendAvatar}>
                        <Text style={styles.friendAvatarText}>
                          {f.name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.friendName}>{f.name}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {requests.length === 0 ? (
                  <Text style={{ color: "#355E3B", textAlign: "center", marginTop: 20 }}>
                    No pending requests.
                  </Text>
                ) : (
                  requests.map((r) => (
                    <View key={r.id} style={styles.friendRow}>
                      <View style={styles.friendAvatar}>
                        <Text style={styles.friendAvatarText}>
                          {r.senderName?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.friendName, { flex: 1 }]}>{r.senderName}</Text>
                      <TouchableOpacity
                        onPress={() => acceptRequest(r.id)}
                        style={[styles.smallButton, { marginRight: 8 }]}
                      >
                        <Text style={styles.buttonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => rejectRequest(r.id)}
                        style={styles.smallButton}
                      >
                        <Text style={[styles.buttonText, { color: "#FF6B6B" }]}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>

      {/* STACKING ENROLLMENT MODAL — shown when monitoring pipeline triggers stacking */}
      <StackingEnrollmentModal
        visible={showEnrollmentModal}
        triggeringHabitNames={triggeringHabitNames}
        onEnroll={() => {
          setShowEnrollmentModal(false);
          router.push({ pathname: "/habit-ranking" as any, params: { mode: "enroll" } });
        }}
        onDismiss={() => setShowEnrollmentModal(false)}
      />

      {/* STACKING ACTIVATION MODAL — shown when a habit clears its proving window */}
      {activationSuggestion && (
        <StackingActivationModal
          visible={showActivationModal}
          completedHabitName={activationSuggestion.completedHabitName}
          nextHabitName={activationSuggestion.nextHabitName}
          nextEntryId={activationSuggestion.nextEntryId}
          onActivated={() => {
            setShowActivationModal(false);
            setActivationSuggestion(null);
          }}
          onSnoozed={() => {
            setShowActivationModal(false);
            setActivationSuggestion(null);
          }}
        />
      )}
    </ImageBackground>
  );
}

// ── Styles (identical to your original — no visual changes except points) ──────

const styles = StyleSheet.create({
  background:   { flex: 1 },
  overlay:      { flex: 1 },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navText: { fontSize: 14, fontWeight: "600", color: "#355E3B" },
  welcome: { fontSize: 28, fontWeight: "800", color: "#1B4332" },
  pointsLabel: { fontSize: 14, color: "#355E3B", marginTop: 16, fontWeight: "500" },
  pointsBox: {
    backgroundColor: "#2E6F40",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  points: { fontSize: 36, fontWeight: "800", color: "white" },
  sectionTitle: {
    fontSize: 20, fontWeight: "600", marginTop: 30,
    marginBottom: 20, color: "#355E3B",
  },
  habitTitleNew: {
    fontSize: 20, fontWeight: "700", color: "white",
    textAlign: "center", marginBottom: 10,
  },
  habitCardNew: {
    width: CARD_WIDTH,
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
    position: "absolute", top: 0, left: 0, right: 0, height: "50%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  sectionCard: {
    backgroundColor: "#CDECCD", borderRadius: 20, padding: 25,
    marginTop: 18, shadowColor: "#000", shadowOpacity: 0.08,
    shadowRadius: 10, elevation: 4,
  },
  sectionTitle2: {
    fontSize: 18, fontWeight: "700", color: "#1B4332", marginBottom: 15,
  },
  friendRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 12,
    padding: 12, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16,
  },
  friendAvatar: {
    width: 45, height: 45, borderRadius: 22, backgroundColor: "#2E6F40",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  friendAvatarText: { color: "white", fontWeight: "600" },
  friendName: { fontSize: 15, fontWeight: "600", color: "#2E6F40", marginBottom: 5 },
  fabWrapper:     { alignItems: "flex-end", marginTop: 10, marginBottom: 20 },
  fab: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: "#2E6F40",
    justifyContent: "center", alignItems: "center", elevation: 4,
  },
  fabText:        { color: "white", fontSize: 28, fontWeight: "bold" },
  popupContainer: {
    marginBottom: 10, backgroundColor: "#74C69D", borderRadius: 16,
    paddingVertical: 10, paddingHorizontal: 16, width: 200,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  popupButton:    { paddingVertical: 10 },
  popupText:      { color: "white", fontWeight: "600", fontSize: 14 },
  navButton: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: "rgba(46, 111, 64, 0.08)",
  },
  welcomeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  profileButton: {
    backgroundColor: "rgba(46,111,64,0.08)", padding: 6, borderRadius: 30,
  },
  tabContainer: {
    flexDirection: "row", backgroundColor: "rgba(46, 111, 64, 0.15)",
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tab:            { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  activeTab: {
    backgroundColor: "#2E6F40", shadowColor: "#000",
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  tabText:        { fontSize: 14, fontWeight: "600", color: "#2E6F40" },
  activeTabText:  { color: "#FFF" },
  smallButton: {
    paddingVertical: 8, paddingHorizontal: 15,
    backgroundColor: "#B7E4C7", borderRadius: 8,
  },
  buttonText:     { color: "#1B4332", fontWeight: "500" },
  addBtn: {
    marginTop: 10, backgroundColor: COLORS.forest,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, alignSelf: "center",
  },
  addText: { color: "white", fontSize: 14, fontWeight: "600" },
});