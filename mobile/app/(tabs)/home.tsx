import StackingActivationModal from "@/components/StackingActivationModal";
import StackingEnrollmentModal from "@/components/StackingEnrollmentModal";
import StackingStatusCard from "@/components/StackingStatusCard";
import { FontSize, Radius, Spacing, useTheme } from "@/constants/theme";
import api from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
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

// Types
type DashboardHabit = {
  id:             string;
  name:           string;
  streak:         number;
  category:       string;
  frequency:      string;
  completionRate: number;
};

type Friend = {
  id:       string;
  name:     string;
  progress: number;
};

// habit stacking — shape of the activation suggestion returned by /stacking/app-open
type ActivationSuggestion = {
  nextEntryId:        string;
  nextHabitName:      string;
  completedHabitName: string;
};

// maps each category to an Ionicons icon
const CATEGORY_ICONS: Record<string, string> = {
  FITNESS:      "barbell",
  NUTRITION:    "nutrition",
  SLEEP:        "moon",
  PRODUCTIVITY: "book",
  WELLNESS:     "body",
  OTHER:        "star",
};

// fixes text casing - capitalizes first letter only
const formatLabel = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// Layout constants
const { width } = Dimensions.get("window");

const CARD_WIDTH    = 260;
const SPACING       = 20;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;

