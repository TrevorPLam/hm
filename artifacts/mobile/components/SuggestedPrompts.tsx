import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";

const PROMPTS = [
  { icon: "✍️", label: "Write a cover letter", prompt: "Help me write a compelling cover letter for a software engineering position." },
  { icon: "💡", label: "Brainstorm ideas", prompt: "I need help brainstorming creative ideas for a side project." },
  { icon: "🧮", label: "Explain a concept", prompt: "Explain quantum computing in simple terms." },
  { icon: "📝", label: "Summarize text", prompt: "I have some text I'd like you to summarize concisely." },
  { icon: "🐛", label: "Debug my code", prompt: "I have a bug in my code. Can you help me debug it?" },
  { icon: "🌍", label: "Translate text", prompt: "Can you help me translate some text?" },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          How can I help you today?
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Ask me anything, or pick a suggestion below.
        </Text>
      </View>

      {/* Prompt chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PROMPTS.map((p) => (
          <Pressable
            key={p.label}
            onPress={() => onSelect(p.prompt)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.chipIcon}>{p.icon}</Text>
            <Text
              style={[styles.chipLabel, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  greeting: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 28,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    width: 130,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  chipIcon: {
    fontSize: 22,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
});
