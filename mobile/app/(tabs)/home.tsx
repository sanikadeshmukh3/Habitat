import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Modal } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Pressable,
  Animated,
  ImageBackground,
} from "react-native";

// for now I am hardcoding the habits to get a glimpse of how it would look like
// ALPHA RELEASE - no features

type Habit = {
  id: string;
  title: string;
  progress: number;
};

const habits: Habit[] = [
  { id: "1", title: "Fitness Habit", progress: 0.4 },
  { id: "2", title: "Nutrition Habit", progress: 0.7 },
  { id: "3", title: "Procrastination Habit", progress: 0.2 },
];

export default function HomeScreen() {
  const [open, setOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const animation = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // the toggle option when adding a habit
  const toggleMenu = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
    }).start();

    setOpen(!open);
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
              <TouchableOpacity onPress={() => router.push("/calendar")}>
                <Text style={styles.navText}>Calendar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/settings")}>
                <Text style={styles.navText}>Settings</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.welcome}>Welcome!</Text>
            <Text style={styles.pointsLabel}>Current Points</Text>

            <View style={styles.pointsBox}>
              <Text style={styles.points}>112</Text>
            </View>

            <Text style={styles.sectionTitle}>Your Habits</Text>

            <FlatList
              data={habits}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedHabit(item)}
                  style={styles.habitCard}
                >
                  <Text style={styles.habitTitle}>{item.title}</Text>

                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${item.progress * 100}%` },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}
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

            <Text style={styles.sectionTitle}>Friends</Text>

            <View style={styles.friendContainer}>
              <Text style={styles.friendText}>Friend 1</Text>
              <View style={styles.progressBackground}>
                <View style={[styles.progressFill, { width: "80%" }]} />
              </View>
            </View>

            <View style={styles.friendContainer}>
              <Text style={styles.friendText}>Friend 2</Text>
              <View style={styles.progressBackground}>
                <View style={[styles.progressFill, { width: "70%" }]} />
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      <Modal visible={selectedHabit !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedHabit?.title}</Text>

            <Text style={styles.modalDescription}>
              This habit helps improve consistency and personal growth.
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedHabit(null)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginTop: 15,
    alignSelf: "center",
    padding: 30,
    borderRadius: 14,
    backgroundColor: "#CDECCD",
  },
  points: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#2F4F2F",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 20,
    color: "#355E3B",
  },
  habitCard: {
    width: 280,
    backgroundColor: "#2E6F40", // darker eco green
    borderRadius: 18,
    padding: 20,
    marginRight: 15,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 10,
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
    backgroundColor: "#B7E4C7",
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
  friendContainer: {
    marginBottom: 20,
  },
  friendText: {
    color: "#355E3B",
    marginBottom: 6,
    fontWeight: "500",
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
});