// Screen
export default function HomeScreen() {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;

  const [habits,       setHabits]       = useState<DashboardHabit[]>([]);
  const [friends,      setFriends]      = useState<Friend[]>([]);
  const [activeTab,    setActiveTab]    = useState<"friends" | "requests">("friends");
  const [requests,     setRequests]     = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [points,       setPoints]       = useState<number>(0);

  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  // habit stacking state
  const [enrollmentId,         setEnrollmentId]         = useState<string | null>(null);
  const [showEnrollmentModal,  setShowEnrollmentModal]  = useState(false);
  const [triggeringHabitNames, setTriggeringHabitNames] = useState<string[]>([]);
  const [showActivationModal,  setShowActivationModal]  = useState(false);
  const [activationSuggestion, setActivationSuggestion] = useState<ActivationSuggestion | null>(null);

  // Data fetching
  useFocusEffect(
    React.useCallback(() => {
      const fetchDashboard = async () => {
        try {
          const response = await api.get("/dashboard");
          console.log("DASHBOARD DATA:", response.data);
          setHabits(response.data.habits   || []);
          setFriends(response.data.friends || []);
          setRequests(response.data.requests || []);
          setPoints(response.data.user?.points ?? 0);
        } catch (err) {
          console.error("Dashboard Fetch Error:", err);
        }
      };

      // habit stacking — runs monitoring pipeline and checks proving windows on every focus
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

  // Handlers
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

  // habit stacking — confirms before opting the user out of their active schedule
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

  // Render
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
            shadowColor: Colors.lightGreen,
            shadowRadius: Radius.xl,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
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
                color={Colors.primaryGreen}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.pointsLabel}>Current Points</Text>
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
            contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
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

              const iconName   = CATEGORY_ICONS[item.category] ?? "star-outline";
              const streakUnit = item.frequency === "WEEKLY" ? "weeks" : "days";
              const pct        = Math.round((item.completionRate ?? 0) * 100);

              return (
                <Animated.View
                  style={{
                    width: CARD_WIDTH,
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
                    {/* TOP: icon + name + pills */}
                    <View style={styles.cardTop}>
                      <View style={styles.iconBadge}>
                        <Ionicons name={iconName as any} size={22} color={Colors.primaryGreen} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.habitTitleNew} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.pillRow}>
                          <View style={styles.pill}>
                            <Text style={styles.pillText}>
                              {formatLabel(item.category)}
                            </Text>
                          </View>
                          <View style={styles.pill}>
                            <Text style={styles.pillText}>
                              {formatLabel(item.frequency)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* BOTTOM: darker inset — streak + completion */}
                    <View style={styles.cardStats}>
                      <View>
                        <Text style={styles.statsLabel}>Current Streak</Text>
                        <Text style={styles.streakNumber}>
                          {item.streak}
                          <Text style={styles.streakUnit}> {streakUnit}</Text>
                        </Text>
                      </View>

                      <View style={styles.completionBlock}>
                        <Text style={styles.completionPct}>{pct}%</Text>
                        <Text style={styles.completionLabel}>All-Time</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />

          {/* HABIT STACKING STATUS CARD — shown only when user has an active enrollment */}
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

          {/* NETWORK CARD */}
          <View style={[styles.sectionCard, { height: 300 }]}>
            {/* HEADER */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: Spacing.ms,
              }}
            >
              <Text style={styles.sectionTitle2}>Network</Text>

              <TouchableOpacity onPress={() => router.push("/search")}>
                <Ionicons name="person-add-outline" size={24} color={Colors.primaryGreen} />
              </TouchableOpacity>
            </View>

            {/* TABS */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "friends" && styles.activeTab]}
                onPress={() => setActiveTab("friends")}
              >
                <Text style={[styles.tabText, activeTab === "friends" && styles.activeTabText]}>
                  Friends
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === "requests" && styles.activeTab]}
                onPress={() => setActiveTab("requests")}
              >
                <Text style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}>
                  Requests ({requests?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* SCROLLABLE LIST AREA */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: Spacing.sm }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {(activeTab === "friends" ? friends : requests).length === 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    padding: Spacing.lg,
                    fontSize: FontSize.lg,
                    color: Colors.primaryGreen,
                  }}
                >
                  {activeTab === "friends" ? "No friends yet." : "No requests yet."}
                </Text>
              ) : (
                (activeTab === "friends" ? friends : requests).map((item) =>
                  activeTab === "friends" ? (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.friendRow}
                      onPress={() =>
                        router.push({
                          pathname: "/friend/[friendId]",
                          params: { friendId: item.id },
                        })
                      }
                    >
                      <View style={styles.friendAvatar}>
                        <Text style={styles.friendAvatarText}>
                          {item.name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                      <Text style={styles.friendName}>{item.name}</Text>
                    </TouchableOpacity>
                  ) : (
<View key={item.id} style={styles.requestCard}>
  <View style={styles.requestTopRow}>
    <View style={styles.friendAvatar}>
      <Text style={styles.friendAvatarText}>
        {item.name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>

    <Text style={styles.friendName}>{item.name}</Text>
  </View>

  <View style={styles.requestActions}>
    <TouchableOpacity
      onPress={() => acceptRequest(item.id)}
      style={styles.acceptBtn}
    >
      <Text style={styles.acceptText}>Accept</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => rejectRequest(item.id)}
      disabled={processingId === item.id}
      style={[
        styles.declineBtn,
        processingId === item.id && { opacity: 0.6 }
      ]}
    >
      <Text style={styles.declineText}>
        {processingId === item.id ? "..." : "Decline"}
      </Text>
    </TouchableOpacity>
  </View>
</View>
                  ),
                )
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* HABIT STACKING ENROLLMENT MODAL — shown when monitoring pipeline triggers stacking */}
      <StackingEnrollmentModal
        visible={showEnrollmentModal}
        triggeringHabitNames={triggeringHabitNames}
        onEnroll={() => {
          setShowEnrollmentModal(false);
          router.push({ pathname: "/habit-ranking" as any, params: { mode: "enroll" } });
        }}
        onDismiss={() => setShowEnrollmentModal(false)}
      />

      {/* HABIT STACKING ACTIVATION MODAL — shown when a habit clears its proving window */}
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

