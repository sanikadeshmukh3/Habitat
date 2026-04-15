import { Colors, FontSize, Radius, Spacing } from '@/constants/oldtheme';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    FlatList,
    ImageBackground,
    Modal,
    Animated,
    Dimensions,
    Platform,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import api from '@/lib/api';

type FriendType = {
    id: string;
    username: string;
    firstName: string;
    lastName?: string;
    habit: {
      id: string;
      name: string;
      habitCategory: string;
      currentStreak: number;
      visibility: boolean;
    }[];
  };
  



// hardcoded friend data for now - will be replaced with real data from backend in the future
// const friend = {
    
//     displayName: 'Sample Friend',
//     publicTag: `@${user.username}`,
//     points: 110,
//     habit: [
//         {
//             id: '1',
//             name: 'Drink Water',
//             category: 'Health',
//             currentStreak: 12,
//             isPublic: true,
//         },
//         {
//             id: '2',
//             name: 'Morning Walk',
//             category: 'Fitness',
//             currentStreak: 8,
//             isPublic: true,
//         },
//         {
//             id: '3',
//             name: 'Brush Teeth',
//             category: 'Personal',
//             currentStreak: 5,
//             isPublic: false,
//         },
//         {
//             id: '4',
//             name: 'Stay Off TikTok',
//             category: 'Procrastination',
//             currentStreak: 14,
//             isPublic: true,
//         },
//     ],
// };

type PublicHabit = {
    id: string;
    name: string;
    category: string;
    currentStreak: number;
    isPublic: boolean;
};

type FriendHabitCard = {
    id: string;
    title: string;
    subtitle?: string;
    accent?: string;
    body: React.ReactNode;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_SPACING = 14;
const SIDE_SPACER = 18;

const COLORS = {
    forest: '#234B3A',
    moss: '#5F7A61',
    sage: '#AFC3A2',
    cream: '#F7F1E8',
    tan: '#D9C2A3',
    brown: '#6B4F3A',
    bark: '#4D3A2D',
    softWhite: 'rgba(255,255,255,0.82)',
    glass: 'rgba(255,255,255,0.72)',
    chip: 'rgba(255,255,255,0.68)',
};

const FONTS = {
    title: Platform.select({ ios: 'Georgia', android: 'serif' }),
    body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif' }),
    bodyBold: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
};

function AvatarBlock({ name }: { name: string }) {
    const initial = name?.charAt(0)?.toUpperCase() ?? '?';

    return (
        <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initial}</Text>
        </View>

        <Text style={styles.avatarName}>{name}</Text>
        </View>
    );
}

function FriendHabitCardView({
    card,
    index,
    scrollX,
}: {
    card: FriendHabitCard;
    index: number;
    scrollX: Animated.Value;
}) {
    const inputRange = [
        (index - 1) * (CARD_WIDTH + CARD_SPACING),
        index * (CARD_WIDTH + CARD_SPACING),
        (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.92, 1, 0.92],
        extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [10, 0, 10],
        extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.72, 1, 0.72],
        extrapolate: 'clamp',
    });

    return (
        <Animated.View
        style={[
            styles.snapshotCard,
            {
            transform: [{ scale }, { translateY }],
            opacity,
            },
        ]}
        >
        <View style={styles.snapshotHeader}>
            <Text style={styles.snapshotTitle}>{card.title}</Text>
            {!!card.subtitle && <Text style={styles.snapshotSubtitle}>{card.subtitle}</Text>}
        </View>

        <View style={[styles.snapshotAccent, { backgroundColor: card.accent ?? COLORS.moss }]} />

        <View style={styles.snapshotBody}>{card.body}</View>
        </Animated.View>
    );
}

