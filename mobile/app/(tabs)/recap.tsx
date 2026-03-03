import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

const HomeScreen: React.FC = () => {
  const handlePress = () => {
    Alert.alert("Button Pressed", "Backend call can go here 🚀");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Habitat</Text>

        <Text style={styles.subtitle}>
          A recap of your health and habits this week.
        </Text>
        <Text>
            This week, you were a...
        </Text>
        <Image
          source={require("@/assets/images/android-icon-background.png")}
            style={{ width: "100%", height: 200, marginBottom: 20 }}
        />
        {/* Horizontal, two-rows-per-column grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          <View style={styles.columnsContainer}>
            {/* Build columns of two cards each */}
            {(() => {
              const cards = [
                { title: "Habit Score", text: "You can place dashboard content, stats, or API results here." },
                { title: "Sleep Snapshot", text: "You can place dashboard content, stats, or API results here." },
                { title: "Activity", text: "You can place dashboard content, stats, or API results here." },
                { title: "Nutrition", text: "You can place dashboard content, stats, or API results here." },
                { title: "Mood", text: "You can place dashboard content, stats, or API results here." },
              ];

              const cols: Array<typeof cards> = [];
              for (let i = 0; i < cards.length; i += 2) {
                cols.push(cards.slice(i, i + 2));
              }

              return cols.map((col, idx) => (
                <View style={styles.column} key={idx}>
                  {col.map((c, j) => (
                    <View style={styles.card} key={j}>
                      <Text style={styles.cardTitle}>{c.title}</Text>
                      <Text style={styles.cardText}>{c.text}</Text>
                    </View>
                  ))}
                </View>
              ));
            })()}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Press Me</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: "stretch",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
  },
  horizontalScroll: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  columnsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    width: 300,
    marginRight: 16,
    justifyContent: "space-between",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#444",
  },
  button: {
    backgroundColor: "#3478F6",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});