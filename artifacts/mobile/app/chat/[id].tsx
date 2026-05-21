import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Share,
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
import { SuggestedPrompts } from "@/components/SuggestedPrompts";
import { streamChat } from "@/lib/api";

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface Message {
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
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
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

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;
      setStreamError(null);
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
            scrollToBottom();
          },
          controller.signal
        );

        // Invalidate after streaming done
        queryClient.invalidateQueries({
          queryKey: getGetOpenaiConversationQueryKey(conversationId),
        });
        queryClient.invalidateQueries({
          queryKey: getListOpenaiConversationsQueryKey(),
        });
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error?.name !== "AbortError") {
          setShowTyping(false);
          setStreamError("Something went wrong. Tap to retry.");
          if (!assistantAdded) {
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: "assistant",
                content: "Sorry, I ran into an error. Please try again.",
              },
            ]);
          }
        }
      } finally {
        setIsStreaming(false);
        setShowTyping(false);
        abortRef.current = null;
      }
    },
    [conversationId, isStreaming, queryClient, scrollToBottom]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleShare = useCallback(async () => {
    if (!messages.length) return;
    const text = messages
      .map((m) => `${m.role === "user" ? "You" : "Aria"}: ${m.content}`)
      .join("\n\n");
    try {
      await Share.share({ message: text, title: conversation?.title ?? "Chat" });
    } catch {}
  }, [messages, conversation?.title]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
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
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerBtn,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {conversation?.title ?? "Chat"}
        </Text>

        <Pressable
          onPress={handleShare}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerBtn,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Feather name="share" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Messages + Input */}
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
            ref={flatListRef}
            data={reversed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted={messages.length > 0}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            ListFooterComponent={
              messages.length === 0 && !showTyping ? (
                <SuggestedPrompts onSelect={handleSend} />
              ) : null
            }
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && styles.listEmpty,
            ]}
          />
        )}

        {/* Stream error banner */}
        {streamError && (
          <Pressable
            onPress={() => setStreamError(null)}
            style={[styles.errorBanner, { backgroundColor: colors.destructive }]}
          >
            <Feather name="alert-circle" size={14} color="#fff" />
            <Text style={styles.errorText}>{streamError}</Text>
          </Pressable>
        )}

        <View
          style={{
            paddingBottom:
              Platform.OS === "web"
                ? 20
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
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
