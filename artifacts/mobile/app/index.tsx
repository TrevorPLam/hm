import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  type OpenaiConversation,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { ConversationItem } from "@/components/ConversationItem";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, refetch } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() },
  });

  const createConversation = useCreateOpenaiConversation({
    mutation: {
      onSuccess: (conversation) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        router.push(`/chat/${conversation.id}`);
      },
    },
  });

  const deleteConversation = useDeleteOpenaiConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      },
    },
  });

  const handleNewChat = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createConversation.mutate({ title: "New Chat" });
  }, [createConversation]);

  const handleDelete = useCallback(
    (conversation: OpenaiConversation) => {
      Alert.alert("Delete conversation?", conversation.title, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteConversation.mutate({ id: conversation.id });
          },
        },
      ]);
    },
    [deleteConversation]
  );

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Aria
        </Text>
        <Pressable
          onPress={handleNewChat}
          disabled={createConversation.isPending}
          style={({ pressed }) => [
            styles.newChatBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          testID="new-chat-button"
        >
          {createConversation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="edit" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* Conversation List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : !conversations?.length ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No conversations yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Start a new chat to get going
          </Text>
          <Pressable
            onPress={handleNewChat}
            style={({ pressed }) => [
              styles.emptyBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
              New Chat
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={[...(conversations ?? [])].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => router.push(`/chat/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          onRefresh={refetch}
          refreshing={isLoading}
          scrollEnabled={!!conversations?.length}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  newChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
