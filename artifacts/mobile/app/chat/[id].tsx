import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  getListOpenaiConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatInput } from "@/components/ChatInput";
import { streamChat } from "@/lib/api";

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const initializedRef = useRef(false);

  const { data: conversation, isLoading } = useGetOpenaiConversation(
    conversationId,
    { query: { queryKey: getGetOpenaiConversationQueryKey(conversationId) } }
  );

  // Load initial messages once
  useEffect(() => {
    if (conversation?.messages && !initializedRef.current) {
      setMessages(
        conversation.messages.map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      initializedRef.current = true;
    }
  }, [conversation?.messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMsg: Message = { id: uid(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setShowTyping(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let fullContent = "";
      let assistantAdded = false;

      try {
        await streamChat(
          conversationId,
          text,
          (chunk) => {
            fullContent += chunk;
            if (!assistantAdded) {
              setShowTyping(false);
              setMessages((prev) => [
                ...prev,
                { id: uid(), role: "assistant", content: fullContent },
              ]);
              assistantAdded = true;
            } else {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullContent,
                };
                return updated;
              });
            }
          },
          controller.signal
        );

        // Invalidate conversation queries after streaming
        queryClient.invalidateQueries({
          queryKey: getGetOpenaiConversationQueryKey(conversationId),
        });
        queryClient.invalidateQueries({
          queryKey: getListOpenaiConversationsQueryKey(),
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setShowTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            },
          ]);
        }
      } finally {
        setIsStreaming(false);
        setShowTyping(false);
        abortRef.current = null;
      }
    },
    [conversationId, isStreaming, queryClient]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const reversed = [...messages].reverse();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {conversation?.title ?? "Chat"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {isLoading && !initializedRef.current ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.mutedForeground} />
          </View>
        ) : (
          <FlatList
            data={reversed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted={messages.length > 0}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!!messages.length}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              messages.length === 0 && !showTyping ? (
                <View style={styles.emptyChat}>
                  <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>
                    What can I help you with?
                  </Text>
                  <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
                    Ask me anything — I'm here to help.
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        <View
          style={{
            paddingBottom:
              Platform.OS === "web"
                ? 34
                : insets.bottom > 0
                ? insets.bottom
                : 8,
          }}
        >
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            onStop={handleStop}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  headerRight: {
    width: 22,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 12,
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 10,
  },
  emptyChatTitle: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyChatSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
