import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
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
} from "@workspace/api-client";
import { useColors } from "@/hooks/useColors";
import { ConversationItem } from "@/components/ConversationItem";

function groupByDate(conversations: OpenaiConversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sections: { title: string; data: OpenaiConversation[] }[] = [];
  const buckets: Record<string, OpenaiConversation[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    "Previous 30 days": [],
    Older: [],
  };

  for (const conv of sorted) {
    const d = new Date(conv.createdAt);
    if (d >= today) {
      buckets["Today"].push(conv);
    } else if (d >= yesterday) {
      buckets["Yesterday"].push(conv);
    } else if (d >= sevenDaysAgo) {
      buckets["Previous 7 days"].push(conv);
    } else if (d >= thirtyDaysAgo) {
      buckets["Previous 30 days"].push(conv);
    } else {
      buckets["Older"].push(conv);
    }
  }

  for (const [title, data] of Object.entries(buckets)) {
    if (data.length > 0) sections.push({ title, data });
  }

  return sections;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);

  const { data: conversations, isLoading, refetch, isRefetching } =
    useListOpenaiConversations({
      query: { queryKey: getListOpenaiConversationsQueryKey() },
    });

  const createConversation = useCreateOpenaiConversation({
    mutation: {
      onSuccess: (conversation) => {
        queryClient.invalidateQueries({
          queryKey: getListOpenaiConversationsQueryKey(),
        });
        router.push(`/chat/${conversation.id}`);
      },
      onError: () => {
        Alert.alert("Error", "Could not create conversation. Please try again.");
      },
    },
  });

  const deleteConversation = useDeleteOpenaiConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListOpenaiConversationsQueryKey(),
        });
      },
      onError: () => {
        Alert.alert("Error", "Could not delete conversation.");
      },
    },
  });

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Orval wraps the body in { data: ... }
    createConversation.mutate({ data: { title: "New Chat" } });
  }, [createConversation]);

  const handleDelete = useCallback(
    (conversation: OpenaiConversation) => {
      Alert.alert("Delete conversation?", `"${conversation.title}"`, [
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

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filtered = (conversations ?? []).filter((c) =>
    searchQuery.trim()
      ? c.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );
  const sections = groupByDate(filtered);

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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              setSearchVisible((v) => !v);
              setSearchQuery("");
            }}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Feather
              name={searchVisible ? "x" : "search"}
              size={20}
              color={colors.foreground}
            />
          </Pressable>
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
              <Feather name="edit-2" size={17} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      {searchVisible && (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.input,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Feather
            name="search"
            size={16}
            color={colors.mutedForeground}
            style={{ marginRight: 8 }}
          />
          <TextInput
            autoFocus
            style={[
              styles.searchInput,
              { color: colors.foreground, fontFamily: "Inter_400Regular" },
            ]}
            placeholder="Search conversations…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[styles.emptyIconWrap, { backgroundColor: colors.muted }]}
          >
            <Feather name="message-circle" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery ? "No results" : "Start a new chat"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery
              ? `No conversations match "${searchQuery}"`
              : "Ask Aria anything — she's ready to help."}
          </Text>
          {!searchQuery && (
            <Pressable
              onPress={handleNewChat}
              disabled={createConversation.isPending}
              style={({ pressed }) => [
                styles.emptyBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {createConversation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.emptyBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  New Chat
                </Text>
              )}
            </Pressable>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => router.push(`/chat/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: colors.background },
              ]}
            >
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                {section.title}
              </Text>
            </View>
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "web" ? 34 : insets.bottom + 16,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
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
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    marginTop: 8,
    minWidth: 120,
    alignItems: "center",
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
