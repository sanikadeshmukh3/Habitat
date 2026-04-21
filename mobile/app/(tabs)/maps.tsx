import { View, TouchableOpacity, TextInput, Text, Image, StyleSheet } from "react-native";

export default function Maps() {
  const handleMaps = () => {
    // This won't trigger while the overlay is active
    console.log("Maps.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a professional!</Text>
      <Text style={styles.subtitle}>**Note: must provide access to location</Text>

      <Image
        source={require("../../assets/images/rutgermap.png")}
        style={styles.mapImage}
      />

      {/* WRAPPER FOR DISABLED SECTION */}
      <View style={styles.disabledSection}>
        {/* PointerEvents="none" makes everything inside unclickable */}
        <View style={{ width: "100%", opacity: 0.4 }} pointerEvents="none">
          <TextInput
            editable={false}
            placeholder="Message"
            style={styles.input}
          />

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Contact</Text>
          </TouchableOpacity>
        </View>

        {/* PROFESSIONAL OVERLAY */}
        <View style={styles.overlay}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMING SOON</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
    backgroundColor: "#EAF6E8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600", // Using fontWeight since I don't have your font files
    marginBottom: 10,
    color: "#1b4332",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 25,
    color: "#4F7942",
    textAlign: "center",
  },
  mapImage: {
    width: 250,
    height: 250,
    marginBottom: 50,
    borderRadius: 20, // Optional: makes the map look a bit more modern
  },
  disabledSection: {
    width: "100%",
    position: "relative",
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#2d6a4f",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(234, 246, 232, 0.5)", // Matches background color with transparency
    borderRadius: 12,
  },
  badge: {
    backgroundColor: "#1b4332",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 99,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});