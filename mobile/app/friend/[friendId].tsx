import { useTheme, FontSize, Radius, Spacing, Colors, createSharedStyles } from '@/constants/theme';
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
    points: number;
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

function AvatarBlock({ name, styles }: { name: string, styles: ReturnType<typeof makeStyles> }) {
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
    styles,
}: {
    card: FriendHabitCard;
    index: number;
    scrollX: Animated.Value;
    styles: ReturnType<typeof makeStyles>;
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

        <View style={[styles.snapshotAccent, { backgroundColor: card.accent ?? Colors.midGreen }]} />

        <View style={styles.snapshotBody}>{card.body}</View>
        </Animated.View>
    );
}

function HabitStatsBlock({ habitName, streak, styles }: { habitName: string; streak: number; styles: ReturnType<typeof makeStyles> }) {
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
    const { Colors } = useTheme();
    const styles = useMemo(() => makeStyles(Colors), [Colors]);
    const sharedStyles = createSharedStyles(Colors);

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
            points: data.points ?? 0,
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
      const points = friend?.points ?? 0;

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
                styles={styles}
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
            style={sharedStyles.backBtn} 
            onPress={() => router.push('/home')} // Or router.replace('/home')
            >
                <Text style={sharedStyles.backBtnText}>← Back</Text>
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

            <AvatarBlock name={displayName} styles={styles} />
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
                <FriendHabitCardView card={item} index={index} scrollX={scrollX} styles={styles} />
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

const makeStyles = (Colors: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: Colors.pageBg,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.overlay,
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
        fontSize: FontSize.xl,
        color: Colors.primaryGreen,
        maxWidth: '82%',
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    helpPill: {
        minWidth: 28,
        height: 28,
        borderRadius: Radius.md,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },
    helpText: {
        color: Colors.midBrown,
        fontSize: FontSize.sm,
    },

    subtitle: {
        marginTop: Spacing.ms,
        marginBottom: 18,
        color: Colors.darkBrown,
        fontSize: FontSize.sm,
        lineHeight: 22,
        textAlign: 'center',
    },

    profileCard: {
        marginTop: Spacing.xs,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        backgroundColor: Colors.pageBg,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
    },
    profileTextWrap: {
        padding: 18,
        alignItems: 'center',
    },
    profileEyebrow: {
        color: Colors.midGreen,
        fontSize: FontSize.xs,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    profileTag: {
        marginTop: 6,
        fontSize: FontSize.md,
        color: Colors.primaryGreen,
        textAlign: 'center',
    },
    profileDescription: {
        marginTop: Spacing.sm,
        fontSize: FontSize.sm,
        lineHeight: 21,
        color: Colors.midBrown,
        textAlign: 'center',
    },

    pointsCard: {
        marginTop: 18,
        padding: 18,
        borderRadius: Radius.lg,
        backgroundColor: Colors.pageBg,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
        alignItems: 'center',
    },
    pointsEyebrow: {
        color: Colors.midGreen,
        fontSize: FontSize.xs,
        letterSpacing: 1.1,
    },
    pointsValue: {
        marginTop: 6,
        fontSize: 34,
        color: Colors.primaryGreen,
        fontWeight: '700',
    },

    sectionTitle: {
        marginTop: 18,
        fontSize: FontSize.xl,
        color: Colors.primaryGreen,
        fontWeight: '700',
    },

    snapHeaderRow: {
        marginTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    snapHint: {
        color: Colors.midBrown,
        fontSize: FontSize.xs,
    },

    snapList: {
        paddingTop: 14,
        paddingBottom: Spacing.sm,
        paddingRight: SIDE_SPACER,
    },
    snapshotCard: {
        width: CARD_WIDTH,
        marginRight: CARD_SPACING,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
        shadowColor: '#5A4635',
        shadowOpacity: 0.10,
        shadowRadius: Radius.md,
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
        color: Colors.darkBrown,
        fontSize: FontSize.lg,
        flex: 1,
        paddingRight: Spacing.sm,
    },
    snapshotSubtitle: {
        color: Colors.primaryGreen,
        fontSize: FontSize.md,
    },
    snapshotAccent: {
        marginTop: 10,
        width: 44,
        height: 5,
        borderRadius: Radius.full,
    },
    snapshotBody: {
        marginTop: Spacing.md,
        justifyContent: 'flex-start',
        },

    cardBodyHeadline: {
        fontSize: FontSize.lg,
        color: Colors.primaryGreen,
        fontWeight: '700',
    },
    cardBodySubtext: {
        marginTop: 6,
        color: Colors.midBrown,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },

    statsBlock: {
        marginTop: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.pageBg,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        gap: Spacing.ms,
    },
    statsBig: {
        fontSize: FontSize.xxl,
        color: Colors.darkBrown,
        fontWeight: '700',
    },
    statsLabel: {
        marginTop: 2,
        color: Colors.midBrown,
        fontSize: FontSize.xs,
    },

    summaryCard: {
        marginTop: 18,
        padding: 18,
        borderRadius: Radius.lg,
        backgroundColor: Colors.pageBg,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.08)',
    },
    summaryEyebrow: {
        color: Colors.midGreen,
        fontSize: FontSize.xs,
        letterSpacing: 1.1,
    },
    summaryHeadline: {
        marginTop: 6,
        fontSize: FontSize.xl,
        color: Colors.primaryGreen,
        fontWeight: '700',
    },
    summaryText: {
        marginTop: Spacing.sm,
        fontSize: FontSize.sm,
        lineHeight: 21,
        color: Colors.midBrown,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },

    modalCard: {
        width: '100%',
        borderRadius: Radius.lg,
        backgroundColor: Colors.pageBg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(77,58,45,0.10)',
    },

    modalTitle: {
        fontSize: FontSize.xl,
        color: Colors.primaryGreen,
        fontWeight: '700',
        marginBottom: 10,
    },

    modalText: {
        fontSize: FontSize.sm,
        lineHeight: 21,
        color: Colors.midBrown,
        marginBottom: Spacing.ms,
    },

    modalButton: {
        marginTop: Spacing.sm,
        alignSelf: 'flex-end',
        backgroundColor: Colors.primaryGreen,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: Radius.full,
    },

    modalButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.sm,
    },

    habitMiniBlock: {
    marginTop: Spacing.ms,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: 14,
    gap: Spacing.ms,
    },
    habitMiniTextWrap: {
    flex: 1,
    paddingRight: 10,
    },
    habitMiniName: {
    fontSize: FontSize.lg,
    color: Colors.darkBrown,
    lineHeight: 22,
    },
    habitMiniRight: {
    alignItems: 'flex-end',
    },
    habitMiniStreak: {
    fontSize: FontSize.xl,
    color: Colors.primaryGreen,
    fontWeight: '700',
    },
    habitMiniLabel: {
    marginTop: 2,
    color: Colors.midBrown,
    fontSize: FontSize.xs,
    },

    avatarCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    },

    avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: Radius.xl,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A4635',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    },

    avatarInitial: {
    fontSize: FontSize.big,
    color: Colors.primaryGreen,
    fontFamily: FONTS.title,
    fontWeight: '700',
    },

    avatarName: {
    marginTop: 10,
    fontSize: FontSize.xxl,
    color: Colors.darkBrown,
    fontWeight: '700',
    textAlign: 'center',
    },

    addBtn: {
        marginTop: 10,
        backgroundColor: Colors.primaryGreen,
        paddingHorizontal: 18,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        alignSelf: "center",
      },
      
      addText: {
        color: "white",
        fontSize: FontSize.sm,
        fontWeight: "600",
      },
      
      requestedText: {
        marginTop: 10,
        color: "#888",
        fontSize: FontSize.sm,
      },
      
      friendText: {
        marginTop: 10,
        color: Colors.midGreen,
        fontSize: FontSize.sm,
        fontWeight: "600",
      },

      searchBtn: {
        alignSelf: "center",
        marginBottom: Spacing.ms,
        backgroundColor: Colors.midGreen,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
      },
      
      searchBtnText: {
        color: "white",
        fontSize: FontSize.sm,
        fontWeight: "600",
      },

});