function HabitStatsBlock({ habitName, streak }: { habitName: string; streak: number }) {
    return (
        <View style={styles.habitMiniBlock}>
        <View style={styles.habitMiniTextWrap}>
            <Text style={styles.habitMiniName}>{habitName}</Text>
            <Text style={styles.habitMiniLabel}>public habit</Text>
        </View>

        <View style={styles.habitMiniRight}>
            <Text style={styles.habitMiniStreak}>{streak}</Text>
            <Text style={styles.habitMiniLabel}>day streak</Text>
        </View>
        </View>
    );
}



export default function FriendScreen() {
    const scrollX = useRef(new Animated.Value(0)).current;
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [friend, setFriend] = useState<FriendType | null>(null);
    const [status, setStatus] = useState<"none" | "requested" | "friends">("none");
    const params = useLocalSearchParams();
    const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId;

    console.log("Friend ID:", friendId);

    // useEffect(() => {
    //     if (!friendId) return;
      
    //     const fetchFriend = async () => {
    //       try {
    //         const res = await fetch(`http://10.75.170.31:10000/users/${friendId}`); // 🔹 full URL
    //         if (!res.ok) throw new Error('Failed to fetch friend');
      
    //         const data = await res.json();
    //         setFriend(data);
    //       } catch (err) {
    //         console.error("Friend fetch error:", err);
    //       }
    //     };
      
    //     fetchFriend();
    //   }, [friendId]);

    const [senderId, setSenderId] = useState<string | null>(null);

    // 1. Load logged-in user ID once
    useEffect(() => {
      const loadUser = async () => {
        try {
          const id = await AsyncStorage.getItem("userId");
          console.log("Profile Screen - Loaded senderId:", id);
          setSenderId(id);
        } catch (e) {
          console.error("Failed to load userId", e);
        }
      };
    
      loadUser();
    }, []);
    
    
    // 2. Fetch friend data
    useEffect(() => {
      if (!friendId) return;
    
      const fetchFriend = async () => {
        try {
          const { data } = await api.get(`/users/${friendId}`);
          
          console.log("Fetched friend:", data);
      
          const mappedFriend: FriendType = {
            id: data.id,
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
            habit: data.habit.map((h: any) => ({
              id: h.id,
              name: h.name,
              habitCategory: h.category ?? h.habitCategory,
              currentStreak: h.currentStreak,
              visibility: h.isPublic ?? h.visibility,
            })),
          };
      
          setFriend(mappedFriend);
        } catch (err) {
          console.error("Friend fetch error:", err);
        }
      };
    
      fetchFriend();
    }, [friendId]);
    
    
    useEffect(() => {
      if (!friendId || !senderId) return;
    
      const fetchStatus = async () => {
        try {
          const { data } = await api.get('/friend/status', {
            params: {
              userId: senderId,
              friendId: friendId,
            },
          });
    
          console.log("Friend status:", data.status);
          setStatus(data.status);
        } catch (err) {
          console.error("Status fetch error:", err);
        }
      };
    
      fetchStatus();
    }, [friendId, senderId]);
    
    
    

    //   const sendRequest = async () => {
    //     try {
    //       await fetch("/friends/request", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({
    //           senderId: "TEMP_USER_ID", // replace later
    //           friendId,
    //         }),
    //       });
      
    //       setStatus("requested");
    //     } catch (err) {
    //       console.error(err);
    //     }
    //   };

    const sendRequest = async (targetFriendId?: string) => {
        if (!senderId) {
          console.warn("Sender ID not loaded yet");
          return;
        }
      
        const idToSend = targetFriendId ?? friendId;
      
        try {
          const { data } = await api.post("/friend/request", {
            senderId,
            friendId: idToSend,
          });
        
          console.log("Friend request sent:", data);
        
          if (!targetFriendId) {
            setStatus("requested"); // only update main profile button
          }
        } catch (err: any) {
          console.error("Friend request error:", err);
        
          const errorMessage = err.response?.data?.error || "Failed to send friend request";
          alert(errorMessage);
        }
      };

      const renderFriendButton = () => {
        // senderId not ready yet
        if (!senderId) {
          return (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#ccc' }]} disabled>
              <Text style={styles.addText}>Add Friend</Text>
            </TouchableOpacity>
          );
        }
      
        // already friends
        if (status === "friends") {
          return (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#aaa' }]} disabled>
              <Text style={styles.addText}>Friends</Text>
            </TouchableOpacity>
          );
        }
      
        // request already sent
        if (status === "requested") {
          return (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#888' }]} disabled>
              <Text style={styles.addText}>Requested</Text>
            </TouchableOpacity>
          );
        }
      
        // can send friend request
        return (
          <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest()}>
            <Text style={styles.addText}>Add Friend</Text>
          </TouchableOpacity>
        );
      };
      
    //   if (!friend) {
    //     return <Text>Loading...</Text>;
    //   }

      const displayName = `${friend?.firstName ?? ""} ${friend?.lastName ?? ""}`;
      const publicTag = friend ? `@${friend.username}`: "";
      const points = 0; // temp

      const publicHabits = useMemo(
        () =>
          friend?.habit
            ?.filter((h) => h.visibility)
            .map((h) => ({
              id: h.id,
              name: h.name,
              category: h.habitCategory,
              currentStreak: h.currentStreak,
              isPublic: h.visibility,
            })) ?? [],
        [friend]
      );

    const groupedHabits = useMemo(
    () =>
        publicHabits.reduce<Record<string, PublicHabit[]>>((acc, habit) => {
        if (!acc[habit.category]) {
            acc[habit.category] = [];
        }
        acc[habit.category].push(habit);
        return acc;
        }, {}),
    [publicHabits]);

    // if (!friend) {
    //     return <Text>Loading...</Text>;
    //   }

    const friendHabitCards: FriendHabitCard[] = useMemo(
    () =>
        Object.entries(groupedHabits).map(([category, habit], index) => ({
        id: category,
        title: category,
        subtitle: `${habit.length} habit${habit.length === 1 ? '' : 's'}`,
        accent: ['#6E8B62', '#8E6E53', '#7B8F6A', '#7A8F85'][index % 4],
        body: (
            <View>
            {habit.map((habit) => (
                <HabitStatsBlock
                key={habit.id}
                habitName={habit.name}
                streak={habit.currentStreak}
                />
            ))}
            </View>
        ),
        })),
    [groupedHabits]
    );

    if (!friend) {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EAF6E8'}}>
          <ActivityIndicator size="large" color="#2E6F40" />
          <Text style={{marginTop: 10, color: '#2E6F40'}}>Finding your friend...</Text>
        </View>
      );
  }
    return (
        <ImageBackground
        source={require("../../assets/images/leaf.png")}
        style={styles.background}
        imageStyle={{ opacity: 0.08 }} // want the leaves to be a bit transparent on the screen
        >
        <View />

        <ScrollView
            contentContainerStyle={[
            styles.container,
            ]}
            showsVerticalScrollIndicator={false}
        >
            <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.push('/home')} // Or router.replace('/home')
            >
                <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
  style={styles.searchBtn}
  onPress={() => router.push("/search")}
