import React, { useRef } from 'react';
import {
    View,
    Text, 
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Animated,
    ImageBackground,
} from 'react-native';

// for now I am hardcoding the habits to get a glimpse of how it would look like
// ALPHA RELEASE - no features

const habits = [
    {id: "1", title: "Fitness Habit", progress: 0.4},
    {id: "2", title: "Nutrition Habit", progress: 0.7},
    {id: "3", title: "Procrastination Habit", progress: 0.2},
];

export default function HomeScreen() {
    const glow = useRef(new Animated.Value(0)).current; // when you click on the switch to go from public to private, it glows for sec

    const triggerGlow = () => {
        Animated.sequence([
            Animated.timing(glow, {
                toValue: 0.6,
                duration: 250,
                useNativeDriver: false,
            }),
            Animated.timing(glow, {
                toValue: 0,
                duration: 700,
                useNativeDriver: false,
            }),
        ]).start();
    };

    return (
        <ImageBackground 
        source={require("../../assets/images/leaf.png")}
        style={styles.background}
        imageStyle={{ opacity: 0.08}} // want the leaves to be a bit transparent on the screen
        >
            <Animated.View
                style={[
                    styles.overlay, 
                    {
                        shadowColor: "#9BE7A0",
                        shadowOpacity: glow,
                        shadowRadius: 40,
                    },
                ]}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.topNav}>
                        <TouchableOpacity onPress={triggerGlow}>
                            <View style={styles.toggle}/>
                        </TouchableOpacity>

                        <Text style={styles.navText}>Calendar</Text>
                        <Text style={styles.navText}>Settings</Text>
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
                            <View style={styles.habitCard}>
                                <Text style={styles.habitTitle}>{item.title}</Text>

                                <View style={styles.progressBackground}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${item.progress * 100}%` },
                                        ]}
                                    />
                                </View>

                                <View style={styles.habitButtons}>
                                    <TouchableOpacity style={styles.smallButton}>
                                        <Text style={styles.buttonText}>Share</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.largeButton}>
                                        <Text style={styles.buttonText}>Modify</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />

                    <Text style={styles.sectionTitle}>Friends</Text>

                    <View style={styles.friendContainer}>
                        <Text style={styles.friendText}>Friend 1</Text>
                        <View style={styles.progressBackground}>
                            <View style={[styles.progressFill, { width: "80%" }]} />
                        </View>
                    </View>

                    <View style={styles.friendContainer}>
                        <Text style={styles.friendText}>Friend 2</Text>
                        <View style={[styles.progressFill, { width: "70%" }]} />
                    </View>

                    <View style={styles.bottomNav}>
                        <TouchableOpacity style={styles.bottomButton}>
                            <Text style={styles.bottomButtonText}>Maps</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bottomButton}>
                            <Text style={styles.bottomButtonText}>Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bottomButton}>
                            <Text style={styles.bottomButtonText}>Wrapped</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </ImageBackground>
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
        padding: 20
    },
    topNav: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    toggle: {
        width: 55,
        height: 28,
        borderRadius: 20,
        backgroundColor: "#A8D5BA",
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
        marginBottom: 10,
        color: "#355E3B",
    },
    habitCard: {
        width: 280,
        backgroundColor: "#2E6F40", // darker eco green
        borderRadius: 16,
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
        borderRadius: 8,
    },
    buttonText: {
        color: "#1B4332",
        fontWeight: "500",
    },
    friendContainer: {
        marginBottom: 15,
    },
    friendText: {
        color: "#355E3B",
        marginBottom: 5,
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 30,
        marginBottom: 40,
    },
    bottomButton: {
        backgroundColor: "#74C69D",
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 14,
    },
    bottomButtonText: {
        color: "white",
        fontWeight: "600",
    },
});

