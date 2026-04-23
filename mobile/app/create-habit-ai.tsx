import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import api from '@/lib/api';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme, Spacing, FontSize, Radius, createSharedStyles } from '@/constants/theme';

// Palette
// const C = {
//   pageBg:           '#F7FAF5',
//   cardBg:         '#FFFFFF',
//   midGreen:         '#7BAE7F',
//   lightGreen:      '#A8C5A0',
//   paleGreen: '#CDECCD',
//   yellow:       '#F5E6A3',
//   yellowDeep:   '#E8C84A',
//   primaryIndigo: '#3D3B8E',
//   paleIndigo:   '#EEEDF8',
//   midIndigo:    '#6C63FF',
//   darkBrown:  '#2B2D42',
//   lightBrown:'#6B7280',
//   border:       '#E4EDE2',
// };

// Mock AI suggestions
/*const MOCK_SUGGESTIONS = [
  {
    id: '1',
    name: 'Morning walk for 20 minutes',
    category: 'Fitness',
    emoji: '🏃',
    frequency: 'Daily',
    reason: 'Light cardio helps reduce stress and improve sleep quality.',
  },
  {
    id: '2',
    name: 'Drink 8 glasses of water',
    category: 'Nutrition',
    emoji: '🥗',
    frequency: 'Daily',
    reason: 'Staying hydrated boosts focus and energy throughout the day.',
  },
  {
    id: '3',
    name: 'Journal for 5 minutes before bed',
    category: 'Wellness',
    emoji: '🧘',
    frequency: 'Daily',
    reason: 'Reflective writing helps process emotions and reduce anxiety.',
  },
  {
    id: '4',
    name: 'Read for 15 minutes',
    category: 'Productivity',
    emoji: '📚',
    frequency: 'Daily',
    reason: 'Daily reading compounds over time into significant knowledge gains.',
  },
  {
    id: '5',
    name: 'Sleep by 11pm',
    category: 'Sleep',
    emoji: '😴',
    frequency: 'Daily',
    reason: 'Consistent sleep timing improves mood, focus, and metabolism.',
  },
];*/



type Suggestion = {
  id: string,
  name: string,
  category: string,
  emoji: string,
  frequency: string,
  reason: string,
};

type Stage = 'input' | 'loading' | 'results';