// Styles
const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) =>
  StyleSheet.create({
    background: {
      flex: 1,
      backgroundColor: Colors.pageBg,
    },
    overlay: {
      flex: 1,
      padding: Spacing.md,
    },
    topNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    navText: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: Colors.primaryGreen,
    },
    welcome: {
      fontSize: FontSize.xxl,
      fontWeight: "600",
      textAlign: "center",
      color: Colors.primaryGreen,
    },
    pointsLabel: {
      textAlign: "center",
      marginTop: Spacing.sm,
      color: Colors.midGreen,
    },
    pointsBox: {
      marginTop: Spacing.md,
      alignSelf: "center",
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: Radius.lg,
      backgroundColor: Colors.primaryGreen,
      shadowColor: Colors.overlay,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    points: {
      fontSize: FontSize.big,
      fontWeight: "700",
      color: Colors.white,
    },
    sectionTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
      color: Colors.primaryGreen,
    },

    // habit card
    habitCardNew: {
      width: CARD_WIDTH,
      height: 160,
      backgroundColor: Colors.primaryGreen,
      borderRadius: Radius.lg,
      overflow: "hidden",
      justifyContent: "space-between",
      shadowColor: Colors.overlay,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: Spacing.ms,
      borderWidth: 1,
      borderColor: Colors.border,
    },

    // top section — holds icon + name + pills
    cardTop: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: Radius.sm,
      backgroundColor: Colors.paleGreen,
      justifyContent: "center",
      alignItems: "center",
    },
    habitTitleNew: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: Colors.white,
      marginBottom: Spacing.xs,
    },
    pillRow: {
      flexDirection: "row",
      gap: Spacing.xs,
    },
    pill: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    pillText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: FontSize.xs,
      fontWeight: "500",
    },

    // bottom section — darker inset, holds streak + completion
    cardStats: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(0,0,0,0.22)",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomLeftRadius: Radius.lg,
      borderBottomRightRadius: Radius.lg,
    },
    statsLabel: {
      color: "rgba(255,255,255,0.65)",
      fontSize: FontSize.xs,
      marginBottom: 2,
    },
    streakNumber: {
      color: Colors.white,
      fontSize: FontSize.lg,
      fontWeight: "700",
    },
    streakUnit: {
      fontSize: FontSize.xs,
      fontWeight: "400",
      color: "rgba(255,255,255,0.75)",
    },
    completionBlock: {
      alignItems: "center",
    },
    completionPct: {
      color: Colors.white,
      fontSize: FontSize.lg,
      fontWeight: "700",
    },
    completionLabel: {
      color: "rgba(255,255,255,0.55)",
      fontSize: FontSize.xs,
    },

    habitTitleOld: {
      fontSize: FontSize.lg,
      fontWeight: "700",
      color: Colors.white,
      textAlign: "center",
      marginBottom: Spacing.sm,
    },
    habitCategory: {
      fontSize: FontSize.sm,
      color: Colors.lightGreen,
      fontWeight: "500",
    },
    habitCard: {
      width: 280,
      backgroundColor: Colors.primaryGreen,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginRight: Spacing.sm,
    },
    habitTitle: {
      fontSize: FontSize.lg,
      fontWeight: "600",
      color: Colors.white,
      marginBottom: Spacing.sm,
    },
    cardOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "50%",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
    },
    bottomOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "35%",
      backgroundColor: "rgba(0,0,0,0.15)",
      borderBottomLeftRadius: Radius.lg,
      borderBottomRightRadius: Radius.lg,
    },
    progressBackground: {
      height: 10,
      backgroundColor: Colors.midGreen,
      borderRadius: Radius.sm,
      overflow: "hidden",
      marginVertical: Spacing.sm,
    },
    progressFill: {
      height: "100%",
      backgroundColor: Colors.lightGreen,
    },
    habitButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: Spacing.sm,
    },
    smallButton: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      backgroundColor: Colors.lightGreen,
      borderRadius: Radius.sm,
    },
    largeButton: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      backgroundColor: Colors.lightGreen,
      borderRadius: Radius.md,
    },
    buttonText: {
      color: Colors.darkBrown,
      fontWeight: "500",
    },

    // Network card
    sectionCard: {
      backgroundColor: Colors.paleGreen,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginTop: Spacing.md,
      shadowColor: Colors.overlay,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    sectionTitle2: {
      fontSize: FontSize.lg,
      fontWeight: "700",
      color: Colors.darkBrown,
      marginBottom: Spacing.sm,
    },
    friendContainer: {
      marginBottom: Spacing.md,
    },
    friendText: {
      color: Colors.primaryGreen,
      marginBottom: Spacing.xs,
      fontWeight: "500",
    },
    friendRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: Spacing.sm,
      padding: Spacing.sm,
      backgroundColor: Colors.pageBg,
      borderRadius: Radius.md,
    },
    friendAvatar: {
      width: 45,
      height: 45,
      borderRadius: Radius.full,
      backgroundColor: Colors.primaryGreen,
      justifyContent: "center",
      alignItems: "center",
      marginRight: Spacing.sm,
    },
    friendAvatarText: {
      color: Colors.white,
      fontWeight: "600",
    },
    friendName: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: Colors.primaryGreen,
      marginBottom: Spacing.xs,
    },

    // FAB
    fabWrapper: {
      alignItems: "flex-end",
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
    },
    fab: {
      width: 60,
      height: 60,
      borderRadius: Radius.full,
      backgroundColor: Colors.primaryGreen,
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
    },
    fabText: {
      color: Colors.white,
      fontSize: FontSize.xxl,
      fontWeight: "bold",
    },
    popupContainer: {
      marginBottom: Spacing.sm,
      backgroundColor: Colors.lightGreen,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      width: 200,
      shadowColor: Colors.overlay,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    popupButton: {
      paddingVertical: Spacing.sm,
    },
    popupText: {
      color: Colors.white,
      fontWeight: "600",
      fontSize: FontSize.sm,
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: Colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "85%",
      backgroundColor: Colors.pageBg,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      elevation: 10,
    },
    modalTitle: {
      fontSize: FontSize.xl,
      fontWeight: "600",
      color: Colors.primaryGreen,
      marginBottom: Spacing.sm,
      textAlign: "center",
    },
    modalDescription: {
      fontSize: FontSize.sm,
      color: Colors.primaryGreen,
      marginBottom: Spacing.sm,
      textAlign: "center",
    },
    modalProgress: {
      fontSize: FontSize.md,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: Spacing.md,
      color: Colors.darkBrown,
    },
    closeButton: {
      backgroundColor: Colors.primaryGreen,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      alignItems: "center",
    },
    closeText: {
      color: Colors.white,
      fontWeight: "600",
    },

    // Nav
    navButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: "rgba(46, 111, 64, 0.08)",
    },
    welcomeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    profileButton: {
      backgroundColor: "rgba(46,111,64,0.08)",
      padding: Spacing.xs,
      borderRadius: Radius.full,
    },
    addBtn: {
      marginTop: Spacing.sm,
      backgroundColor: Colors.darkBrown,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      alignSelf: "center",
    },
    addText: {
      color: Colors.darkBrown,
      fontSize: FontSize.sm,
      fontWeight: "600",
    },

    // Tabs
    tabContainer: {
      flexDirection: "row",
      backgroundColor: "rgba(46, 111, 64, 0.15)",
      borderRadius: Radius.md,
      padding: Spacing.xs,
      marginBottom: Spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: Spacing.xs,
      alignItems: "center",
      borderRadius: Radius.sm,
    },
    activeTab: {
      backgroundColor: Colors.primaryGreen,
      shadowColor: Colors.overlay,
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabText: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: Colors.primaryGreen,
    },
    activeTabText: {
      color: Colors.white,
    },

    requestCard: {
      backgroundColor: Colors.pageBg,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    
    requestTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    
    requestActions: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      marginLeft: 55,
    },
    
    acceptBtn: {
      flex: 1,
      backgroundColor: Colors.primaryGreen,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      alignItems: "center",
    },
    
    acceptText: {
      color: Colors.white,
      fontWeight: "600",
    },
    
    declineBtn: {
      flex: 1,
      backgroundColor: Colors.lightBrown,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      alignItems: "center",
    },
    
    declineText: {
      color: Colors.darkBrown,
      fontWeight: "600",
    },
  });