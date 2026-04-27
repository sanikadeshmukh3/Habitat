import React from 'react';
import { Image, Text, View } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Video, ResizeMode } from "expo-av";

const ONBOARDING_KEY = 'hasSeenOnboarding';

const TutorialVideo = ({ source }: { source: any }) => (
  <View
    style={{
      width: 220,
      height: 460,
      borderRadius: 38,
      backgroundColor: "#111",
      padding: 6,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    }}
  >
    <View
      style={{
        flex: 1,
        borderRadius: 30,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <Video
        source={source}
        style={{
          width: "100%",
          height: "100%",
        }}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
    </View>
  </View>
);

export default function OnboardingScreen() {
  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.back();
  };

  return (
    <Onboarding
      onSkip={finishOnboarding}
      onDone={finishOnboarding}
      pages={[
        {
            backgroundColor: "#F7F4EE",
            title: "Your Dashboard",
            image: <TutorialVideo source={require("../assets/images/tutorial/dashboard.mov")} />,
            subtitle: "View points, habits, friends, and requests all in one place.",
        },
        {
            backgroundColor: "#EEF7EF",
            title: "Create Habits with AI",
            image: <TutorialVideo source={require("../assets/images/tutorial/add-habit-ai.mov")} />,
            subtitle: "Describe your goal and let Habitat suggest habits that fit.",
        },
        {
            backgroundColor: "#F2F0FA",
            title: "Create Habits Manually",
            image: <TutorialVideo source={require("../assets/images/tutorial/add-habit-manual.mov")} />,
            subtitle: "Choose your habit title, frequency, category, and visibility.",
        },
        {
            backgroundColor: "#FFF4E8",
            title: "Check In Daily",
            image: <TutorialVideo source={require("../assets/images/tutorial/calendar.mov")} />,
            subtitle: "Use the calendar to track progress, notes, and mood.",
        },
        {
            backgroundColor: "#EAF4FF",
            title: "View Habit Details",
            image: <TutorialVideo source={require("../assets/images/tutorial/detail.mov")} />,
            subtitle: "See streaks, history, and check-in activity for each habit.",
        },
        {
            backgroundColor: "#F6F0FF",
            title: "Weekly Wrapped",
            image: <TutorialVideo source={require("../assets/images/tutorial/wrapped.mov")} />,
            subtitle: "Review your weekly summary, animal archetype, and AI insight.",
        },
        {
            backgroundColor: "#EEF7EF",
            title: "Connect with Friends",
            image: <TutorialVideo source={require("../assets/images/tutorial/friend.mov")} />,
            subtitle: "View profiles, public habits, and build accountability.",
        },
        {
            backgroundColor: "#F7F4EE",
            title: "View Your Profile",
            image: <TutorialVideo source={require("../assets/images/tutorial/profile.mov")} />,
            subtitle: "Track badges, edit your information, and manage your account.",
        },
        {
            backgroundColor: "#F6F6F6",
            title: "Customize Habitat",
            image: <TutorialVideo source={require("../assets/images/tutorial/settings.mov")} />,
            subtitle: "Change themes, manage habit stacking, and replay this tutorial anytime.",
        },
      ]}
    />
  );
}