// Component
export default function CreateHabitAIScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const sharedStyles = createSharedStyles(Colors);

  const router = useRouter();

  const [goal, setGoal]               = useState('');
  const [stage, setStage]             = useState<Stage>('input');
  const [selected, setSelected]       = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const handleGenerate = async () => {
    if (!goal.trim()) return;
    setStage('loading');

    // the AI API call
    try {
      const res = await api.post("/ai/generate-habits", { goal });

      // AI response (including defaults to prevent code crashing)
      const formatted: Suggestion[] = res.data.map((item: any, index: number) => ({
        id: item.id || String(index),
        name: item.name || "Unnamed habit",
        category: item.category || "Wellness",
        emoji: item.emoji || "🌿",
        frequency: item.frequency || "Daily",
        reason: item.reason || "Helps improve your routine.",
      }));
      
      setSuggestions(formatted);
      setStage('results');

    } catch (err) {
      console.error("AI Error: ", err);
      Alert.alert("Error", "failed to generate habit");
      setStage('input');
    }
    
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev === id ? null : id));
  };

  const handleReset = () => {
    setGoal('');
    setStage('input');
    setSelected('');
    setSuggestions([]);
  };

  const canAdd = selected !== null;

  return (
    <ImageBackground
      source={require('../assets/images/leaf.png')}
      style={styles.background}
      imageStyle={{ opacity: 0.08}}
    >
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={sharedStyles.backBtn} onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
          <Text style={sharedStyles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Habit Builder</Text>
          <Text style={styles.headerSub}>powered by Habitat AI ✦</Text>
        </View>

        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>✦</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Goal Input */}
        <View style={styles.card}>
          {/* Yellow accent bar */}
          <View style={styles.accentBar} />

          <Text style={styles.goalPrompt}>What's your goal?</Text>
          <Text style={styles.goalHint}>
            Describe what you want to improve — Habitat AI will suggest habits to get you there.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. I want to feel less stressed and sleep better"
              placeholderTextColor={Colors.lightBrown}
              value={goal}
              onChangeText={setGoal}
              multiline
              maxLength={200}
              editable={stage === 'input'}
            />
            <Text style={styles.charCount}>{goal.length}/200</Text>
          </View>

          {/* Example prompts */}
          {stage === 'input' && (
            <View style={styles.examplesRow}>
              {['Get fit', 'Reduce stress', 'Sleep better', 'Study more'].map((ex) => (
                <TouchableOpacity
                  key={ex}
                  style={styles.exampleChip}
                  onPress={() => setGoal(ex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exampleChipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stage === 'input' && (
            <TouchableOpacity
              style={[styles.generateBtn, !goal.trim() && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={!goal.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.generateBtnText}>✦  Generate Habits</Text>
            </TouchableOpacity>
          )}

          {stage !== 'input' && (
            <View style={styles.goalPreview}>
              <Text style={styles.goalPreviewLabel}>Your goal</Text>
              <Text style={styles.goalPreviewText}>"{goal}"</Text>
              <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
                <Text style={styles.resetLink}>Start over</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Loading */}
        {stage === 'loading' && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.midIndigo} />
            <Text style={styles.loadingTitle}>Building your habit plan…</Text>
            <Text style={styles.loadingSub}>Habitat AI is personalizing suggestions for you</Text>
          </View>
        )}

        {/* Results */}
        {stage === 'results' && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {suggestions.length} habits suggested
              </Text>
              <Text style={styles.resultsSub}>
                Tap to select the ones you want to add
              </Text>
            </View>

            {suggestions.map((s) => {
              const isSelected = selected === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.suggestionCard, isSelected && styles.suggestionCardActive]}
                  onPress={() => toggleSelect(s.id)}
                  activeOpacity={0.8}
                >
                  {/* Selection indicator */}
                  <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>

                  <View style={styles.suggestionBody}>
                    {/* Category + emoji */}
                    <View style={styles.suggestionMeta}>
                      <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                      <Text style={styles.suggestionCategory}>{s.category}</Text>
                      <View style={styles.freqBadge}>
                        <Text style={styles.freqBadgeText}>{s.frequency}</Text>
                      </View>
                    </View>

                    <Text style={[styles.suggestionName, isSelected && styles.suggestionNameActive]}>
                      {s.name}
                    </Text>
                    <Text style={styles.suggestionReason}>{s.reason}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Add selected habits button */}
            <TouchableOpacity
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              disabled={!canAdd}
              activeOpacity={canAdd ? 0.85 : 1}
              onPress={() => {
                const selectedHabit = suggestions.find(s => selected === s.id);

                if (!selectedHabit) return;

                router.push({
                  pathname: "/create-habit",
                  params: {
                    name: selectedHabit.name,
                    habitCategory: selectedHabit.category?.toUpperCase(),
                    frequency: selectedHabit.frequency?.toUpperCase(),
                  },
                });
              }}
            >
              <Text style={styles.addBtnText}>
                {canAdd ? "~Continue" : "Select habits above"}
              </Text>
            </TouchableOpacity>

            {/* Manual fallback */}
            <TouchableOpacity style={styles.manualLink} onPress={() => router.push('/create-habit')}activeOpacity={0.7}>
              <Text style={styles.manualLinkText}>
                Prefer to create your own? → Add manually
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.top_margin,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.pageBg,
  },
  // backBtn: {
  //   width: 38,
  //   height: 38,
  //   borderRadius: Radius.md,
  //   backgroundColor: Colors.cardBg,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // backArrow: {
  //   fontSize: FontSize.lg,
  //   color: Colors.primaryIndigo,
  //   fontWeight: '600',
  // },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primaryIndigo,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.midIndigo,
    marginTop: 1,
  },
  aiBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.paleIndigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadgeText: {
    fontSize: FontSize.lg,
    color: Colors.midIndigo,
  },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  // Goal input card
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Spacing.xs,
    backgroundColor: Colors.paleGreen,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  goalPrompt: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primaryIndigo,
    marginTop: Spacing.ms,
    marginBottom: Spacing.sm,
  },
  goalHint: {
    fontSize: FontSize.sm,
    color: Colors.lightBrown,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    backgroundColor: Colors.pageBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.ms,
    marginBottom: Spacing.sm,
  },
  input: {
    fontSize: FontSize.md,
    color: Colors.darkBrown,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.lightBrown,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Example chips
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  exampleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 50,
    backgroundColor: Colors.paleGreen,
  },
  exampleChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primaryIndigo,
  },

  // Generate button
  generateBtn: {
    backgroundColor: Colors.primaryIndigo,
    borderRadius: Radius.md,
    paddingVertical: Spacing.ms,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: Colors.lightGreen,
  },
  generateBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Goal preview
  goalPreview: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.paleIndigo,
    borderRadius: Radius.md,
  },
  goalPreviewLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.midIndigo,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  goalPreviewText: {
    fontSize: FontSize.sm,
    color: Colors.primaryIndigo,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  resetLink: {
    fontSize: FontSize.xs,
    color: Colors.midIndigo,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Loading
  loadingCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  loadingTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primaryIndigo,
  },
  loadingSub: {
    fontSize: FontSize.sm,
    color: Colors.lightBrown,
    textAlign: 'center',
  },

  // Results
  resultsHeader: {
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primaryIndigo,
  },
  resultsSub: {
    fontSize: FontSize.sm,
    color: Colors.lightBrown,
    marginTop: Spacing.xs,
  },

  // Suggestion cards
  suggestionCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  suggestionCardActive: {
    borderColor: Colors.primaryIndigo,
    backgroundColor: Colors.paleIndigo,
  },
  selectCircle: {
    width: 24,
    height: 24,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    flexShrink: 0,
  },
  selectCircleActive: {
    backgroundColor: Colors.primaryIndigo,
    borderColor: Colors.primaryIndigo,
  },
  checkmark: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  suggestionBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  suggestionEmoji: {
    fontSize: FontSize.sm,
  },
  suggestionCategory: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.lightBrown,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freqBadge: {
    backgroundColor: Colors.pageBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  freqBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.midGreen,
  },
  suggestionName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.darkBrown,
    lineHeight: 20,
  },
  suggestionNameActive: {
    color: Colors.primaryIndigo,
  },
  suggestionReason: {
    fontSize: FontSize.xs,
    color: Colors.lightBrown,
    lineHeight: 17,
  },

  // Add button
  addBtn: {
    backgroundColor: Colors.primaryIndigo,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.ms,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.ms,
  },
  addBtnDisabled: {
    backgroundColor: Colors.lightGreen,
  },
  addBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Manual link
  manualLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  manualLinkText: {
    fontSize: FontSize.sm,
    color: Colors.midIndigo,
    fontWeight: '600',
  },
});