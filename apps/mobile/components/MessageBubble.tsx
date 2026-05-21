import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === "user";

  const handleLongPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(message.content);
    if (Platform.OS !== "android") {
      Alert.alert("Copied", "Message copied to clipboard.");
    }
  }, [message.content]);

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>A</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [
                styles.userBubble,
                {
                  backgroundColor: colors.userBubble,
                  borderRadius: colors.radius,
                },
              ]
            : [
                styles.assistantBubble,
                {
                  backgroundColor: colors.assistantBubble,
                  borderRadius: colors.radius,
                },
              ],
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isUser
                ? colors.userBubbleText
                : colors.assistantBubbleText,
            },
          ]}
          selectable
        >
          {message.content}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 3,
    paddingHorizontal: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    flexShrink: 0,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  assistantBubble: {
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
});
