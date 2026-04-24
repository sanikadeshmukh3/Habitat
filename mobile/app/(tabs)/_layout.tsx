import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/theme'

export default function TabLayout() {
  const { Colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: Colors.pageBg,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
        },

        tabBarActiveTintColor: Colors.primaryGreen,
        tabBarInactiveTintColor: Colors.primaryGreen,

        tabBarLabelStyle: {
          fontWeight: 600,
          fontSize: 12,
        },
      }}
    >

      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: "Maps",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />

    {/* <Tabs.Screen
        name="friend"
        options={{
          title: "Friend",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="woman-sharp" size={size} color={color} />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="recap"
        options={{
          title: "Wrapped",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen 
       name="index"
       options={{
         href: null, 
       }}
      />
    
    </Tabs>
  );
}