>
  <Text style={styles.searchBtnText}>+ Find Friends</Text>
</TouchableOpacity>
            
            <Modal
            visible={showInfoModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowInfoModal(false)}
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>About This Friend Profile</Text>

                <Text style={styles.modalText}>
                    This screen shows a friend’s public profile inside Habitat. You can see
                    their display name, points, and only the habits they have chosen to share
                    publicly.
                </Text>

                <Text style={styles.modalText}>
                    Swipe through the habit cards to browse their public habits and current
                    streaks.
                </Text>

                <Pressable
                    style={styles.modalButton}
                    onPress={() => setShowInfoModal(false)}
                >
                    <Text style={styles.modalButtonText}>Got it</Text>
                </Pressable>
                </View>
            </View>
            </Modal>

            <View style={styles.topBar}>
            <View style={styles.rightSpacer} />

            <View style={styles.titleWrap}>
                <Text numberOfLines={2} style={styles.title}>
                Friend Profile
                </Text>
                <Pressable
                style={styles.helpPill}
                hitSlop={10}
                onPress={() => setShowInfoModal(true)}
                >
                <Text style={styles.helpText}>i</Text>
                </Pressable>
            </View>

            <View style={styles.rightSpacer} />
            </View>

            <Text style={styles.subtitle}>
            A quick look at your friend’s public habits and progress.
            </Text>

            <View style={styles.profileCard}>
            <View style={styles.profileTextWrap}>
            <Text style={styles.profileEyebrow}>friend overview</Text>

            <AvatarBlock name={displayName} />
            <Text style={styles.profileTag}>{publicTag}</Text>

            <View style={{ marginTop: 10 }}>
            {renderFriendButton()} 
            </View>

            <Text style={styles.profileDescription}>
                This profile only shows habits your friend has marked as public.
            </Text>
        </View>
            </View>

            <View style={styles.pointsCard}>
            <Text style={styles.pointsEyebrow}>POINTS</Text>
            <Text style={styles.pointsValue}>{points}</Text>
            {/* <Text style={styles.pointsValue}>{friend.points}</Text> */}
            </View>

            <View style={styles.snapHeaderRow}>
            <Text style={styles.sectionTitle}>Public Habits</Text>
            <Text style={styles.snapHint}>Swipe to see more</Text>
            </View>

            {friendHabitCards.length === 0 ? (
            <View style={styles.summaryCard}>
                <Text style={styles.summaryEyebrow}>NO PUBLIC HABITS</Text>
                <Text style={styles.summaryHeadline}>Nothing shared yet.</Text>
                <Text style={styles.summaryText}>
                This friend has not made any habits public yet.
                </Text>
            </View>
            ) : (
            <Animated.FlatList
                horizontal
                data={friendHabitCards}
                keyExtractor={(i) => i.id}
                renderItem={({ item, index }) => (
                <FriendHabitCardView card={item} index={index} scrollX={scrollX} />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.snapList}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                decelerationRate="fast"
                bounces={false}
                onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            />
            )}
        </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: "#EAF6E8",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(250,246,239,0.20)',
    },

    backBtn: {
        marginBottom: Spacing.md,
        alignSelf: 'flex-start',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.paleGreen,
        borderRadius: Radius.sm,
    },
    backBtnText: {
        color: Colors.primaryGreen,
        fontWeight: '600',
        fontSize: FontSize.md,
    },

    container: {
        paddingTop: Dimensions.get('window').height * 0.05,
        paddingHorizontal: SIDE_SPACER,
        paddingBottom: 34,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    rightSpacer: { width: 40 },

    titleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    title: {
        fontSize: 24,
        color: COLORS.forest,
        maxWidth: '82%',
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    helpPill: {
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.chip,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },
    helpText: {
        color: COLORS.brown,
        fontSize: 14,
    },

    subtitle: {
        marginTop: 12,
        marginBottom: 18,
        color: COLORS.bark,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },

    profileCard: {
        marginTop: 4,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.softWhite,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
    },
    profileTextWrap: {
        padding: 18,
        alignItems: 'center',
    },
    profileEyebrow: {
        color: COLORS.moss,
        fontSize: 11,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    profileTag: {
        marginTop: 6,
        fontSize: 15,
        color: COLORS.forest,
        textAlign: 'center',
    },
    profileDescription: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.brown,
        textAlign: 'center',
    },

    pointsCard: {
        marginTop: 18,
        padding: 18,
        borderRadius: 24,
        backgroundColor: 'rgba(247,241,232,0.88)',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
        alignItems: 'center',
    },
    pointsEyebrow: {
        color: COLORS.moss,
        fontSize: 11,
        letterSpacing: 1.1,
    },
    pointsValue: {
        marginTop: 6,
        fontSize: 34,
        color: COLORS.forest,
        fontWeight: '700',
    },

    sectionTitle: {
        marginTop: 18,
        fontSize: 22,
        color: COLORS.forest,
        fontWeight: '700',
    },

    snapHeaderRow: {
        marginTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    snapHint: {
        color: COLORS.brown,
        fontSize: 12,
    },

    snapList: {
        paddingTop: 14,
        paddingBottom: 8,
        paddingRight: SIDE_SPACER,
    },
    snapshotCard: {
        width: CARD_WIDTH,
        marginRight: CARD_SPACING,
        padding: 16,
        borderRadius: 24,
        backgroundColor: COLORS.softWhite,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
        shadowColor: '#5A4635',
        shadowOpacity: 0.10,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
        alignSelf: 'flex-start',
        },
    snapshotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    snapshotTitle: {
        color: COLORS.bark,
        fontSize: 18,
        flex: 1,
        paddingRight: 8,
    },
    snapshotSubtitle: {
        color: COLORS.forest,
        fontSize: 16,
    },
    snapshotAccent: {
        marginTop: 10,
        width: 44,
        height: 5,
        borderRadius: 999,
    },
    snapshotBody: {
        marginTop: 16,
        justifyContent: 'flex-start',
        },

    cardBodyHeadline: {
        fontSize: 19,
        color: COLORS.forest,
        fontWeight: '700',
    },
    cardBodySubtext: {
        marginTop: 6,
        color: COLORS.brown,
        fontSize: 14,
        lineHeight: 20,
    },

    statsBlock: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.60)',
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    statsBig: {
        fontSize: 28,
        color: COLORS.bark,
        fontWeight: '700',
    },
    statsLabel: {
        marginTop: 2,
        color: COLORS.brown,
        fontSize: 12,
    },

    summaryCard: {
        marginTop: 18,
        padding: 18,
        borderRadius: 24,
        backgroundColor: 'rgba(247,241,232,0.88)',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
    },
    summaryEyebrow: {
        color: COLORS.moss,
        fontSize: 11,
        letterSpacing: 1.1,
    },
    summaryHeadline: {
        marginTop: 6,
        fontSize: 22,
        color: COLORS.forest,
        fontWeight: '700',
    },
    summaryText: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.brown,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    modalCard: {
        width: '100%',
        borderRadius: 24,
        backgroundColor: 'rgba(247,241,232,0.98)',
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },

    modalTitle: {
        fontSize: 22,
        color: COLORS.forest,
        fontWeight: '700',
        marginBottom: 10,
    },

    modalText: {
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.brown,
        marginBottom: 12,
    },

    modalButton: {
        marginTop: 8,
        alignSelf: 'flex-end',
        backgroundColor: COLORS.forest,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
    },

    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
    },

    habitMiniBlock: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    },
    habitMiniTextWrap: {
    flex: 1,
    paddingRight: 10,
    },
    habitMiniName: {
    fontSize: 17,
    color: COLORS.bark,
    lineHeight: 22,
    },
    habitMiniRight: {
    alignItems: 'flex-end',
    },
    habitMiniStreak: {
    fontSize: 22,
    color: COLORS.forest,
    fontWeight: '700',
    },
    habitMiniLabel: {
    marginTop: 2,
    color: COLORS.brown,
    fontSize: 12,
    },

    avatarCard: {
    alignItems: 'center',
    paddingVertical: 16,
    },

    avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(77,58,45,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A4635',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    },

    avatarInitial: {
    fontSize: 38,
    color: COLORS.forest,
    fontFamily: FONTS.title,
    fontWeight: '700',
    },

    avatarName: {
    marginTop: 10,
    fontSize: 26,
    color: COLORS.bark,
    fontWeight: '700',
    textAlign: 'center',
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
      
      requestedText: {
        marginTop: 10,
        color: "#888",
        fontSize: 14,
      },
      
      friendText: {
        marginTop: 10,
        color: COLORS.moss,
        fontSize: 14,
        fontWeight: "600",
      },

      searchBtn: {
        alignSelf: "center",
        marginBottom: 12,
        backgroundColor: COLORS.moss,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
      },
      
      searchBtnText: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
      },

});