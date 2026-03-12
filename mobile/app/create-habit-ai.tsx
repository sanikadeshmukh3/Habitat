import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
  TouchableOpacity,
  View,
} from 'react-native';

// Palette
const C = {
  bg:           '#F7FAF5',
  card:         '#FFFFFF',
  sage:         '#7BAE7F',
  sageMid:      '#A8C5A0',
  sagePale:     '#E3F0E1',
  yellow:       '#F5E6A3',
  yellowDeep:   '#E8C84A',
  indigo:       '#3D3B8E',
  indigoPale:   '#EEEDF8',
  indigoMid:    '#6C63FF',
  textPrimary:  '#2B2D42',
  textSecondary:'#6B7280',
  border:       '#E4EDE2',
  shadow:       'rgba(61, 59, 142, 0.08)',
};

// Mock AI suggestions
const MOCK_SUGGESTIONS = [
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
];

type Suggestion = typeof MOCK_SUGGESTIONS[0];
type Stage = 'input' | 'loading' | 'results';

// Component
export default function CreateHabitAIScreen() {
  const router = useRouter();

  const [goal, setGoal]               = useState('');
  const [stage, setStage]             = useState<Stage>('input');
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const handleGenerate = () => {
    if (!goal.trim()) return;
    setStage('loading');
    // Simulate API delay
    setTimeout(() => {
      setSuggestions(MOCK_SUGGESTIONS);
      setStage('results');
    }, 2000);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReset = () => {
    setGoal('');
    setStage('input');
    setSelected(new Set());
    setSuggestions([]);
  };

  const canAdd = selected.size > 0;

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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
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
              placeholderTextColor={C.textSecondary}
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
            <ActivityIndicator size="large" color={C.indigoMid} />
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
              const isSelected = selected.has(s.id);
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
            >
              <Text style={styles.addBtnText}>
                {canAdd
                  ? `Add ${selected.size} Habit${selected.size > 1 ? 's' : ''} to Habitat 🍀`
                  : 'Select habits above'}
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
const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#EAF6E8',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: C.indigo,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.indigo,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: C.indigoMid,
    marginTop: 1,
  },
  aiBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.indigoPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadgeText: {
    fontSize: 18,
    color: C.indigoMid,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Goal input card
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: C.yellow,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  goalPrompt: {
    fontSize: 18,
    fontWeight: '700',
    color: C.indigo,
    marginTop: 10,
    marginBottom: 6,
  },
  goalHint: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputWrapper: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  input: {
    fontSize: 15,
    color: C.textPrimary,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },

  // Example chips
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: C.yellow,
  },
  exampleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.indigo,
  },

  // Generate button
  generateBtn: {
    backgroundColor: C.indigo,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: C.sageMid,
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Goal preview (after generation)
  goalPreview: {
    marginTop: 4,
    padding: 12,
    backgroundColor: C.indigoPale,
    borderRadius: 12,
  },
  goalPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.indigoMid,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  goalPreviewText: {
    fontSize: 14,
    color: C.indigo,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  resetLink: {
    fontSize: 12,
    color: C.indigoMid,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Loading
  loadingCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.indigo,
  },
  loadingSub: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
  },

  // Results header
  resultsHeader: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.indigo,
  },
  resultsSub: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },

  // Suggestion cards
  suggestionCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  suggestionCardActive: {
    borderColor: C.indigo,
    backgroundColor: C.indigoPale,
  },
  selectCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  selectCircleActive: {
    backgroundColor: C.indigo,
    borderColor: C.indigo,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionBody: {
    flex: 1,
    gap: 6,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionEmoji: {
    fontSize: 14,
  },
  suggestionCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freqBadge: {
    backgroundColor: C.sagePale,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  freqBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.sage,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 20,
  },
  suggestionNameActive: {
    color: C.indigo,
  },
  suggestionReason: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 17,
  },

  // Add button
  addBtn: {
    backgroundColor: C.indigo,
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  addBtnDisabled: {
    backgroundColor: C.sageMid,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Manual fallback link
  manualLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  manualLinkText: {
    fontSize: 13,
    color: C.indigoMid,
    fontWeight: '600',
  },
});
