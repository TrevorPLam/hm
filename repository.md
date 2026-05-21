# Repository Code Consolidation

This document contains all native code files from the repository.
Generated on: 2026-05-21T01:49:14.281Z

---

## File: .agents/agent_assets_metadata.toml

```toml
uploads = []
outputs = []

[[generated]]
id = "kD2k1sFuLn2diq6PFjGzh"
uri = "file://artifacts/mobile/assets/images/icon.png"
type = "image"
title = "aria ai icon"

```

---

## File: artifacts/api-server/build.mjs

```javascript
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

```

---

## File: artifacts/api-server/package.json

```json
{
  "name": "@workspace/api-server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "export NODE_ENV=development && pnpm run build && pnpm run start",
    "build": "node ./build.mjs",
    "start": "node --enable-source-maps ./dist/index.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@workspace/api-zod": "workspace:*",
    "@workspace/db": "workspace:*",
    "@workspace/integrations-openai-ai-server": "workspace:*",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "drizzle-orm": "catalog:",
    "express": "^5.2.1",
    "pino": "^9.14.0",
    "pino-http": "^10.5.0"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "catalog:",
    "esbuild": "0.27.3",
    "esbuild-plugin-pino": "^2.3.3",
    "pino-pretty": "^13.1.3",
    "thread-stream": "3.1.0"
  }
}

```

---

## File: artifacts/api-server/src/app.ts

```typescript
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;

```

---

## File: artifacts/api-server/src/index.ts

```typescript
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

```

---

## File: artifacts/api-server/src/lib/logger.ts

```typescript
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

```

---

## File: artifacts/api-server/src/routes/health.ts

```typescript
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;

```

---

## File: artifacts/api-server/src/routes/index.ts

```typescript
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);

export default router;

```

---

## File: artifacts/api-server/src/routes/openai/conversations.ts

```typescript
import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, asc } from "drizzle-orm";

const router = Router();

// List all conversations
router.get("/", async (req, res) => {
  const all = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(all);
});

// Create a conversation
router.post("/", async (req, res) => {
  const { title } = req.body as { title: string };
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [conv] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(conv);
});

// Get conversation with messages
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

// Delete a conversation
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

// List messages
router.get("/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

// Send message — streaming SSE
router.post("/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const { content } = req.body as { content: string };

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content,
  });

  // Load full history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Update conversation title from first user message
  if (conv.title === "New Chat" && history.filter((m) => m.role === "user").length === 1) {
    const shortTitle = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    await db.update(conversations).set({ title: shortTitle }).where(eq(conversations.id, id));
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    // Save assistant response
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "Streaming error");
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;

```

---

## File: artifacts/api-server/src/routes/openai/index.ts

```typescript
import { Router } from "express";
import conversationsRouter from "./conversations";

const router = Router();

router.use("/conversations", conversationsRouter);

export default router;

```

---

## File: artifacts/api-server/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"],
  "references": [
    {
      "path": "../../lib/db"
    },
    {
      "path": "../../lib/api-zod"
    },
    {
      "path": "../../lib/integrations-openai-ai-server"
    }
  ]
}

```

---

## File: artifacts/mobile/app.json

```json
{
  "expo": {
    "name": "Aria AI",
    "slug": "mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mobile",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0D0D0D"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {},
    "web": {
      "favicon": "./assets/images/icon.png"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://replit.com/"
        }
      ],
      "expo-font",
      "expo-web-browser"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}

```

---

## File: artifacts/mobile/app/_layout.tsx

```typescript
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";

// Wire up API base URL for Expo — must be outside component
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

```

---

## File: artifacts/mobile/app/+not-found.tsx

```typescript
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          This screen doesn&apos;t exist.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});

```

---

## File: artifacts/mobile/app/chat/_layout.tsx

```typescript
import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

```

---

## File: artifacts/mobile/app/chat/[id].tsx

```typescript
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

```

---

## File: artifacts/mobile/app/index.tsx

```typescript
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
} from "@workspace/api-client-react";
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

```

---

## File: artifacts/mobile/babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
  };
};

```

---

## File: artifacts/mobile/components/ChatInput.tsx

```typescript
import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, disabled, onStop }: Props) {
  const colors = useColors();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText("");
    onSend(trimmed);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.input,
            borderRadius: 24,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
            },
          ]}
          placeholder="Message"
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          testID="chat-input"
        />
        <Pressable
          onPress={disabled && onStop ? onStop : handleSend}
          disabled={!disabled && !text.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor:
                text.trim() || disabled ? colors.primary : colors.muted,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          testID="send-button"
        >
          {disabled ? (
            <Feather name="square" size={16} color="#FFFFFF" />
          ) : (
            <Feather name="arrow-up" size={18} color={text.trim() ? "#FFFFFF" : colors.mutedForeground} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "web" ? 12 : 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
});

```

---

## File: artifacts/mobile/components/ConversationItem.tsx

```typescript
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { OpenaiConversation } from "@workspace/api-client-react";

interface Props {
  conversation: OpenaiConversation;
  onPress: () => void;
  onDelete: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function ConversationItem({ conversation, onPress, onDelete }: Props) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.muted : "transparent",
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <Feather name="message-square" size={18} color={colors.mutedForeground} />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {conversation.title}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formatDate(conversation.createdAt)}
        </Text>
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={12}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    alignItems: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

```

---

## File: artifacts/mobile/components/ErrorBoundary.tsx

```typescript
import React, { Component, ComponentType, PropsWithChildren } from "react";

import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

/**
 * This is a special case for for using the class components. Error boundaries must be class components because React only provides error boundary functionality through lifecycle methods (componentDidCatch and getDerivedStateFromError) which are not available in functional components.
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}

```

---

## File: artifacts/mobile/components/ErrorFallback.tsx

```typescript
import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.topButton,
            {
              top: insets.top + 16,
              backgroundColor: colors.card,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="alert-circle" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Something went wrong
        </Text>

        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          Please reload the app to continue.
        </Text>

        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              { color: colors.primaryForeground },
            ]}
          >
            Try Again
          </Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Error Details
                </Text>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: insets.bottom + 16 },
                ]}
                showsVerticalScrollIndicator
              >
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.errorText,
                      {
                        color: colors.foreground,
                        fontFamily: monoFont,
                      },
                    ]}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    maxWidth: 600,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  topButton: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  errorContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});

```

---

## File: artifacts/mobile/components/KeyboardAwareScrollViewCompat.tsx

```typescript
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

```

---

## File: artifacts/mobile/components/MessageBubble.tsx

```typescript
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

```

---

## File: artifacts/mobile/components/SuggestedPrompts.tsx

```typescript
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

```

---

## File: artifacts/mobile/components/TypingIndicator.tsx

```typescript
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useColors } from "@/hooks/useColors";

export function TypingIndicator() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={[styles.container, { paddingHorizontal: 16 }]}>
      <View style={styles.row}>
        <View
          style={[styles.avatar, { backgroundColor: colors.primary }]}
        />
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.assistantBubble,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={styles.dots}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: colors.mutedForeground },
                  dotStyle(dot),
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

```

---

## File: artifacts/mobile/constants/colors.ts

```typescript
const colors = {
  light: {
    text: "#0D0D0D",
    tint: "#1A73E8",
    background: "#FFFFFF",
    foreground: "#0D0D0D",
    card: "#F5F5F5",
    cardForeground: "#0D0D0D",
    primary: "#1A73E8",
    primaryForeground: "#FFFFFF",
    secondary: "#EBEBEB",
    secondaryForeground: "#0D0D0D",
    muted: "#F0F0F0",
    mutedForeground: "#8A8A8A",
    accent: "#1A73E8",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#E5E5E5",
    input: "#EFEFEF",
    userBubble: "#1A73E8",
    userBubbleText: "#FFFFFF",
    assistantBubble: "#F0F0F0",
    assistantBubbleText: "#0D0D0D",
  },
  dark: {
    text: "#F5F5F5",
    tint: "#4A9EFF",
    background: "#0D0D0D",
    foreground: "#F5F5F5",
    card: "#1A1A1A",
    cardForeground: "#F5F5F5",
    primary: "#4A9EFF",
    primaryForeground: "#FFFFFF",
    secondary: "#252525",
    secondaryForeground: "#F5F5F5",
    muted: "#1E1E1E",
    mutedForeground: "#888888",
    accent: "#4A9EFF",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#2A2A2A",
    input: "#1E1E1E",
    userBubble: "#4A9EFF",
    userBubbleText: "#FFFFFF",
    assistantBubble: "#1E1E1E",
    assistantBubbleText: "#F5F5F5",
  },
  radius: 16,
};

export default colors;

```

---

## File: artifacts/mobile/hooks/useColors.ts

```typescript
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when no dark key is defined in
 * constants/colors.ts (the scaffold ships light-only by default).
 * When a sibling web artifact's dark tokens are synced into a `dark`
 * key, this hook will automatically switch palettes based on the
 * device's appearance setting.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}

```

---

## File: artifacts/mobile/lib/api.ts

```typescript
import { fetch } from "expo/fetch";

let _baseUrl = "";

export function getApiUrl(): string {
  if (_baseUrl) return _baseUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/`;
  return "http://localhost/";
}

export function setApiBaseUrl(url: string) {
  _baseUrl = url;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
}

export async function streamChat(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const baseUrl = getApiUrl();
  const response = await fetch(
    `${baseUrl}api/openai/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed: StreamChunk = JSON.parse(data);
        if (parsed.content) onChunk(parsed.content);
      } catch {}
    }
  }
}

```

---

## File: artifacts/mobile/metro.config.js

```javascript
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);

```

---

## File: artifacts/mobile/package.json

```json
{
  "name": "@workspace/mobile",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "EXPO_PACKAGER_PROXY_URL=https://$REPLIT_EXPO_DEV_DOMAIN EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN EXPO_PUBLIC_REPL_ID=$REPL_ID REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN pnpm exec expo start --localhost --port $PORT",
    "build": "node scripts/build.js",
    "serve": "node server/serve.js",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@expo-google-fonts/inter": "^0.4.0",
    "@expo/cli": "54.0.23",
    "@expo/ngrok": "^4.1.0",
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@stardazed/streams-text-encoding": "^1.0.2",
    "@tanstack/react-query": "catalog:",
    "@types/react": "~19.1.10",
    "@types/react-dom": "~19.1.7",
    "@ungap/structured-clone": "^1.3.0",
    "@workspace/api-client-react": "workspace:*",
    "babel-plugin-react-compiler": "^19.0.0-beta-e993439-20250117",
    "expo": "~54.0.27",
    "expo-blur": "~15.0.8",
    "expo-constants": "~18.0.11",
    "expo-font": "~14.0.10",
    "expo-glass-effect": "~0.1.4",
    "expo-haptics": "~15.0.8",
    "expo-image": "~3.0.11",
    "expo-image-picker": "~17.0.9",
    "expo-linear-gradient": "~15.0.8",
    "expo-linking": "~8.0.10",
    "expo-location": "~19.0.8",
    "expo-router": "~6.0.17",
    "expo-splash-screen": "~31.0.12",
    "expo-status-bar": "~3.0.9",
    "expo-symbols": "~1.0.8",
    "expo-system-ui": "~6.0.9",
    "expo-web-browser": "~15.0.10",
    "react": "catalog:",
    "react-dom": "catalog:",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-keyboard-controller": "1.18.5",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-web": "^0.21.0",
    "react-native-worklets": "0.5.1",
    "typescript": "~5.9.2",
    "zod": "catalog:",
    "zod-validation-error": "^3.4.0"
  },
  "dependencies": {
    "expo-clipboard": "~8.0.8"
  }
}

```

---

## File: artifacts/mobile/scripts/build.js

```javascript
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

let metroProcess = null;

const projectRoot = path.resolve(__dirname, "..");

function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error("Could not find workspace root (no pnpm-workspace.yaml found)");
}

const workspaceRoot = findWorkspaceRoot(projectRoot);
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

function exitWithError(message) {
  console.error(message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
}

function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log("Cleaning up Metro process...");
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
}

function stripProtocol(domain) {
  let urlString = domain.trim();

  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  return new URL(urlString).host;
}

function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);
  }

  console.error(
    "ERROR: No deployment domain found. Set REPLIT_INTERNAL_APP_DOMAIN, REPLIT_DEV_DOMAIN, or EXPO_PUBLIC_DOMAIN",
  );
  process.exit(1);
}

function prepareDirectories(timestamp) {
  console.log("Preparing build directories...");

  const staticBuild = path.join(projectRoot, "static-build");
  if (fs.existsSync(staticBuild)) {
    fs.rmSync(staticBuild, { recursive: true });
  }

  const dirs = [
    path.join(staticBuild, timestamp, "_expo", "static", "js", "ios"),
    path.join(staticBuild, timestamp, "_expo", "static", "js", "android"),
    path.join(staticBuild, "ios"),
    path.join(staticBuild, "android"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Build:", timestamp);
}

function clearMetroCache() {
  console.log("Clearing Metro cache...");

  const cacheDirs = [
    path.join(projectRoot, ".metro-cache"),
    path.join(projectRoot, "node_modules/.cache/metro"),
  ];

  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log("Cache cleared");
}

async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status", {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function getExpoPublicReplId() {
  return process.env.REPL_ID || process.env.EXPO_PUBLIC_REPL_ID;
}

async function startMetro(expoPublicDomain, expoPublicReplId) {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro already running");
    return;
  }

  console.log("Starting Metro...");
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${expoPublicDomain}`);
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
    EXPO_PUBLIC_REPL_ID: expoPublicReplId,
  };

  if (expoPublicReplId) {
    console.log(`Setting EXPO_PUBLIC_REPL_ID=${expoPublicReplId}`);
  }

  metroProcess = spawn(
    "pnpm",
    [
      "exec",
      "expo",
      "start",
      "--no-dev",
      "--minify",
      "--localhost",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      cwd: projectRoot,
      env,
    },
  );

  if (metroProcess.stdout) {
    metroProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[Metro] ${output}`);
    });
  }
  if (metroProcess.stderr) {
    metroProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.error(`[Metro Error] ${output}`);
    });
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log("Metro ready");
      return;
    }
  }

  console.error("Metro timeout");
  process.exit(1);
}

async function downloadFile(url, outputPath) {
  const controller = new AbortController();
  const fiveMinMS = 5 * 60 * 1_000;
  const timeoutId = setTimeout(() => controller.abort(), fiveMinMS);

  try {
    console.log(`Downloading: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const file = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(response.body), file);

    const fileSize = fs.statSync(outputPath).size;

    if (fileSize === 0) {
      fs.unlinkSync(outputPath);
      throw new Error("Downloaded file is empty");
    }
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    if (error.name === "AbortError") {
      throw new Error(`Download timeout after 5m: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundle(platform, timestamp) {
  const entryPath = path.resolve(projectRoot, "node_modules", "expo-router", "entry");
  const bundlePath = path.relative(workspaceRoot, entryPath);
  const url = new URL(`http://localhost:8081/${bundlePath}.bundle`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("dev", "false");
  url.searchParams.set("hot", "false");
  url.searchParams.set("lazy", "false");
  url.searchParams.set("minify", "true");

  const output = path.join(
    "static-build",
    timestamp,
    "_expo",
    "static",
    "js",
    platform,
    "bundle.js",
  );

  console.log(`Fetching ${platform} bundle...`);
  await downloadFile(url.toString(), output);
  console.log(`${platform} bundle ready`);
}

async function downloadManifest(platform) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  try {
    console.log(`Fetching ${platform} manifest...`);
    const response = await fetch("http://localhost:8081/manifest", {
      headers: { "expo-platform": platform },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = await response.json();
    console.log(`${platform} manifest ready`);
    return manifest;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `Manifest download timeout after 5m for platform: ${platform}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundlesAndManifests(timestamp) {
  console.log("Downloading bundles and manifests...");
  console.log("This may take several minutes for production builds...");

  try {
    // Bundles are sequential — Metro can't handle both platforms simultaneously
    // without stalling. Manifests are cheap and run in parallel after.
    await downloadBundle("ios", timestamp);
    await downloadBundle("android", timestamp);

    const [iosManifest, androidManifest] = await Promise.all([
      downloadManifest("ios"),
      downloadManifest("android"),
    ]);

    console.log("All downloads completed successfully");
    return { ios: iosManifest, android: androidManifest };
  } catch (error) {
    exitWithError(`Download failed: ${error.message}`);
  }
}

function extractAssets(timestamp) {
  const staticBuild = path.join(projectRoot, "static-build");
  const bundles = {
    ios: fs.readFileSync(
      path.join(staticBuild, timestamp, "_expo", "static", "js", "ios", "bundle.js"),
      "utf-8",
    ),
    android: fs.readFileSync(
      path.join(staticBuild, timestamp, "_expo", "static", "js", "android", "bundle.js"),
      "utf-8",
    ),
  };

  const assetsMap = new Map();
  const assetPattern =
    /httpServerLocation:"([^"]+)"[^}]*hash:"([^"]+)"[^}]*name:"([^"]+)"[^}]*type:"([^"]+)"/g;

  const extractFromBundle = (bundle, platform) => {
    for (const match of bundle.matchAll(assetPattern)) {
      const originalPath = match[1];
      const filename = match[3] + "." + match[4];

      const tempUrl = new URL(`http://localhost:8081${originalPath}`);
      const unstablePath = tempUrl.searchParams.get("unstable_path");

      if (!unstablePath) {
        throw new Error(`Asset missing unstable_path: ${originalPath}`);
      }

      const decodedPath = decodeURIComponent(unstablePath);
      const key = path.posix.join(decodedPath, filename);

      if (!assetsMap.has(key)) {
        const asset = {
          url: path.posix.join("/", decodedPath, filename),
          originalPath: originalPath,
          filename: filename,
          relativePath: decodedPath,
          hash: match[2],
          platforms: new Set(),
        };

        assetsMap.set(key, asset);
      }
      assetsMap.get(key).platforms.add(platform);
    }
  };

  extractFromBundle(bundles.ios, "ios");
  extractFromBundle(bundles.android, "android");

  return Array.from(assetsMap.values());
}

async function downloadAssets(assets, timestamp) {
  if (assets.length === 0) {
    return 0;
  }

  console.log("Copying assets...");
  let successCount = 0;
  const failures = [];

  const downloadPromises = assets.map(async (asset) => {
    const tempUrl = new URL(`http://localhost:8081${asset.originalPath}`);
    const unstablePath = tempUrl.searchParams.get("unstable_path");

    if (!unstablePath) {
      throw new Error(`Asset missing unstable_path: ${asset.originalPath}`);
    }

    const decodedPath = decodeURIComponent(unstablePath);

    const outputDir = path.join(
      projectRoot,
      "static-build",
      timestamp,
      "_expo",
      "static",
      "js",
      asset.relativePath,
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const output = path.join(outputDir, asset.filename);

    try {
      const candidates = [
        path.join(projectRoot, decodedPath, asset.filename),
        path.join(workspaceRoot, decodedPath, asset.filename),
      ];
      const found = candidates.find((p) => fs.existsSync(p));
      if (!found) {
        throw new Error(`Asset not found on disk: ${asset.filename}`);
      }
      fs.copyFileSync(found, output);
      successCount++;
    } catch (error) {
      failures.push({
        filename: asset.filename,
        error: error.message,
        url: asset.originalPath,
      });
    }
  });

  await Promise.all(downloadPromises);

  if (failures.length > 0) {
    const errorMsg =
      `Failed to download ${failures.length} asset(s):\n` +
      failures
        .map((f) => `  - ${f.filename}: ${f.error} (${f.url})`)
        .join("\n");
    exitWithError(errorMsg);
  }

  console.log(`Copied ${successCount} assets`);
  return successCount;
}

function updateBundleUrls(timestamp, baseUrl) {
  const updateForPlatform = (platform) => {
    const bundlePath = path.join(
      projectRoot,
      "static-build",
      timestamp,
      "_expo",
      "static",
      "js",
      platform,
      "bundle.js",
    );
    let bundle = fs.readFileSync(bundlePath, "utf-8");

    bundle = bundle.replace(
      /httpServerLocation:"(\/[^"]+)"/g,
      (_match, capturedPath) => {
        const tempUrl = new URL(`http://localhost:8081${capturedPath}`);
        const unstablePath = tempUrl.searchParams.get("unstable_path");

        if (!unstablePath) {
          throw new Error(
            `Asset missing unstable_path in bundle: ${capturedPath}`,
          );
        }

        const decodedPath = decodeURIComponent(unstablePath);
        return `httpServerLocation:"${baseUrl}${basePath}/${timestamp}/_expo/static/js/${decodedPath}"`;
      },
    );

    fs.writeFileSync(bundlePath, bundle);
  };

  updateForPlatform("ios");
  updateForPlatform("android");
  console.log("Updated bundle URLs");
}

function updateManifests(manifests, timestamp, baseUrl, assetsByHash) {
  const updateForPlatform = (platform, manifest) => {
    if (!manifest.launchAsset || !manifest.extra) {
      exitWithError(`Malformed manifest for ${platform}`);
    }

    manifest.launchAsset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${platform}/bundle.js`;
    manifest.launchAsset.key = `bundle-${timestamp}`;
    manifest.createdAt = new Date(
      Number(timestamp.split("-")[0]),
    ).toISOString();
    manifest.extra.expoClient.hostUri =
      baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.debuggerHost =
      baseUrl.replace("https://", "") + "/" + platform;
    manifest.extra.expoGo.packagerOpts.dev = false;

    if (manifest.assets && manifest.assets.length > 0) {
      manifest.assets.forEach((asset) => {
        if (!asset.url) return;

        const hash = asset.hash;
        if (!hash) return;

        const assetInfo = assetsByHash.get(hash);
        if (!assetInfo) return;

        asset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${assetInfo.relativePath}/${assetInfo.filename}`;
      });
    }

    fs.writeFileSync(
      path.join(projectRoot, "static-build", platform, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  };

  updateForPlatform("ios", manifests.ios);
  updateForPlatform("android", manifests.android);
  console.log("Manifests updated");
}

async function main() {
  console.log("Building static Expo Go deployment...");

  setupSignalHandlers();

  const domain = getDeploymentDomain();
  const expoPublicReplId = getExpoPublicReplId();
  const baseUrl = `https://${domain}`;
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  await startMetro(domain, expoPublicReplId);

  const downloadTimeout = 600000;
  const downloadPromise = downloadBundlesAndManifests(timestamp);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Overall download timeout after ${downloadTimeout / 1000} seconds. ` +
            "Metro may be struggling to generate bundles. Check Metro logs above.",
        ),
      );
    }, downloadTimeout);
  });

  const manifests = await Promise.race([downloadPromise, timeoutPromise]);

  console.log("Processing assets...");
  const assets = extractAssets(timestamp);
  console.log("Found", assets.length, "unique asset(s)");

  const assetsByHash = new Map();
  for (const asset of assets) {
    assetsByHash.set(asset.hash, {
      relativePath: asset.relativePath,
      filename: asset.filename,
    });
  }

  const assetCount = await downloadAssets(assets, timestamp);

  if (assetCount > 0) {
    updateBundleUrls(timestamp, baseUrl);
  }

  console.log("Updating manifests and creating landing page...");
  updateManifests(manifests, timestamp, baseUrl, assetsByHash);

  console.log("Build complete! Deploy to:", baseUrl);

  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Build failed:", error.message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
});

```

---

## File: artifacts/mobile/server/serve.js

```javascript
/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }

    if (pathname === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});

```

---

## File: artifacts/mobile/tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "baseUrl": ".",
    "strict": true,
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "references": [
    {
      "path": "../../lib/api-client-react"
    }
  ]
}

```

---

## File: artifacts/mockup-sandbox/components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}

```

---

## File: artifacts/mockup-sandbox/mockupPreviewPlugin.ts

```typescript
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import glob from "fast-glob";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import type { Plugin } from "vite";

const MOCKUPS_DIR = "src/components/mockups";
const GENERATED_MODULE = "src/.generated/mockup-components.ts";

interface DiscoveredComponent {
  globKey: string;
  importPath: string;
}

export function mockupPreviewPlugin(): Plugin {
  let root = "";
  let currentSource = "";
  let watcher: FSWatcher | null = null;

  function getMockupsAbsDir(): string {
    return path.join(root, MOCKUPS_DIR);
  }

  function getGeneratedModuleAbsPath(): string {
    return path.join(root, GENERATED_MODULE);
  }

  function isMockupFile(absolutePath: string): boolean {
    const rel = path.relative(getMockupsAbsDir(), absolutePath);
    return (
      !rel.startsWith("..") && !path.isAbsolute(rel) && rel.endsWith(".tsx")
    );
  }

  function isPreviewTarget(relativeToMockups: string): boolean {
    return relativeToMockups
      .split(path.sep)
      .every((segment) => !segment.startsWith("_"));
  }

  async function discoverComponents(): Promise<Array<DiscoveredComponent>> {
    const files = await glob(`${MOCKUPS_DIR}/**/*.tsx`, {
      cwd: root,
      ignore: ["**/_*/**", "**/_*.tsx"],
    });

    return files.map((f) => ({
      globKey: "./" + f.slice("src/".length),
      importPath: path.posix.relative("src/.generated", f),
    }));
  }

  function generateSource(components: Array<DiscoveredComponent>): string {
    const entries = components
      .map(
        (c) =>
          `  ${JSON.stringify(c.globKey)}: () => import(${JSON.stringify(c.importPath)})`,
      )
      .join(",\n");

    return [
      "// This file is auto-generated by mockupPreviewPlugin.ts.",
      "type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;",
      "export const modules: ModuleMap = {",
      entries,
      "};",
      "",
    ].join("\n");
  }

  function shouldAutoRescan(pathname: string): boolean {
    return (
      pathname.includes("/components/mockups/") ||
      pathname.includes("/.generated/mockup-components")
    );
  }

  let refreshInFlight = false;
  let refreshQueued = false;

  async function refresh(): Promise<boolean> {
    if (refreshInFlight) {
      refreshQueued = true;
      return false;
    }

    refreshInFlight = true;
    let changed = false;
    try {
      const components = await discoverComponents();
      const newSource = generateSource(components);
      if (newSource !== currentSource) {
        currentSource = newSource;
        const generatedModuleAbsPath = getGeneratedModuleAbsPath();
        mkdirSync(path.dirname(generatedModuleAbsPath), { recursive: true });
        writeFileSync(generatedModuleAbsPath, currentSource);
        changed = true;
      }
    } finally {
      refreshInFlight = false;
    }

    if (refreshQueued) {
      refreshQueued = false;
      const followUp = await refresh();
      return changed || followUp;
    }

    return changed;
  }

  async function onFileAddedOrRemoved(): Promise<void> {
    await refresh();
  }

  return {
    name: "mockup-preview",
    enforce: "pre",

    configResolved(config) {
      root = config.root;
    },

    async buildStart() {
      await refresh();
    },

    async configureServer(viteServer) {
      await refresh();

      const mockupsAbsDir = getMockupsAbsDir();
      mkdirSync(mockupsAbsDir, { recursive: true });

      watcher = chokidar.watch(mockupsAbsDir, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      watcher.on("add", (file) => {
        if (
          isMockupFile(file) &&
          isPreviewTarget(path.relative(mockupsAbsDir, file))
        ) {
          void onFileAddedOrRemoved();
        }
      });

      watcher.on("unlink", (file) => {
        if (isMockupFile(file)) {
          void onFileAddedOrRemoved();
        }
      });

      viteServer.middlewares.use((req, res, next) => {
        const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
        const pathname = requestUrl.pathname;
        const originalEnd = res.end.bind(res);

        res.end = ((...args: Parameters<typeof originalEnd>) => {
          if (res.statusCode === 404 && shouldAutoRescan(pathname)) {
            void refresh();
          }
          return originalEnd(...args);
        }) as typeof res.end;

        next();
      });
    },

    async closeWatcher() {
      if (watcher) {
        await watcher.close();
      }
    },
  };
}

```

---

## File: artifacts/mockup-sandbox/package.json

```json
{
  "name": "@workspace/mockup-sandbox",
  "version": "2.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toast": "^1.2.15",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@replit/vite-plugin-cartographer": "catalog:",
    "@replit/vite-plugin-runtime-error-modal": "catalog:",
    "@tailwindcss/vite": "catalog:",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "catalog:",
    "chokidar": "^4.0.3",
    "class-variance-authority": "catalog:",
    "clsx": "catalog:",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "fast-glob": "^3.3.3",
    "framer-motion": "catalog:",
    "input-otp": "^1.4.2",
    "lucide-react": "catalog:",
    "next-themes": "^0.4.6",
    "react": "catalog:",
    "react-day-picker": "^9.14.0",
    "react-dom": "catalog:",
    "react-hook-form": "^7.75.0",
    "react-resizable-panels": "^2.1.9",
    "recharts": "^2.15.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "catalog:",
    "tailwindcss": "catalog:",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.4.0",
    "vaul": "^1.1.2",
    "vite": "catalog:",
    "zod": "catalog:"
  }
}

```

---

## File: artifacts/mockup-sandbox/src/.generated/mockup-components.ts

```typescript
// This file is auto-generated by mockupPreviewPlugin.ts.
type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;
export const modules: ModuleMap = {

};

```

---

## File: artifacts/mockup-sandbox/src/App.tsx

```typescript
import { useEffect, useState, type ComponentType } from "react";

import { modules as discoveredModules } from "./.generated/mockup-components";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) {
          return;
        }
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return null;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function getPreviewExamplePath(): string {
  const basePath = getBasePath();
  return `${basePath}/preview/ComponentName`;
}

function Gallery() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Component Preview Server
        </h1>
        <p className="text-gray-500 mb-4">
          This server renders individual components for the workspace canvas.
        </p>
        <p className="text-sm text-gray-400">
          Access component previews at{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
            {getPreviewExamplePath()}
          </code>
        </p>
      </div>
    </div>
  );
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname } = window.location;
  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const previewPath = getPreviewPath();

  if (previewPath) {
    return (
      <PreviewRenderer
        componentPath={previewPath}
        modules={discoveredModules}
      />
    );
  }

  return <Gallery />;
}

export default App;

```

---

## File: artifacts/mockup-sandbox/src/components/ui/accordion.tsx

```typescript
import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/alert-dialog.tsx

```typescript
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/alert.tsx

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/aspect-ratio.tsx

```typescript
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/avatar.tsx

```typescript
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/badge.tsx

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        outline: "text-foreground border [border-color:var(--badge-outline)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/breadcrumb.tsx

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
      className
    )}
    {...props}
  />
))
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-foreground", className)}
    {...props}
  />
))
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/button-group.tsx

```typescript
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      className={cn(
        "bg-muted shadow-xs flex items-center gap-2 rounded-md border px-4 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto",
        className
      )}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/button.tsx

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
" hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          "border [border-color:var(--button-outline)] shadow-xs active:shadow-none",
        secondary:
          "border bg-secondary text-secondary-foreground border border-secondary-border",
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/calendar.tsx

```typescript
"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/card.tsx

```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/carousel.tsx

```typescript
import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)

      return () => {
        api?.off("select", onSelect)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute  h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/chart.tsx

```typescript
import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload
            .filter((item) => item.type !== "none")
            .map((item, index) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`
              const itemConfig = getPayloadConfigFromPayload(config, item, key)
              const indicatorColor = color || item.payload.fill || item.color

              return (
                <div
                  key={item.dataKey}
                  className={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator === "dot" && "items-center"
                  )}
                >
                  {formatter && item?.value !== undefined && item.name ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <>
                      {itemConfig?.icon ? (
                        <itemConfig.icon />
                      ) : (
                        !hideIndicator && (
                          <div
                            className={cn(
                              "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                              {
                                "h-2.5 w-2.5": indicator === "dot",
                                "w-1": indicator === "line",
                                "w-0 border-[1.5px] border-dashed bg-transparent":
                                  indicator === "dashed",
                                "my-0.5": nestLabel && indicator === "dashed",
                              }
                            )}
                            style={
                              {
                                "--color-bg": indicatorColor,
                                "--color-border": indicatorColor,
                              } as React.CSSProperties
                            }
                          />
                        )
                      )}
                      <div
                        className={cn(
                          "flex flex-1 justify-between leading-none",
                          nestLabel ? "items-end" : "items-center"
                        )}
                      >
                        <div className="grid gap-1.5">
                          {nestLabel ? tooltipLabel : null}
                          <span className="text-muted-foreground">
                            {itemConfig?.label || item.name}
                          </span>
                        </div>
                        {item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {item.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload
          .filter((item) => item.type !== "none")
          .map((item) => {
            const key = `${nameKey || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)

            return (
              <div
                key={item.value}
                className={cn(
                  "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
                )}
              >
                {itemConfig?.icon && !hideIcon ? (
                  <itemConfig.icon />
                ) : (
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                )}
                {itemConfig?.label}
              </div>
            )
          })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/checkbox.tsx

```typescript
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/collapsible.tsx

```typescript
"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/command.tsx

```typescript
"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/context-menu.tsx

```typescript
import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
))
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-context-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 max-h-[--radix-context-menu-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-context-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/dialog.tsx

```typescript
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/drawer.tsx

```typescript
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/dropdown-menu.tsx

```typescript
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/empty.tsx

```typescript
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/field.tsx

```typescript
"use client"

import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-6",
        "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-medium",
        "data-[variant=legend]:text-base",
        "data-[variant=label]:text-sm",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field data-[invalid=true]:text-destructive flex w-full gap-3",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "flex-row items-center",
          "[&>[data-slot=field-label]]:flex-auto",
          "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start",
        ],
        responsive: [
          "@md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto",
          "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
          "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>[data-slot=field]]:p-4",
        "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-sm font-normal leading-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
        "nth-last-2:-mt-1 last:mt-0 [[data-variant=legend]+&]:-mt-1.5",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors) {
      return null
    }

    if (errors?.length === 1 && errors[0]?.message) {
      return errors[0].message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-destructive text-sm font-normal", className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/form.tsx

```typescript
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>")
  }

  const fieldState = getFieldState(fieldContext.name, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/hover-card.tsx

```typescript
import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-hover-card-content-transform-origin]",
      className
    )}
    {...props}
  />
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/input-group.tsx

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group border-input dark:bg-input/30 shadow-xs relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow]",
        "h-9 has-[>textarea]:h-auto",

        "has-[>[data-align=inline-start]]:[&>input]:pl-2",
        "has-[>[data-align=inline-end]]:[&>input]:pr-2",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",

        "has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1",

        "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",

        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "text-muted-foreground flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
        "inline-end":
          "order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]",
        "block-start":
          "[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5",
        "block-end":
          "[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/input-otp.tsx

```typescript
import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/input.tsx

```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/item.tsx

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex flex-col", className)}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-0", className)}
      {...props}
    />
  )
}

const itemVariants = cva(
  "group/item [a]:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 [a]:transition-colors flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted/50",
      },
      size: {
        default: "gap-4 p-4 ",
        sm: "gap-2.5 px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted size-8 rounded-sm border [&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        className
      )}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium leading-snug",
        className
      )}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "text-muted-foreground line-clamp-2 text-balance text-sm font-normal leading-normal",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        "flex basis-full items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/kbd.tsx

```typescript
import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/label.tsx

```typescript
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/menubar.tsx

```typescript
import * as React from "react"
import * as MenubarPrimitive from "@radix-ui/react-menubar"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu {...props} />
}

function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group {...props} />
}

function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal {...props} />
}

function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup {...props} />
}

function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />
}

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm",
      className
    )}
    {...props}
  />
))
Menubar.displayName = MenubarPrimitive.Root.displayName

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      className
    )}
    {...props}
  />
))
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
))
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-menubar-content-transform-origin]",
      className
    )}
    {...props}
  />
))
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(
  (
    { className, align = "start", alignOffset = -4, sideOffset = 8, ...props },
    ref
  ) => (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        ref={ref}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-menubar-content-transform-origin]",
          className
        )}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
)
MenubarContent.displayName = MenubarPrimitive.Content.displayName

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
MenubarItem.displayName = MenubarPrimitive.Item.displayName

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
))
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
))
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
MenubarLabel.displayName = MenubarPrimitive.Label.displayName

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName

const MenubarShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
MenubarShortcut.displayname = "MenubarShortcut"

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/navigation-menu.tsx

```typescript
import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-accent-foreground data-[state=open]:bg-accent/50 data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent"
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/pagination.tsx

```typescript
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/popover.tsx

```typescript
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/progress.tsx

```typescript
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/radio-group.tsx

```typescript
import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/resizable.tsx

```typescript
"use client"

import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/scroll-area.tsx

```typescript
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/select.tsx

```typescript
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/separator.tsx

```typescript
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/sheet.tsx

```typescript
"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/sidebar.tsx

```typescript
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, VariantProps } from "class-variance-authority"
import { PanelLeftIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-[var(--sidebar-width)] flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing-4))]"
            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]"
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing-4)+2px)]"
            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-[var(--skeleton-width)] flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline outline-2 outline-transparent outline-offset-2 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/skeleton.tsx

```typescript
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/slider.tsx

```typescript
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/sonner.tsx

```typescript
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/spinner.tsx

```typescript
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/switch.tsx

```typescript
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/table.tsx

```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/tabs.tsx

```typescript
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/textarea.tsx

```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/toast.tsx

```typescript
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/toaster.tsx

```typescript
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

```

---

## File: artifacts/mockup-sandbox/src/components/ui/toggle-group.tsx

```typescript
"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/toggle.tsx

```typescript
import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }

```

---

## File: artifacts/mockup-sandbox/src/components/ui/tooltip.tsx

```typescript
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

```

---

## File: artifacts/mockup-sandbox/src/hooks/use-mobile.tsx

```typescript
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

```

---

## File: artifacts/mockup-sandbox/src/hooks/use-toast.ts

```typescript
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```

---

## File: artifacts/mockup-sandbox/src/lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

---

## File: artifacts/mockup-sandbox/src/main.tsx

```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

```

---

## File: artifacts/mockup-sandbox/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "mockupPreviewPlugin.ts", "vite.config.ts"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "noEmit": true,
    "lib": ["es2022", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

```

---

## File: artifacts/mockup-sandbox/vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

```

---

## File: consolidate-repository.js

```javascript
const fs = require('fs');
const path = require('path');

const repoRoot = 'c:\\Users\\Trevor\\Desktop\\hm';
const outputFile = path.join(repoRoot, 'repository.md');

const excludeFiles = ['refractor.md', 'TODO.md', 'repository.md'];
const includeExtensions = ['.ts', '.tsx', '.js', '.mjs', '.json', '.yaml', '.yml', '.toml', '.ps1', '.sh'];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.replit-artifact' && file !== 'dist' && file !== 'build') {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (includeExtensions.includes(ext) && !excludeFiles.includes(file)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

console.log('Scanning repository for native code files...');
const allFiles = getAllFiles(repoRoot);
const sortedFiles = allFiles.sort((a, b) => a.localeCompare(b));

console.log(`Found ${sortedFiles.length} files to consolidate`);

const langMap = {
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.ps1': 'powershell',
  '.sh': 'bash',
  '.toml': 'toml'
};

let output = '# Repository Code Consolidation\n';
output += '\n';
output += 'This document contains all native code files from the repository.\n';
output += `Generated on: ${new Date().toISOString()}\n`;
output += '\n';
output += '---\n';
output += '\n';

for (const file of sortedFiles) {
  const relativePath = path.relative(repoRoot, file).replace(/\\/g, '/');
  output += `## File: ${relativePath}\n`;
  output += '\n';
  
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.trim()) {
      const ext = path.extname(file).toLowerCase();
      const lang = langMap[ext] || '';
      output += '```' + lang + '\n';
      output += content;
      output += '\n```\n';
    } else {
      output += 'Empty file\n';
    }
  } catch (err) {
    output += `Error reading file: ${err.message}\n`;
  }
  
  output += '\n';
  output += '---\n';
  output += '\n';
  
  console.log(`Processed: ${relativePath}`);
}

fs.writeFileSync(outputFile, output, 'utf8');

console.log('');
console.log(`Consolidation complete. Output written to: ${outputFile}`);
console.log(`Total files processed: ${sortedFiles.length}`);

```

---

## File: lib/api-client-react/package.json

```json
{
  "name": "@workspace/api-client-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@tanstack/react-query": "catalog:"
  },
  "peerDependencies": {
    "react": ">=18"
  }
}

```

---

## File: lib/api-client-react/src/custom-fetch.ts

```typescript
export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

// Use loose check for URL — some runtimes (e.g. React Native) polyfill URL
// differently, so `instanceof URL` can fail.
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

// Use strict equality: in browsers, `response.body` is `null` when the
// response genuinely has no content.  In React Native, `response.body` is
// always `undefined` because the ReadableStream API is not implemented —
// even when the response carries a full payload readable via `.text()` or
// `.json()`.  Loose equality (`== null`) matches both `null` and `undefined`,
// which causes every React Native response to be treated as empty.
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");

  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;

  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    return null;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            "Use responseType \"json\" or \"text\" instead.",
        );
      }
      return response.blob();
  }
}

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  // Attach bearer token when an auth getter is configured and no
  // Authorization header has been explicitly provided.
  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const requestInfo = { method, url: resolveUrl(input) };

  const response = await fetch(input, { ...init, method, headers });

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    throw new ApiError(response, errorData, requestInfo);
  }

  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}

```

---

## File: lib/api-client-react/src/generated/api.schemas.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */
export interface HealthStatus {
  status: string;
}

export interface OpenaiConversation {
  id: number;
  title: string;
  createdAt: string;
}

export interface OpenaiMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface OpenaiConversationInput {
  title: string;
}

export interface OpenaiMessageInput {
  content: string;
}

export interface OpenaiConversationWithMessages {
  id: number;
  title: string;
  createdAt: string;
  messages: OpenaiMessage[];
}

export interface OpenaiError {
  error: string;
}


```

---

## File: lib/api-client-react/src/generated/api.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */
import {
  useMutation,
  useQuery
} from '@tanstack/react-query';
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query';

import type {
  HealthStatus,
  OpenaiConversation,
  OpenaiConversationInput,
  OpenaiConversationWithMessages,
  OpenaiError,
  OpenaiMessage,
  OpenaiMessageInput
} from './api.schemas';

import { customFetch } from '../custom-fetch';
import type { ErrorType , BodyType } from '../custom-fetch';

type AwaitedInput<T> = PromiseLike<T> | T;

      type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];



export const getHealthCheckUrl = () => {




  return `/api/healthz`
}

/**
 * Returns server health status
 * @summary Health check
 */
export const healthCheck = async ( options?: RequestInit): Promise<HealthStatus> => {

  return customFetch<HealthStatus>(getHealthCheckUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getHealthCheckQueryKey = () => {
    return [
    `/api/healthz`
    ] as const;
    }


export const getHealthCheckQueryOptions = <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getHealthCheckQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof healthCheck>>> = ({ signal }) => healthCheck({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & { queryKey: QueryKey }
}

export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>
export type HealthCheckQueryError = ErrorType<unknown>


/**
 * @summary Health check
 */

export function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getHealthCheckQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return { ...query, queryKey: queryOptions.queryKey };
}







export const getListOpenaiConversationsUrl = () => {




  return `/api/openai/conversations`
}

/**
 * @summary List all conversations
 */
export const listOpenaiConversations = async ( options?: RequestInit): Promise<OpenaiConversation[]> => {

  return customFetch<OpenaiConversation[]>(getListOpenaiConversationsUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListOpenaiConversationsQueryKey = () => {
    return [
    `/api/openai/conversations`
    ] as const;
    }


export const getListOpenaiConversationsQueryOptions = <TData = Awaited<ReturnType<typeof listOpenaiConversations>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listOpenaiConversations>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListOpenaiConversationsQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listOpenaiConversations>>> = ({ signal }) => listOpenaiConversations({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listOpenaiConversations>>, TError, TData> & { queryKey: QueryKey }
}

export type ListOpenaiConversationsQueryResult = NonNullable<Awaited<ReturnType<typeof listOpenaiConversations>>>
export type ListOpenaiConversationsQueryError = ErrorType<unknown>


/**
 * @summary List all conversations
 */

export function useListOpenaiConversations<TData = Awaited<ReturnType<typeof listOpenaiConversations>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listOpenaiConversations>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListOpenaiConversationsQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return { ...query, queryKey: queryOptions.queryKey };
}







export const getCreateOpenaiConversationUrl = () => {




  return `/api/openai/conversations`
}

/**
 * @summary Create a new conversation
 */
export const createOpenaiConversation = async (openaiConversationInput: OpenaiConversationInput, options?: RequestInit): Promise<OpenaiConversation> => {

  return customFetch<OpenaiConversation>(getCreateOpenaiConversationUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      openaiConversationInput,)
  }
);}




export const getCreateOpenaiConversationMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createOpenaiConversation>>, TError,{data: BodyType<OpenaiConversationInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof createOpenaiConversation>>, TError,{data: BodyType<OpenaiConversationInput>}, TContext> => {

const mutationKey = ['createOpenaiConversation'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof createOpenaiConversation>>, {data: BodyType<OpenaiConversationInput>}> = (props) => {
          const {data} = props ?? {};

          return  createOpenaiConversation(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CreateOpenaiConversationMutationResult = NonNullable<Awaited<ReturnType<typeof createOpenaiConversation>>>
    export type CreateOpenaiConversationMutationBody = BodyType<OpenaiConversationInput>
    export type CreateOpenaiConversationMutationError = ErrorType<unknown>

    /**
 * @summary Create a new conversation
 */
export const useCreateOpenaiConversation = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createOpenaiConversation>>, TError,{data: BodyType<OpenaiConversationInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof createOpenaiConversation>>,
        TError,
        {data: BodyType<OpenaiConversationInput>},
        TContext
      > => {
      return useMutation(getCreateOpenaiConversationMutationOptions(options));
    }

export const getGetOpenaiConversationUrl = (id: number,) => {




  return `/api/openai/conversations/${id}`
}

/**
 * @summary Get conversation with messages
 */
export const getOpenaiConversation = async (id: number, options?: RequestInit): Promise<OpenaiConversationWithMessages> => {

  return customFetch<OpenaiConversationWithMessages>(getGetOpenaiConversationUrl(id),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetOpenaiConversationQueryKey = (id: number,) => {
    return [
    `/api/openai/conversations/${id}`
    ] as const;
    }


export const getGetOpenaiConversationQueryOptions = <TData = Awaited<ReturnType<typeof getOpenaiConversation>>, TError = ErrorType<OpenaiError>>(id: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getOpenaiConversation>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetOpenaiConversationQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getOpenaiConversation>>> = ({ signal }) => getOpenaiConversation(id, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: !!(id), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getOpenaiConversation>>, TError, TData> & { queryKey: QueryKey }
}

export type GetOpenaiConversationQueryResult = NonNullable<Awaited<ReturnType<typeof getOpenaiConversation>>>
export type GetOpenaiConversationQueryError = ErrorType<OpenaiError>


/**
 * @summary Get conversation with messages
 */

export function useGetOpenaiConversation<TData = Awaited<ReturnType<typeof getOpenaiConversation>>, TError = ErrorType<OpenaiError>>(
 id: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getOpenaiConversation>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetOpenaiConversationQueryOptions(id,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return { ...query, queryKey: queryOptions.queryKey };
}







export const getDeleteOpenaiConversationUrl = (id: number,) => {




  return `/api/openai/conversations/${id}`
}

/**
 * @summary Delete a conversation
 */
export const deleteOpenaiConversation = async (id: number, options?: RequestInit): Promise<void> => {

  return customFetch<void>(getDeleteOpenaiConversationUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
);}




export const getDeleteOpenaiConversationMutationOptions = <TError = ErrorType<OpenaiError>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteOpenaiConversation>>, TError,{id: number}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof deleteOpenaiConversation>>, TError,{id: number}, TContext> => {

const mutationKey = ['deleteOpenaiConversation'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteOpenaiConversation>>, {id: number}> = (props) => {
          const {id} = props ?? {};

          return  deleteOpenaiConversation(id,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type DeleteOpenaiConversationMutationResult = NonNullable<Awaited<ReturnType<typeof deleteOpenaiConversation>>>

    export type DeleteOpenaiConversationMutationError = ErrorType<OpenaiError>

    /**
 * @summary Delete a conversation
 */
export const useDeleteOpenaiConversation = <TError = ErrorType<OpenaiError>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof deleteOpenaiConversation>>, TError,{id: number}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof deleteOpenaiConversation>>,
        TError,
        {id: number},
        TContext
      > => {
      return useMutation(getDeleteOpenaiConversationMutationOptions(options));
    }

export const getListOpenaiMessagesUrl = (id: number,) => {




  return `/api/openai/conversations/${id}/messages`
}

/**
 * @summary List messages in a conversation
 */
export const listOpenaiMessages = async (id: number, options?: RequestInit): Promise<OpenaiMessage[]> => {

  return customFetch<OpenaiMessage[]>(getListOpenaiMessagesUrl(id),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListOpenaiMessagesQueryKey = (id: number,) => {
    return [
    `/api/openai/conversations/${id}/messages`
    ] as const;
    }


export const getListOpenaiMessagesQueryOptions = <TData = Awaited<ReturnType<typeof listOpenaiMessages>>, TError = ErrorType<unknown>>(id: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listOpenaiMessages>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListOpenaiMessagesQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listOpenaiMessages>>> = ({ signal }) => listOpenaiMessages(id, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: !!(id), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listOpenaiMessages>>, TError, TData> & { queryKey: QueryKey }
}

export type ListOpenaiMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof listOpenaiMessages>>>
export type ListOpenaiMessagesQueryError = ErrorType<unknown>


/**
 * @summary List messages in a conversation
 */

export function useListOpenaiMessages<TData = Awaited<ReturnType<typeof listOpenaiMessages>>, TError = ErrorType<unknown>>(
 id: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listOpenaiMessages>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListOpenaiMessagesQueryOptions(id,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return { ...query, queryKey: queryOptions.queryKey };
}







export const getSendOpenaiMessageUrl = (id: number,) => {




  return `/api/openai/conversations/${id}/messages`
}

/**
 * @summary Send a text message and receive a streaming text response
 */
export const sendOpenaiMessage = async (id: number,
    openaiMessageInput: OpenaiMessageInput, options?: RequestInit): Promise<unknown> => {

  return customFetch<unknown>(getSendOpenaiMessageUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(
      openaiMessageInput,)
  }
);}




export const getSendOpenaiMessageMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof sendOpenaiMessage>>, TError,{id: number;data: BodyType<OpenaiMessageInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof sendOpenaiMessage>>, TError,{id: number;data: BodyType<OpenaiMessageInput>}, TContext> => {

const mutationKey = ['sendOpenaiMessage'];
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof sendOpenaiMessage>>, {id: number;data: BodyType<OpenaiMessageInput>}> = (props) => {
          const {id,data} = props ?? {};

          return  sendOpenaiMessage(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type SendOpenaiMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendOpenaiMessage>>>
    export type SendOpenaiMessageMutationBody = BodyType<OpenaiMessageInput>
    export type SendOpenaiMessageMutationError = ErrorType<unknown>

    /**
 * @summary Send a text message and receive a streaming text response
 */
export const useSendOpenaiMessage = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof sendOpenaiMessage>>, TError,{id: number;data: BodyType<OpenaiMessageInput>}, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof sendOpenaiMessage>>,
        TError,
        {id: number;data: BodyType<OpenaiMessageInput>},
        TContext
      > => {
      return useMutation(getSendOpenaiMessageMutationOptions(options));
    }


```

---

## File: lib/api-client-react/src/index.ts

```typescript
export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

```

---

## File: lib/api-client-react/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["dom", "es2022"]
  },
  "include": ["src"]
}

```

---

## File: lib/api-spec/openapi.yaml

```yaml
openapi: 3.1.0
info:
  # Do not change the title, if the title changes, the import paths will be broken
  title: Api
  version: 0.1.0
  description: API specification
servers:
  - url: /api
    description: Base API path
tags:
  - name: health
    description: Health operations
  - name: openai
    description: OpenAI AI chat, image, and audio operations
paths:
  /healthz:
    get:
      operationId: healthCheck
      tags: [health]
      summary: Health check
      description: Returns server health status
      responses:
        "200":
          description: Healthy
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthStatus"
  /openai/conversations:
    get:
      operationId: listOpenaiConversations
      tags: [openai]
      summary: List all conversations
      responses:
        "200":
          description: List of conversations
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/OpenaiConversation"
    post:
      operationId: createOpenaiConversation
      tags: [openai]
      summary: Create a new conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OpenaiConversationInput"
      responses:
        "201":
          description: Created conversation
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OpenaiConversation"
  /openai/conversations/{id}:
    get:
      operationId: getOpenaiConversation
      tags: [openai]
      summary: Get conversation with messages
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Conversation with messages
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OpenaiConversationWithMessages"
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OpenaiError"
    delete:
      operationId: deleteOpenaiConversation
      tags: [openai]
      summary: Delete a conversation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "204":
          description: Deleted
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OpenaiError"
  /openai/conversations/{id}/messages:
    get:
      operationId: listOpenaiMessages
      tags: [openai]
      summary: List messages in a conversation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: List of messages
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/OpenaiMessage"
    post:
      operationId: sendOpenaiMessage
      tags: [openai]
      summary: Send a text message and receive a streaming text response
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OpenaiMessageInput"
      responses:
        "200":
          description: SSE stream of assistant text chunks
          content:
            text/event-stream: {}
components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
      required:
        - status
    OpenaiConversation:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - title
        - createdAt
    OpenaiMessage:
      type: object
      properties:
        id:
          type: integer
        conversationId:
          type: integer
        role:
          type: string
        content:
          type: string
        createdAt:
          type: string
          format: date-time
      required:
        - id
        - conversationId
        - role
        - content
        - createdAt
    OpenaiConversationInput:
      type: object
      properties:
        title:
          type: string
      required:
        - title
    OpenaiMessageInput:
      type: object
      properties:
        content:
          type: string
      required:
        - content
    OpenaiConversationWithMessages:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        createdAt:
          type: string
          format: date-time
        messages:
          type: array
          items:
            $ref: "#/components/schemas/OpenaiMessage"
      required:
        - id
        - title
        - createdAt
        - messages
    OpenaiError:
      type: object
      properties:
        error:
          type: string
      required:
        - error

```

---

## File: lib/api-spec/orval.config.ts

```typescript
import { defineConfig, InputTransformerFn } from "orval";
import path from "path";

const root = path.resolve(__dirname, "..", "..");
const apiClientReactSrc = path.resolve(root, "lib", "api-client-react", "src");
const apiZodSrc = path.resolve(root, "lib", "api-zod", "src");

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";

  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      prettier: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: {
      target: "./openapi.yaml",
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiZodSrc,
      client: "zod",
      target: "generated",
      schemas: { path: "generated/types", type: "typescript" },
      mode: "split",
      clean: true,
      prettier: true,
      override: {
        zod: {
          coerce: {
            query: ['boolean', 'number', 'string'],
            param: ['boolean', 'number', 'string'],
            body: ['bigint', 'date'],
            response: ['bigint', 'date'],
          },
        },
        useDates: true,
        useBigInt: true,
      },
    },
  },
});

```

---

## File: lib/api-spec/package.json

```json
{
  "name": "@workspace/api-spec",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "codegen": "orval --config ./orval.config.ts && pnpm -w run typecheck:libs"
  },
  "devDependencies": {
    "orval": "^8.9.1"
  }
}

```

---

## File: lib/api-zod/package.json

```json
{
  "name": "@workspace/api-zod",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "catalog:"
  }
}

```

---

## File: lib/api-zod/src/generated/api.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */
import * as zod from 'zod';


/**
 * Returns server health status
 * @summary Health check
 */
export const HealthCheckResponse = zod.object({
  "status": zod.string()
})


/**
 * @summary List all conversations
 */
export const ListOpenaiConversationsResponseItem = zod.object({
  "id": zod.number(),
  "title": zod.string(),
  "createdAt": zod.coerce.date()
})
export const ListOpenaiConversationsResponse = zod.array(ListOpenaiConversationsResponseItem)


/**
 * @summary Create a new conversation
 */
export const CreateOpenaiConversationBody = zod.object({
  "title": zod.string()
})


/**
 * @summary Get conversation with messages
 */
export const GetOpenaiConversationParams = zod.object({
  "id": zod.coerce.number()
})

export const GetOpenaiConversationResponse = zod.object({
  "id": zod.number(),
  "title": zod.string(),
  "createdAt": zod.coerce.date(),
  "messages": zod.array(zod.object({
  "id": zod.number(),
  "conversationId": zod.number(),
  "role": zod.string(),
  "content": zod.string(),
  "createdAt": zod.coerce.date()
}))
})


/**
 * @summary Delete a conversation
 */
export const DeleteOpenaiConversationParams = zod.object({
  "id": zod.coerce.number()
})


/**
 * @summary List messages in a conversation
 */
export const ListOpenaiMessagesParams = zod.object({
  "id": zod.coerce.number()
})

export const ListOpenaiMessagesResponseItem = zod.object({
  "id": zod.number(),
  "conversationId": zod.number(),
  "role": zod.string(),
  "content": zod.string(),
  "createdAt": zod.coerce.date()
})
export const ListOpenaiMessagesResponse = zod.array(ListOpenaiMessagesResponseItem)


/**
 * @summary Send a text message and receive a streaming text response
 */
export const SendOpenaiMessageParams = zod.object({
  "id": zod.coerce.number()
})

export const SendOpenaiMessageBody = zod.object({
  "content": zod.string()
})



```

---

## File: lib/api-zod/src/generated/types/healthStatus.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export interface HealthStatus {
  status: string;
}

```

---

## File: lib/api-zod/src/generated/types/index.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export * from './healthStatus';
export * from './openaiConversation';
export * from './openaiConversationInput';
export * from './openaiConversationWithMessages';
export * from './openaiError';
export * from './openaiMessage';
export * from './openaiMessageInput';

```

---

## File: lib/api-zod/src/generated/types/openaiConversation.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export interface OpenaiConversation {
  id: number;
  title: string;
  createdAt: Date;
}

```

---

## File: lib/api-zod/src/generated/types/openaiConversationInput.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export interface OpenaiConversationInput {
  title: string;
}

```

---

## File: lib/api-zod/src/generated/types/openaiConversationWithMessages.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */
import type { OpenaiMessage } from './openaiMessage';

export interface OpenaiConversationWithMessages {
  id: number;
  title: string;
  createdAt: Date;
  messages: OpenaiMessage[];
}

```

---

## File: lib/api-zod/src/generated/types/openaiError.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export interface OpenaiError {
  error: string;
}

```

---

## File: lib/api-zod/src/generated/types/openaiMessage.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export interface OpenaiMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

```

---

## File: lib/api-zod/src/generated/types/openaiMessageInput.ts

```typescript
/**
 * Generated by orval v8.9.1 🍺
 * Do not edit manually.
 * Api
 * API specification
 * OpenAPI spec version: 0.1.0
 */

export interface OpenaiMessageInput {
  content: string;
}

```

---

## File: lib/api-zod/src/index.ts

```typescript
export * from "./generated/api";
export * from "./generated/types";

```

---

## File: lib/api-zod/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}

```

---

## File: lib/db/drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

```

---

## File: lib/db/package.json

```json
{
  "name": "@workspace/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "push": "drizzle-kit push --config ./drizzle.config.ts",
    "push-force": "drizzle-kit push --force --config ./drizzle.config.ts"
  },
  "dependencies": {
    "drizzle-orm": "catalog:",
    "drizzle-zod": "^0.8.3",
    "pg": "^8.20.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/pg": "^8.20.0",
    "drizzle-kit": "^0.31.10"
  }
}

```

---

## File: lib/db/src/index.ts

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

```

---

## File: lib/db/src/schema/conversations.ts

```typescript
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

```

---

## File: lib/db/src/schema/index.ts

```typescript
export * from "./conversations";
export * from "./messages";

```

---

## File: lib/db/src/schema/messages.ts

```typescript
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { conversations } from "./conversations";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

```

---

## File: lib/db/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}

```

---

## File: lib/integrations-openai-ai-react/package.json

```json
{
  "name": "@workspace/integrations-openai-ai-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./audio": "./src/audio/index.ts"
  },
  "peerDependencies": {
    "react": ">=18"
  }
}

```

---

## File: lib/integrations-openai-ai-react/src/audio/audio-playback-worklet.js

```javascript
/**
 * Reusable AudioWorklet for streaming PCM16 audio playback.
 * Place in public/ folder and load via audioContext.audioWorklet.addModule()
 */
class RingBuffer {
  constructor(initialCapacity) {
    this.capacity = initialCapacity;
    this.buffer = new Float32Array(initialCapacity);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableData = 0;
  }

  push(data) {
    const len = data.length;
    // Auto-grow if needed
    while (this.availableData + len > this.capacity) {
      this.grow();
    }
    for (let i = 0; i < len; i++) {
      this.buffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
      this.availableData++;
    }
  }

  grow() {
    const newCapacity = this.capacity * 2;
    const newBuffer = new Float32Array(newCapacity);
    // Copy existing data maintaining order
    for (let i = 0; i < this.availableData; i++) {
      const srcIndex = (this.readIndex + i) % this.capacity;
      newBuffer[i] = this.buffer[srcIndex];
    }
    this.buffer = newBuffer;
    this.readIndex = 0;
    this.writeIndex = this.availableData;
    this.capacity = newCapacity;
  }

  pull(outputBuffer) {
    const len = outputBuffer.length;
    const available = Math.min(len, this.availableData);
    for (let i = 0; i < available; i++) {
      outputBuffer[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;
    }
    // Pad remaining with silence
    for (let i = available; i < len; i++) {
      outputBuffer[i] = 0;
    }
    this.availableData -= available;
    return available > 0;
  }

  available() {
    return this.availableData;
  }

  clear() {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableData = 0;
  }
}

class AudioPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ringBuffer = new RingBuffer(24000 * 30); // 30s initial capacity
    this.isPlaying = false;
    this.streamComplete = false;

    this.port.onmessage = (event) => {
      const { type, samples } = event.data;
      if (type === "audio") {
        this.ringBuffer.push(samples);
        this.isPlaying = true;
      } else if (type === "clear") {
        this.ringBuffer.clear();
        this.isPlaying = false;
        this.streamComplete = false;
      } else if (type === "streamComplete") {
        this.streamComplete = true;
      } else if (type === "stop") {
        this.isPlaying = false;
        this.streamComplete = false;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const channel = output[0];
    if (this.isPlaying) {
      this.ringBuffer.pull(channel);
      if (this.streamComplete && this.ringBuffer.available() === 0) {
        this.isPlaying = false;
        this.streamComplete = false;
        this.port.postMessage({ type: "ended" });
      }
    } else {
      channel.fill(0);
    }
    return true;
  }
}

registerProcessor("audio-playback-processor", AudioPlaybackProcessor);

```

---

## File: lib/integrations-openai-ai-react/src/audio/audio-utils.ts

```typescript
/**
 * Audio utility functions for voice chat.
 * Handles PCM16 decoding and AudioContext initialization.
 */

/**
 * Decode base64 PCM16 audio to Float32Array for Web Audio API
 */
export function decodePCM16ToFloat32(base64Audio: string): Float32Array {
  const raw = atob(base64Audio);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  return float32;
}

/**
 * Create and initialize AudioContext with worklet
 */
export async function createAudioPlaybackContext(
  workletPath: string,
  sampleRate = 24000
): Promise<{ ctx: AudioContext; worklet: AudioWorkletNode }> {
  if (!workletPath) {
    throw new Error("workletPath is required for audio playback");
  }
  const ctx = new AudioContext({ sampleRate });
  await ctx.audioWorklet.addModule(workletPath);
  const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
  worklet.connect(ctx.destination);
  return { ctx, worklet };
}

```

---

## File: lib/integrations-openai-ai-react/src/audio/index.ts

```typescript
/**
 * Voice chat client utilities for Replit AI Integrations.
 * 
 * Usage:
 * 1. Copy audio-playback-worklet.js to your public/ folder
 * 2. Pass the deployed worklet URL into the hooks
 * 
 * Example:
 * ```tsx
 * import { useVoiceRecorder, useVoiceStream } from "./audio";
 * 
 * function VoiceChat({ workletPath }: { workletPath: string }) {
 *   const [transcript, setTranscript] = useState("");
 *   const recorder = useVoiceRecorder();
 *   const stream = useVoiceStream({
 *     workletPath,
 *     onTranscript: (_, full) => setTranscript(full),
 *     onComplete: (text) => console.log("Done:", text),
 *   });
 * 
 *   const handleClick = async () => {
 *     if (recorder.state === "recording") {
 *       const blob = await recorder.stopRecording();
 *       await stream.streamVoiceResponse("/api/openai/conversations/1/voice-messages", blob);
 *     } else {
 *       await recorder.startRecording();
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleClick}>
 *         {recorder.state === "recording" ? "Stop" : "Record"}
 *       </button>
 *       <p>{transcript}</p>
 *     </div>
 *   );
 * }
 * ```
 */

export { decodePCM16ToFloat32, createAudioPlaybackContext } from "./audio-utils";
export { useVoiceRecorder, type RecordingState } from "./useVoiceRecorder";
export { useAudioPlayback, type PlaybackState } from "./useAudioPlayback";
export { useVoiceStream } from "./useVoiceStream";

```

---

## File: lib/integrations-openai-ai-react/src/audio/useAudioPlayback.ts

```typescript
/**
 * React hook for streaming audio playback using AudioWorklet.
 * Supports real-time PCM16 audio streaming from SSE responses.
 * Includes sequence buffer for reordering out-of-order chunks.
 */
import { useRef, useCallback, useState } from "react";
import { decodePCM16ToFloat32 } from "./audio-utils";

export type PlaybackState = "idle" | "playing" | "ended";

/**
 * Reorders audio chunks that may arrive out of sequence.
 * Buffers chunks until they can be played in correct order.
 *
 * Example: If chunks arrive as seq 2, seq 0, seq 1:
 * - seq 2 arrives → buffered (waiting for seq 0)
 * - seq 0 arrives → played immediately, then check buffer
 * - seq 1 arrives → played immediately (seq 0 done), seq 2 now plays
 */
class SequenceBuffer {
  private pending = new Map<number, string[]>();
  private nextSeq = 0;

  /** Add chunk with sequence number, returns chunks ready to play in order */
  push(seq: number, data: string): string[] {
    // Store the chunk under its sequence number
    if (!this.pending.has(seq)) {
      this.pending.set(seq, []);
    }
    this.pending.get(seq)!.push(data);

    // Drain consecutive ready sequences
    const ready: string[] = [];
    while (this.pending.has(this.nextSeq)) {
      ready.push(...this.pending.get(this.nextSeq)!);
      this.pending.delete(this.nextSeq);
      this.nextSeq++;
    }
    return ready;
  }

  reset() {
    this.pending.clear();
    this.nextSeq = 0;
  }
}

export function useAudioPlayback(workletPath: string) {
  const [state, setState] = useState<PlaybackState>("idle");
  const ctxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const readyRef = useRef(false);
  const seqBufferRef = useRef(new SequenceBuffer());

  const init = useCallback(async () => {
    if (readyRef.current) return;
    if (!workletPath) {
      throw new Error("workletPath is required for audio playback");
    }

    const ctx = new AudioContext({ sampleRate: 24000 });
    await ctx.audioWorklet.addModule(workletPath);
    const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
    worklet.connect(ctx.destination);

    worklet.port.onmessage = (e) => {
      if (e.data.type === "ended") setState("idle");
    };

    ctxRef.current = ctx;
    workletRef.current = worklet;
    readyRef.current = true;
  }, [workletPath]);

  /** Push audio directly (no sequencing) - for simple streaming */
  const pushAudio = useCallback((base64Audio: string) => {
    if (!workletRef.current) return;
    const samples = decodePCM16ToFloat32(base64Audio);
    workletRef.current.port.postMessage({ type: "audio", samples });
    setState("playing");
  }, []);

  /** Push audio with sequence number - reorders before playback */
  const pushSequencedAudio = useCallback((seq: number, base64Audio: string) => {
    if (!workletRef.current) return;

    const readyChunks = seqBufferRef.current.push(seq, base64Audio);
    for (const chunk of readyChunks) {
      const samples = decodePCM16ToFloat32(chunk);
      workletRef.current.port.postMessage({ type: "audio", samples });
    }
    if (readyChunks.length > 0) {
      setState("playing");
    }
  }, []);

  const signalComplete = useCallback(() => {
    workletRef.current?.port.postMessage({ type: "streamComplete" });
  }, []);

  const clear = useCallback(() => {
    workletRef.current?.port.postMessage({ type: "clear" });
    seqBufferRef.current.reset();
    setState("idle");
  }, []);

  return { state, init, pushAudio, pushSequencedAudio, signalComplete, clear };
}

```

---

## File: lib/integrations-openai-ai-react/src/audio/useVoiceRecorder.ts

```typescript
/**
 * React hook for voice recording using MediaRecorder API.
 * Negotiates a supported MIME type across browsers (Chrome, Firefox, Safari).
 */
import { useRef, useCallback, useState } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
];

function getSupportedMimeType(): string | undefined {
  for (const mimeType of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return undefined;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string | undefined>(undefined);

  const startRecording = useCallback(async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(100);
    setState("recording");
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        resolve(new Blob());
        return;
      }

      recorder.onstop = () => {
        const blobType = mimeTypeRef.current ?? recorder.mimeType ?? "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        recorder.stream.getTracks().forEach((t) => t.stop());
        setState("stopped");
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  return { state, startRecording, stopRecording };
}

```

---

## File: lib/integrations-openai-ai-react/src/audio/useVoiceStream.ts

```typescript
import { useCallback, useEffect, useRef } from "react";
import { useAudioPlayback } from "./useAudioPlayback";

interface StreamCallbacks {
  workletPath: string;
  onUserTranscript?: (text: string) => void;
  onTranscript?: (text: string, full: string) => void;
  onComplete?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

type TypedVoiceStreamEvent =
  | { type: "user_transcript"; data: string }
  | { type: "transcript"; data: string }
  | { type: "audio"; data: string }
  | { type: "error"; error: string };

type DoneEvent = { done: true };

type VoiceStreamEvent = TypedVoiceStreamEvent | DoneEvent;

type PlaybackHandle = ReturnType<typeof useAudioPlayback>;

type StreamState = {
  fullTranscript: string;
  didComplete: boolean;
};

const SSE_EVENT_DELIMITER = /\r\n\r\n|\n\n|\r\r/g;

function createAbortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Unknown error");
}

function notifyError(callbacks: Pick<StreamCallbacks, "onError">, error: Error) {
  try {
    callbacks.onError?.(error);
  } catch {
    // Do not let onError mask the original error.
  }
}

function isVoiceStreamEvent(value: unknown): value is VoiceStreamEvent {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  if (record.done === true) return true;

  switch (record.type) {
    case "user_transcript":
    case "transcript":
    case "audio":
      return typeof record.data === "string";
    case "error":
      return typeof record.error === "string";
    default:
      return false;
  }
}

function parseVoiceStreamEvent(raw: string): VoiceStreamEvent {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Received malformed SSE JSON payload");
  }

  if (!isVoiceStreamEvent(parsed)) {
    throw new Error("Received unexpected SSE event shape");
  }

  return parsed;
}

function readSseDataFromBlock(block: string): string | null {
  const normalizedBlock = block.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const dataLines: string[] = [];

  for (const line of normalizedBlock.split("\n")) {
    if (!line.startsWith("data:")) {
      continue;
    }

    // SSE allows one optional leading space after the colon.
    dataLines.push(line.slice(5).replace(/^ /, ""));
  }

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join("\n");
}

function extractCompleteSseBlocks(buffer: string): {
  blocks: string[];
  remaining: string;
} {
  const blocks: string[] = [];
  let lastIndex = 0;

  SSE_EVENT_DELIMITER.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = SSE_EVENT_DELIMITER.exec(buffer)) !== null) {
    blocks.push(buffer.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;
  }

  return {
    blocks,
    remaining: buffer.slice(lastIndex),
  };
}

function isDoneEvent(event: VoiceStreamEvent): event is DoneEvent {
  return "done" in event && (event as DoneEvent).done === true;
}

function handleVoiceStreamEvent(
  event: VoiceStreamEvent,
  playback: PlaybackHandle,
  callbacks: Omit<StreamCallbacks, "workletPath">,
  state: StreamState
) {
  if (isDoneEvent(event)) {
    if (!state.didComplete) {
      state.didComplete = true;
      playback.signalComplete();
      callbacks.onComplete?.(state.fullTranscript);
    }
    return;
  }

  switch (event.type) {
    case "user_transcript":
      callbacks.onUserTranscript?.(event.data);
      return;

    case "transcript":
      state.fullTranscript += event.data;
      callbacks.onTranscript?.(event.data, state.fullTranscript);
      return;

    case "audio":
      playback.pushAudio(event.data);
      return;

    case "error":
      throw new Error(event.error);
  }
}

async function blobToBase64(blob: Blob, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };

    const onAbort = () => {
      cleanup();

      try {
        reader.abort();
      } catch {
        // Ignore abort races if the read already finished.
      }

      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    reader.onload = () => {
      const result = reader.result;
      cleanup();

      if (typeof result !== "string") {
        reject(new Error("Failed to read audio blob"));
        return;
      }

      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Failed to parse audio data URL"));
        return;
      }

      resolve(result.slice(commaIndex + 1));
    };

    reader.onerror = () => {
      const error = reader.error ?? new Error("Failed to read audio blob");
      cleanup();
      reject(error);
    };

    reader.onabort = () => {
      cleanup();
      reject(createAbortError());
    };

    reader.readAsDataURL(blob);
  });
}

async function readErrorText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

export function useVoiceStream({ workletPath, ...callbacks }: StreamCallbacks) {
  const playback = useAudioPlayback(workletPath);

  const callbacksRef = useRef<Omit<StreamCallbacks, "workletPath">>(callbacks);
  callbacksRef.current = callbacks;

  const playbackRef = useRef<PlaybackHandle>(playback);
  playbackRef.current = playback;

  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  const streamVoiceResponse = useCallback(
    async (url: string, audioBlob: Blob): Promise<void> => {
      activeRequestRef.current?.abort();

      const abortController = new AbortController();
      activeRequestRef.current = abortController;

      const throwIfNotCurrent = () => {
        if (
          abortController.signal.aborted ||
          activeRequestRef.current !== abortController
        ) {
          throw createAbortError();
        }
      };

      const processBlocks = (blocks: string[], state: StreamState) => {
        for (const block of blocks) {
          throwIfNotCurrent();

          const rawData = readSseDataFromBlock(block);
          if (!rawData) {
            continue;
          }

          const event = parseVoiceStreamEvent(rawData);
          handleVoiceStreamEvent(
            event,
            playbackRef.current,
            callbacksRef.current,
            state
          );
        }
      };

      const state: StreamState = {
        fullTranscript: "",
        didComplete: false,
      };

      try {
        await playbackRef.current.init();
        throwIfNotCurrent();

        playbackRef.current.clear();

        const base64Audio = await blobToBase64(audioBlob, abortController.signal);
        throwIfNotCurrent();

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ audio: base64Audio }),
          signal: abortController.signal,
        });
        throwIfNotCurrent();

        if (!response.ok) {
          const detail = await readErrorText(response);
          throw new Error(
            detail
              ? `Voice request failed (${response.status} ${response.statusText}): ${detail}`
              : `Voice request failed (${response.status} ${response.statusText})`
          );
        }

        if (!response.body) {
          throw new Error("Voice request failed: response body is missing");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            throwIfNotCurrent();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            const { blocks, remaining } = extractCompleteSseBlocks(buffer);
            buffer = remaining;

            processBlocks(blocks, state);
          }

          // Flush any trailing UTF-8 bytes.
          buffer += decoder.decode();

          const { blocks, remaining } = extractCompleteSseBlocks(buffer);
          processBlocks(blocks, state);

          // Process a final unterminated event if the server closed without a trailing blank line.
          const finalData = readSseDataFromBlock(remaining);
          if (finalData) {
            throwIfNotCurrent();

            const event = parseVoiceStreamEvent(finalData);
            handleVoiceStreamEvent(
              event,
              playbackRef.current,
              callbacksRef.current,
              state
            );
          }
        } finally {
          try {
            await reader.cancel();
          } catch {
            // Ignore cleanup errors.
          }

          reader.releaseLock();
        }
      } catch (error) {
        const err = toError(error);

        if (err.name === "AbortError") {
          return;
        }

        notifyError(callbacksRef.current, err);
        throw err;
      } finally {
        if (activeRequestRef.current === abortController) {
          activeRequestRef.current = null;
        }
      }
    },
    []
  );

  return { streamVoiceResponse, playbackState: playback.state };
}
```

---

## File: lib/integrations-openai-ai-react/src/index.ts

```typescript
export { decodePCM16ToFloat32, createAudioPlaybackContext } from "./audio/audio-utils";
export { useVoiceRecorder, type RecordingState } from "./audio/useVoiceRecorder";
export { useAudioPlayback, type PlaybackState } from "./audio/useAudioPlayback";
export { useVoiceStream } from "./audio/useVoiceStream";

```

---

## File: lib/integrations-openai-ai-react/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["dom", "es2022"]
  },
  "include": ["src"]
}

```

---

## File: lib/integrations-openai-ai-server/package.json

```json
{
  "name": "@workspace/integrations-openai-ai-server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./batch": "./src/batch/index.ts",
    "./image": "./src/image/index.ts",
    "./audio": "./src/audio/index.ts"
  },
  "dependencies": {
    "openai": "^6.27.0",
    "p-limit": "^7.3.0",
    "p-retry": "^7.1.1"
  },
  "devDependencies": {
    "@types/node": "catalog:"
  }
}

```

---

## File: lib/integrations-openai-ai-server/src/audio/client.ts

```typescript
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type AudioFormat = "wav" | "mp3" | "webm" | "mp4" | "ogg" | "unknown";

/**
 * Detect audio format from buffer magic bytes.
 * Supports: WAV, MP3, WebM (Chrome/Firefox), MP4/M4A/MOV (Safari/iOS), OGG
 */
export function detectAudioFormat(buffer: Buffer): AudioFormat {
  if (buffer.length < 12) return "unknown";

  // WAV: RIFF....WAVE
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "wav";
  }
  // WebM: EBML header
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm";
  }
  // MP3: ID3 tag or frame sync
  if (
    (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xfa || buffer[1] === 0xf3)) ||
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)
  ) {
    return "mp3";
  }
  // MP4/M4A/MOV: ....ftyp (Safari/iOS records in these containers)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return "mp4";
  }
  // OGG: OggS
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return "ogg";
  }
  return "unknown";
}

/**
 * Convert any audio/video format to WAV using ffmpeg.
 */
export async function convertToWav(audioBuffer: Buffer): Promise<Buffer> {
  const inputPath = join(tmpdir(), `input-${randomUUID()}`);
  const outputPath = join(tmpdir(), `output-${randomUUID()}.wav`);

  try {
    await writeFile(inputPath, audioBuffer);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", inputPath,
        "-vn",
        "-f", "wav",
        "-ar", "16000",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-y",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", () => {});
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpeg.on("error", reject);
    });

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Auto-detect and convert audio to OpenAI-compatible format.
 */
export async function ensureCompatibleFormat(
  audioBuffer: Buffer
): Promise<{ buffer: Buffer; format: "wav" | "mp3" }> {
  const detected = detectAudioFormat(audioBuffer);
  if (detected === "wav") return { buffer: audioBuffer, format: "wav" };
  if (detected === "mp3") return { buffer: audioBuffer, format: "mp3" };
  const wavBuffer = await convertToWav(audioBuffer);
  return { buffer: wavBuffer, format: "wav" };
}

/** Voice Chat: audio-in, audio-out using gpt-audio. */
export async function voiceChat(
  audioBuffer: Buffer,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  inputFormat: "wav" | "mp3" = "wav",
  outputFormat: "wav" | "mp3" = "mp3"
): Promise<{ transcript: string; audioResponse: Buffer }> {
  const audioBase64 = audioBuffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format: outputFormat },
    messages: [{
      role: "user",
      content: [
        { type: "input_audio", input_audio: { data: audioBase64, format: inputFormat } },
      ],
    }],
  });
  const message = response.choices[0]?.message as any;
  const transcript = message?.audio?.transcript || message?.content || "";
  const audioData = message?.audio?.data ?? "";
  return {
    transcript,
    audioResponse: Buffer.from(audioData, "base64"),
  };
}

/** Streaming Voice Chat for real-time audio responses. */
export async function voiceChatStream(
  audioBuffer: Buffer,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  inputFormat: "wav" | "mp3" = "wav"
): Promise<AsyncIterable<{ type: "transcript" | "audio"; data: string }>> {
  const audioBase64 = audioBuffer.toString("base64");
  const stream = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format: "pcm16" },
    messages: [{
      role: "user",
      content: [
        { type: "input_audio", input_audio: { data: audioBase64, format: inputFormat } },
      ],
    }],
    stream: true,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (!delta) continue;
      if (delta?.audio?.transcript) {
        yield { type: "transcript", data: delta.audio.transcript };
      }
      if (delta?.audio?.data) {
        yield { type: "audio", data: delta.audio.data };
      }
    }
  })();
}

/** Text-to-Speech using gpt-audio. */
export async function textToSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  format: "wav" | "mp3" | "flac" | "opus" | "pcm16" = "wav"
): Promise<Buffer> {
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format },
    messages: [
      { role: "system", content: "You are an assistant that performs text-to-speech." },
      { role: "user", content: `Repeat the following text verbatim: ${text}` },
    ],
  });
  const audioData = (response.choices[0]?.message as any)?.audio?.data ?? "";
  return Buffer.from(audioData, "base64");
}

/** Streaming Text-to-Speech. */
export async function textToSpeechStream(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<AsyncIterable<string>> {
  const stream = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format: "pcm16" },
    messages: [
      { role: "system", content: "You are an assistant that performs text-to-speech." },
      { role: "user", content: `Repeat the following text verbatim: ${text}` },
    ],
    stream: true,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (!delta) continue;
      if (delta?.audio?.data) {
        yield delta.audio.data;
      }
    }
  })();
}

/** Speech-to-Text using gpt-4o-mini-transcribe. */
export async function speechToText(
  audioBuffer: Buffer,
  format: "wav" | "mp3" | "webm" = "wav"
): Promise<string> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
  });
  return response.text;
}

/** Streaming Speech-to-Text. */
export async function speechToTextStream(
  audioBuffer: Buffer,
  format: "wav" | "mp3" | "webm" = "wav"
): Promise<AsyncIterable<string>> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const stream = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    stream: true,
  });

  return (async function* () {
    for await (const event of stream) {
      if (event.type === "transcript.text.delta") {
        yield event.delta;
      }
    }
  })();
}

```

---

## File: lib/integrations-openai-ai-server/src/audio/index.ts

```typescript
export {
  openai,
  detectAudioFormat,
  convertToWav,
  ensureCompatibleFormat,
  type AudioFormat,
  voiceChat,
  voiceChatStream,
  textToSpeech,
  textToSpeechStream,
  speechToText,
  speechToTextStream,
} from "./client";

```

---

## File: lib/integrations-openai-ai-server/src/batch/index.ts

```typescript
export {
  batchProcess,
  batchProcessWithSSE,
  isRateLimitError,
  type BatchOptions,
} from "./utils";

```

---

## File: lib/integrations-openai-ai-server/src/batch/utils.ts

```typescript
import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";

/**
 * Batch Processing Utilities
 *
 * Generic batch processing with built-in rate limiting and automatic retries.
 * Use for any task that requires processing multiple items through an LLM or external API.
 *
 * USAGE:
 * ```typescript
 * import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
 * import { openai } from "@workspace/integrations-openai-ai-server";
 *
 * const results = await batchProcess(
 *   artworks,
 *   async (artwork) => {
 *     const response = await openai.chat.completions.create({
 *       model: "gpt-5.4",
 *       messages: [{ role: "user", content: `Categorize: ${artwork.name}` }],
 *       response_format: { type: "json_object" },
 *     });
 *     return JSON.parse(response.choices[0]?.message?.content || "{}");
 *   },
 *   { concurrency: 2, retries: 5 }
 * );
 * ```
 */

export interface BatchOptions {
  concurrency?: number;
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onProgress?: (completed: number, total: number, item: unknown) => void;
}

export function isRateLimitError(error: unknown): boolean {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {}
): Promise<R[]> {
  const {
    concurrency = 2,
    retries = 7,
    minTimeout = 2000,
    maxTimeout = 128000,
    onProgress,
  } = options;

  const limit = pLimit(concurrency);
  let completed = 0;

  const promises = items.map((item, index) =>
    limit(() =>
      pRetry(
        async () => {
          try {
            const result = await processor(item, index);
            completed++;
            onProgress?.(completed, items.length, item);
            return result;
          } catch (error: unknown) {
            if (isRateLimitError(error)) {
              throw error;
            }
            throw new AbortError(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        },
        { retries, minTimeout, maxTimeout, factor: 2 }
      )
    )
  );

  return Promise.all(promises);
}

export async function batchProcessWithSSE<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  sendEvent: (event: { type: string; [key: string]: unknown }) => void,
  options: Omit<BatchOptions, "concurrency" | "onProgress"> = {}
): Promise<R[]> {
  const { retries = 5, minTimeout = 1000, maxTimeout = 15000 } = options;

  sendEvent({ type: "started", total: items.length });

  const results: R[] = [];
  let errors = 0;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    sendEvent({ type: "processing", index, item });

    try {
      const result = await pRetry(
        () => processor(item, index),
        {
          retries,
          minTimeout,
          maxTimeout,
          factor: 2,
          onFailedAttempt: (error) => {
            if (!isRateLimitError(error)) {
              throw new AbortError(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          },
        }
      );
      results.push(result);
      sendEvent({ type: "progress", index, result });
    } catch (error) {
      errors++;
      results.push(undefined as R);
      sendEvent({
        type: "progress",
        index,
        error: error instanceof Error ? error.message : "Processing failed",
      });
    }
  }

  sendEvent({ type: "complete", processed: items.length, errors });
  return results;
}

```

---

## File: lib/integrations-openai-ai-server/src/client.ts

```typescript
import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

```

---

## File: lib/integrations-openai-ai-server/src/image/client.ts

```typescript
import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
  );
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });
  const base64 = response.data?.[0]?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}

export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string
): Promise<Buffer> {
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, {
        type: "image/png",
      })
    )
  );

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt,
  });

  const imageBase64 = response.data?.[0]?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");

  if (outputPath) {
    fs.writeFileSync(outputPath, imageBytes);
  }

  return imageBytes;
}

```

---

## File: lib/integrations-openai-ai-server/src/image/index.ts

```typescript
export { openai, generateImageBuffer, editImages } from "./client";

```

---

## File: lib/integrations-openai-ai-server/src/index.ts

```typescript
export { openai } from "./client";
export { generateImageBuffer, editImages } from "./image";
export { batchProcess, batchProcessWithSSE, isRateLimitError, type BatchOptions } from "./batch";

```

---

## File: lib/integrations-openai-ai-server/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}

```

---

## File: lib/integrations/openai_ai_integrations/src/client/audio/audio-playback-worklet.js

```javascript
/**
 * Reusable AudioWorklet for streaming PCM16 audio playback.
 * Place in public/ folder and load via audioContext.audioWorklet.addModule()
 */
class RingBuffer {
  constructor(initialCapacity) {
    this.capacity = initialCapacity;
    this.buffer = new Float32Array(initialCapacity);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableData = 0;
  }

  push(data) {
    const len = data.length;
    // Auto-grow if needed
    while (this.availableData + len > this.capacity) {
      this.grow();
    }
    for (let i = 0; i < len; i++) {
      this.buffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
      this.availableData++;
    }
  }

  grow() {
    const newCapacity = this.capacity * 2;
    const newBuffer = new Float32Array(newCapacity);
    // Copy existing data maintaining order
    for (let i = 0; i < this.availableData; i++) {
      const srcIndex = (this.readIndex + i) % this.capacity;
      newBuffer[i] = this.buffer[srcIndex];
    }
    this.buffer = newBuffer;
    this.readIndex = 0;
    this.writeIndex = this.availableData;
    this.capacity = newCapacity;
  }

  pull(outputBuffer) {
    const len = outputBuffer.length;
    const available = Math.min(len, this.availableData);
    for (let i = 0; i < available; i++) {
      outputBuffer[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;
    }
    // Pad remaining with silence
    for (let i = available; i < len; i++) {
      outputBuffer[i] = 0;
    }
    this.availableData -= available;
    return available > 0;
  }

  available() {
    return this.availableData;
  }

  clear() {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableData = 0;
  }
}

class AudioPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ringBuffer = new RingBuffer(24000 * 30); // 30s initial capacity
    this.isPlaying = false;
    this.streamComplete = false;

    this.port.onmessage = (event) => {
      const { type, samples } = event.data;
      if (type === "audio") {
        this.ringBuffer.push(samples);
        this.isPlaying = true;
      } else if (type === "clear") {
        this.ringBuffer.clear();
        this.isPlaying = false;
        this.streamComplete = false;
      } else if (type === "streamComplete") {
        this.streamComplete = true;
      } else if (type === "stop") {
        this.isPlaying = false;
        this.streamComplete = false;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const channel = output[0];
    if (this.isPlaying) {
      this.ringBuffer.pull(channel);
      if (this.streamComplete && this.ringBuffer.available() === 0) {
        this.isPlaying = false;
        this.streamComplete = false;
        this.port.postMessage({ type: "ended" });
      }
    } else {
      channel.fill(0);
    }
    return true;
  }
}

registerProcessor("audio-playback-processor", AudioPlaybackProcessor);


```

---

## File: lib/integrations/openai_ai_integrations/src/client/audio/audio-utils.ts

```typescript
/**
 * Audio utility functions for voice chat.
 * Handles PCM16 decoding and AudioContext initialization.
 */

/**
 * Decode base64 PCM16 audio to Float32Array for Web Audio API
 */
export function decodePCM16ToFloat32(base64Audio: string): Float32Array {
  const raw = atob(base64Audio);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  return float32;
}

/**
 * Create and initialize AudioContext with worklet
 */
export async function createAudioPlaybackContext(
  workletPath = "/audio-playback-worklet.js",
  sampleRate = 24000
): Promise<{ ctx: AudioContext; worklet: AudioWorkletNode }> {
  const ctx = new AudioContext({ sampleRate });
  await ctx.audioWorklet.addModule(workletPath);
  const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
  worklet.connect(ctx.destination);
  return { ctx, worklet };
}


```

---

## File: lib/integrations/openai_ai_integrations/src/client/audio/index.ts

```typescript
/**
 * Voice chat client utilities for Replit AI Integrations.
 * 
 * Usage:
 * 1. Copy audio-playback-worklet.js to your public/ folder
 * 2. Import and use the React hooks in your components
 * 
 * Example:
 * ```tsx
 * import { useVoiceRecorder, useVoiceStream } from "./audio";
 * 
 * function VoiceChat() {
 *   const [transcript, setTranscript] = useState("");
 *   const recorder = useVoiceRecorder();
 *   const stream = useVoiceStream({
 *     onTranscript: (_, full) => setTranscript(full),
 *     onComplete: (text) => console.log("Done:", text),
 *   });
 * 
 *   const handleClick = async () => {
 *     if (recorder.state === "recording") {
 *       const blob = await recorder.stopRecording();
 *       await stream.streamVoiceResponse("/api/conversations/1/messages", blob);
 *     } else {
 *       await recorder.startRecording();
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleClick}>
 *         {recorder.state === "recording" ? "Stop" : "Record"}
 *       </button>
 *       <p>{transcript}</p>
 *     </div>
 *   );
 * }
 * ```
 */

export { decodePCM16ToFloat32, createAudioPlaybackContext } from "./audio-utils";
export { useVoiceRecorder, type RecordingState } from "./useVoiceRecorder";
export { useAudioPlayback, type PlaybackState } from "./useAudioPlayback";
export { useVoiceStream } from "./useVoiceStream";


```

---

## File: lib/integrations/openai_ai_integrations/src/client/audio/useAudioPlayback.ts

```typescript
/**
 * React hook for streaming audio playback using AudioWorklet.
 * Supports real-time PCM16 audio streaming from SSE responses.
 * Includes sequence buffer for reordering out-of-order chunks.
 */
import { useRef, useCallback, useState } from "react";
import { decodePCM16ToFloat32 } from "./audio-utils";

export type PlaybackState = "idle" | "playing" | "ended";

/**
 * Reorders audio chunks that may arrive out of sequence.
 * Buffers chunks until they can be played in correct order.
 *
 * Example: If chunks arrive as seq 2, seq 0, seq 1:
 * - seq 2 arrives → buffered (waiting for seq 0)
 * - seq 0 arrives → played immediately, then check buffer
 * - seq 1 arrives → played immediately (seq 0 done), seq 2 now plays
 */
class SequenceBuffer {
  private pending = new Map<number, string[]>();
  private nextSeq = 0;

  /** Add chunk with sequence number, returns chunks ready to play in order */
  push(seq: number, data: string): string[] {
    // Store the chunk under its sequence number
    if (!this.pending.has(seq)) {
      this.pending.set(seq, []);
    }
    this.pending.get(seq)!.push(data);

    // Drain consecutive ready sequences
    const ready: string[] = [];
    while (this.pending.has(this.nextSeq)) {
      ready.push(...this.pending.get(this.nextSeq)!);
      this.pending.delete(this.nextSeq);
      this.nextSeq++;
    }
    return ready;
  }

  reset() {
    this.pending.clear();
    this.nextSeq = 0;
  }
}

export function useAudioPlayback(workletPath = "/audio-playback-worklet.js") {
  const [state, setState] = useState<PlaybackState>("idle");
  const ctxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const readyRef = useRef(false);
  const seqBufferRef = useRef(new SequenceBuffer());

  const init = useCallback(async () => {
    if (readyRef.current) return;

    const ctx = new AudioContext({ sampleRate: 24000 });
    await ctx.audioWorklet.addModule(workletPath);
    const worklet = new AudioWorkletNode(ctx, "audio-playback-processor");
    worklet.connect(ctx.destination);

    worklet.port.onmessage = (e) => {
      if (e.data.type === "ended") setState("idle");
    };

    ctxRef.current = ctx;
    workletRef.current = worklet;
    readyRef.current = true;
  }, [workletPath]);

  /** Push audio directly (no sequencing) - for simple streaming */
  const pushAudio = useCallback((base64Audio: string) => {
    if (!workletRef.current) return;
    const samples = decodePCM16ToFloat32(base64Audio);
    workletRef.current.port.postMessage({ type: "audio", samples });
    setState("playing");
  }, []);

  /** Push audio with sequence number - reorders before playback */
  const pushSequencedAudio = useCallback((seq: number, base64Audio: string) => {
    if (!workletRef.current) return;

    const readyChunks = seqBufferRef.current.push(seq, base64Audio);
    for (const chunk of readyChunks) {
      const samples = decodePCM16ToFloat32(chunk);
      workletRef.current.port.postMessage({ type: "audio", samples });
    }
    if (readyChunks.length > 0) {
      setState("playing");
    }
  }, []);

  const signalComplete = useCallback(() => {
    workletRef.current?.port.postMessage({ type: "streamComplete" });
  }, []);

  const clear = useCallback(() => {
    workletRef.current?.port.postMessage({ type: "clear" });
    seqBufferRef.current.reset();
    setState("idle");
  }, []);

  return { state, init, pushAudio, pushSequencedAudio, signalComplete, clear };
}

```

---

## File: lib/integrations/openai_ai_integrations/src/client/audio/useVoiceRecorder.ts

```typescript
/**
 * React hook for voice recording using MediaRecorder API.
 * Records audio in WebM/Opus format for efficient streaming.
 */
import { useRef, useCallback, useState } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(100); // Collect chunks every 100ms
    setState("recording");
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        resolve(new Blob());
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        recorder.stream.getTracks().forEach((t) => t.stop());
        setState("stopped");
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  return { state, startRecording, stopRecording };
}


```

---

## File: lib/integrations/openai_ai_integrations/src/server/audio/client.ts

```typescript
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type AudioFormat = "wav" | "mp3" | "webm" | "mp4" | "ogg" | "unknown";

/**
 * Detect audio format from buffer magic bytes.
 * Supports: WAV, MP3, WebM (Chrome/Firefox), MP4/M4A/MOV (Safari/iOS), OGG
 */
export function detectAudioFormat(buffer: Buffer): AudioFormat {
  if (buffer.length < 12) return "unknown";

  // WAV: RIFF....WAVE
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "wav";
  }
  // WebM: EBML header
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm";
  }
  // MP3: ID3 tag or frame sync
  if (
    (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xfa || buffer[1] === 0xf3)) ||
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)
  ) {
    return "mp3";
  }
  // MP4/M4A/MOV: ....ftyp (Safari/iOS records in these containers)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return "mp4";
  }
  // OGG: OggS
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return "ogg";
  }
  return "unknown";
}

/**
 * Convert any audio/video format to WAV using ffmpeg.
 */
export async function convertToWav(audioBuffer: Buffer): Promise<Buffer> {
  const inputPath = join(tmpdir(), `input-${randomUUID()}`);
  const outputPath = join(tmpdir(), `output-${randomUUID()}.wav`);

  try {
    await writeFile(inputPath, audioBuffer);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i", inputPath,
        "-vn",
        "-f", "wav",
        "-ar", "16000",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-y",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", () => {});
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpeg.on("error", reject);
    });

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Auto-detect and convert audio to OpenAI-compatible format.
 */
export async function ensureCompatibleFormat(
  audioBuffer: Buffer
): Promise<{ buffer: Buffer; format: "wav" | "mp3" }> {
  const detected = detectAudioFormat(audioBuffer);
  if (detected === "wav") return { buffer: audioBuffer, format: "wav" };
  if (detected === "mp3") return { buffer: audioBuffer, format: "mp3" };
  const wavBuffer = await convertToWav(audioBuffer);
  return { buffer: wavBuffer, format: "wav" };
}

/** Voice Chat: audio-in, audio-out using gpt-audio. */
export async function voiceChat(
  audioBuffer: Buffer,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  inputFormat: "wav" | "mp3" = "wav",
  outputFormat: "wav" | "mp3" = "mp3"
): Promise<{ transcript: string; audioResponse: Buffer }> {
  const audioBase64 = audioBuffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format: outputFormat },
    messages: [{
      role: "user",
      content: [
        { type: "input_audio", input_audio: { data: audioBase64, format: inputFormat } },
      ],
    }],
  });
  const message = response.choices[0]?.message as any;
  const transcript = message?.audio?.transcript || message?.content || "";
  const audioData = message?.audio?.data ?? "";
  return {
    transcript,
    audioResponse: Buffer.from(audioData, "base64"),
  };
}

/** Streaming Voice Chat for real-time audio responses. */
export async function voiceChatStream(
  audioBuffer: Buffer,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  inputFormat: "wav" | "mp3" = "wav"
): Promise<AsyncIterable<{ type: "transcript" | "audio"; data: string }>> {
  const audioBase64 = audioBuffer.toString("base64");
  const stream = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format: "pcm16" },
    messages: [{
      role: "user",
      content: [
        { type: "input_audio", input_audio: { data: audioBase64, format: inputFormat } },
      ],
    }],
    stream: true,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (!delta) continue;
      if (delta?.audio?.transcript) {
        yield { type: "transcript", data: delta.audio.transcript };
      }
      if (delta?.audio?.data) {
        yield { type: "audio", data: delta.audio.data };
      }
    }
  })();
}

/** Text-to-Speech using gpt-audio. */
export async function textToSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
  format: "wav" | "mp3" | "flac" | "opus" | "pcm16" = "wav"
): Promise<Buffer> {
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format },
    messages: [
      { role: "system", content: "You are an assistant that performs text-to-speech." },
      { role: "user", content: `Repeat the following text verbatim: ${text}` },
    ],
  });
  const audioData = (response.choices[0]?.message as any)?.audio?.data ?? "";
  return Buffer.from(audioData, "base64");
}

/** Streaming Text-to-Speech. */
export async function textToSpeechStream(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<AsyncIterable<string>> {
  const stream = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice, format: "pcm16" },
    messages: [
      { role: "system", content: "You are an assistant that performs text-to-speech." },
      { role: "user", content: `Repeat the following text verbatim: ${text}` },
    ],
    stream: true,
  });

  return (async function* () {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (!delta) continue;
      if (delta?.audio?.data) {
        yield delta.audio.data;
      }
    }
  })();
}

/** Speech-to-Text using gpt-4o-mini-transcribe. */
export async function speechToText(
  audioBuffer: Buffer,
  format: "wav" | "mp3" | "webm" = "wav"
): Promise<string> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
  });
  return response.text;
}

/** Streaming Speech-to-Text. */
export async function speechToTextStream(
  audioBuffer: Buffer,
  format: "wav" | "mp3" | "webm" = "wav"
): Promise<AsyncIterable<string>> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const stream = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    stream: true,
  });

  return (async function* () {
    for await (const event of stream) {
      if (event.type === "transcript.text.delta") {
        yield event.delta;
      }
    }
  })();
}

```

---

## File: lib/integrations/openai_ai_integrations/src/server/audio/index.ts

```typescript
export { registerAudioRoutes } from "./routes";
export {
  openai,
  detectAudioFormat,
  convertToWav,
  ensureCompatibleFormat,
  type AudioFormat,
  voiceChat,
  voiceChatStream,
  textToSpeech,
  textToSpeechStream,
  speechToText,
  speechToTextStream,
} from "./client";

```

---

## File: lib/integrations/openai_ai_integrations/src/server/batch/index.ts

```typescript
export {
  batchProcess,
  batchProcessWithSSE,
  isRateLimitError,
  type BatchOptions,
} from "./utils";

```

---

## File: lib/integrations/openai_ai_integrations/src/server/batch/utils.ts

```typescript
import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";

/**
 * Batch Processing Utilities
 *
 * This module provides a generic batch processing function with built-in
 * rate limiting and automatic retries. Use it for any task that requires
 * processing multiple items through an LLM or external API.
 *
 * USAGE:
 * ```typescript
 * import { batchProcess, isRateLimitError } from "./replit_integrations/batch";
 *
 * const results = await batchProcess(
 *   artworks,
 *   async (artwork) => {
 *     // Your custom LLM logic here
 *     const response = await openai.chat.completions.create({
 *       model: "gpt-5.4",
 *       messages: [{ role: "user", content: `Categorize: ${artwork.name}` }],
 *       response_format: { type: "json_object" },
 *     });
 *     return JSON.parse(response.choices[0]?.message?.content || "{}");
 *   },
 *   { concurrency: 2, retries: 5 }
 * );
 * ```
 */

export interface BatchOptions {
  /** Max concurrent requests (default: 2) */
  concurrency?: number;
  /** Max retry attempts for rate limit errors (default: 7) */
  retries?: number;
  /** Initial retry delay in ms (default: 2000) */
  minTimeout?: number;
  /** Max retry delay in ms (default: 128000) */
  maxTimeout?: number;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, item: unknown) => void;
}

/**
 * Check if an error is a rate limit or quota violation.
 * Use this in custom error handling if needed.
 */
export function isRateLimitError(error: unknown): boolean {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

/**
 * Process items in batches with rate limiting and automatic retries.
 *
 * @param items - Array of items to process
 * @param processor - Async function to process each item (write your LLM logic here)
 * @param options - Concurrency and retry settings
 * @returns Promise resolving to array of results in the same order as input
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {}
): Promise<R[]> {
  const {
    concurrency = 2,
    retries = 7,
    minTimeout = 2000,
    maxTimeout = 128000,
    onProgress,
  } = options;

  const limit = pLimit(concurrency);
  let completed = 0;

  const promises = items.map((item, index) =>
    limit(() =>
      pRetry(
        async () => {
          try {
            const result = await processor(item, index);
            completed++;
            onProgress?.(completed, items.length, item);
            return result;
          } catch (error: unknown) {
            if (isRateLimitError(error)) {
              throw error; // Rethrow to trigger p-retry
            }
            // For non-rate-limit errors, abort immediately
            throw new AbortError(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        },
        { retries, minTimeout, maxTimeout, factor: 2 }
      )
    )
  );

  return Promise.all(promises);
}

/**
 * Process items sequentially with SSE progress streaming.
 * Use this when you need real-time progress updates to the client.
 *
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param sendEvent - Function to send SSE events to the client
 * @param options - Retry settings (concurrency is always 1 for sequential)
 */
export async function batchProcessWithSSE<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  sendEvent: (event: { type: string; [key: string]: unknown }) => void,
  options: Omit<BatchOptions, "concurrency" | "onProgress"> = {}
): Promise<R[]> {
  const { retries = 5, minTimeout = 1000, maxTimeout = 15000 } = options;

  sendEvent({ type: "started", total: items.length });

  const results: R[] = [];
  let errors = 0;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    sendEvent({ type: "processing", index, item });

    try {
      const result = await pRetry(
        () => processor(item, index),
        {
          retries,
          minTimeout,
          maxTimeout,
          factor: 2,
          onFailedAttempt: (error) => {
            if (!isRateLimitError(error)) {
              throw new AbortError(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          },
        }
      );
      results.push(result);
      sendEvent({ type: "progress", index, result });
    } catch (error) {
      errors++;
      results.push(undefined as R); // Placeholder for failed items
      sendEvent({
        type: "progress",
        index,
        error: error instanceof Error ? error.message : "Processing failed",
      });
    }
  }

  sendEvent({ type: "complete", processed: items.length, errors });
  return results;
}

```

---

## File: lib/integrations/openai_ai_integrations/src/server/image/client.ts

```typescript
import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Generate an image and return as Buffer.
 * Uses gpt-image-1 model via Replit AI Integrations.
 */
export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });
  const base64 = response.data[0]?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}

/**
 * Edit/combine multiple images into a composite.
 * Uses gpt-image-1 model via Replit AI Integrations.
 */
export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string
): Promise<Buffer> {
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, {
        type: "image/png",
      })
    )
  );

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt,
  });

  const imageBase64 = response.data[0]?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");

  if (outputPath) {
    fs.writeFileSync(outputPath, imageBytes);
  }

  return imageBytes;
}

```

---

## File: lib/integrations/openai_ai_integrations/src/server/image/index.ts

```typescript
export { registerImageRoutes } from "./routes";
export { openai, generateImageBuffer, editImages } from "./client";

```

---

## File: package.json

```json
{
  "name": "workspace",
  "version": "0.0.0",
  "license": "MIT",
  "scripts": {
    "preinstall": "sh -c 'rm -f package-lock.json yarn.lock; case \"$npm_config_user_agent\" in pnpm/*) ;; *) echo \"Use pnpm instead\" >&2; exit 1 ;; esac'",
    "build": "pnpm run typecheck && pnpm -r --if-present run build",
    "typecheck:libs": "tsc --build",
    "typecheck": "pnpm run typecheck:libs && pnpm -r --filter \"./artifacts/**\" --filter \"./scripts\" --if-present run typecheck"
  },
  "private": true,
  "devDependencies": {
    "prettier": "^3.8.3",
    "typescript": "~5.9.3"
  }
}

```

---

## File: pnpm-lock.yaml

```yaml
lockfileVersion: '9.0'

settings:
  autoInstallPeers: false
  excludeLinksFromLockfile: false

catalogs:
  default:
    '@replit/vite-plugin-cartographer':
      specifier: ^0.5.1
      version: 0.5.5
    '@replit/vite-plugin-runtime-error-modal':
      specifier: ^0.0.6
      version: 0.0.6
    '@tailwindcss/vite':
      specifier: ^4.1.14
      version: 4.3.0
    '@tanstack/react-query':
      specifier: ^5.90.21
      version: 5.100.9
    '@types/node':
      specifier: ^25.3.3
      version: 25.6.2
    '@types/react':
      specifier: ^19.2.0
      version: 19.2.14
    '@types/react-dom':
      specifier: ^19.2.0
      version: 19.2.3
    '@vitejs/plugin-react':
      specifier: ^5.0.4
      version: 5.2.0
    class-variance-authority:
      specifier: ^0.7.1
      version: 0.7.1
    clsx:
      specifier: ^2.1.1
      version: 2.1.1
    drizzle-orm:
      specifier: ^0.45.2
      version: 0.45.2
    framer-motion:
      specifier: ^12.23.24
      version: 12.38.0
    lucide-react:
      specifier: ^0.545.0
      version: 0.545.0
    react:
      specifier: 19.1.0
      version: 19.1.0
    react-dom:
      specifier: 19.1.0
      version: 19.1.0
    tailwind-merge:
      specifier: ^3.3.1
      version: 3.5.0
    tailwindcss:
      specifier: ^4.1.14
      version: 4.3.0
    tsx:
      specifier: ^4.21.0
      version: 4.21.0
    vite:
      specifier: ^7.3.2
      version: 7.3.3
    zod:
      specifier: ^3.25.76
      version: 3.25.76

overrides:
  esbuild>@esbuild/darwin-arm64: '-'
  esbuild>@esbuild/darwin-x64: '-'
  esbuild>@esbuild/freebsd-arm64: '-'
  esbuild>@esbuild/freebsd-x64: '-'
  esbuild>@esbuild/linux-arm: '-'
  esbuild>@esbuild/linux-arm64: '-'
  esbuild>@esbuild/linux-ia32: '-'
  esbuild>@esbuild/linux-loong64: '-'
  esbuild>@esbuild/linux-mips64el: '-'
  esbuild>@esbuild/linux-ppc64: '-'
  esbuild>@esbuild/linux-riscv64: '-'
  esbuild>@esbuild/linux-s390x: '-'
  esbuild>@esbuild/netbsd-arm64: '-'
  esbuild>@esbuild/netbsd-x64: '-'
  esbuild>@esbuild/openbsd-arm64: '-'
  esbuild>@esbuild/openbsd-x64: '-'
  esbuild>@esbuild/sunos-x64: '-'
  esbuild>@esbuild/win32-arm64: '-'
  esbuild>@esbuild/win32-ia32: '-'
  esbuild>@esbuild/win32-x64: '-'
  esbuild>@esbuild/aix-ppc64: '-'
  esbuild>@esbuild/android-arm: '-'
  esbuild>@esbuild/android-arm64: '-'
  esbuild>@esbuild/android-x64: '-'
  esbuild>@esbuild/openharmony-arm64: '-'
  lightningcss>lightningcss-android-arm64: '-'
  lightningcss>lightningcss-darwin-arm64: '-'
  lightningcss>lightningcss-darwin-x64: '-'
  lightningcss>lightningcss-freebsd-x64: '-'
  lightningcss>lightningcss-linux-arm-gnueabihf: '-'
  lightningcss>lightningcss-linux-arm64-gnu: '-'
  lightningcss>lightningcss-linux-arm64-musl: '-'
  lightningcss>lightningcss-linux-x64-musl: '-'
  lightningcss>lightningcss-win32-arm64-msvc: '-'
  lightningcss>lightningcss-win32-x64-msvc: '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-android-arm64': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-darwin-arm64': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-darwin-x64': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-freebsd-x64': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-linux-arm-gnueabihf': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-linux-arm64-gnu': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-linux-arm64-musl': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-win32-arm64-msvc': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-win32-x64-msvc': '-'
  '@tailwindcss/oxide>@tailwindcss/oxide-linux-x64-musl': '-'
  rollup>@rollup/rollup-android-arm-eabi: '-'
  rollup>@rollup/rollup-android-arm64: '-'
  rollup>@rollup/rollup-darwin-arm64: '-'
  rollup>@rollup/rollup-darwin-x64: '-'
  rollup>@rollup/rollup-freebsd-arm64: '-'
  rollup>@rollup/rollup-freebsd-x64: '-'
  rollup>@rollup/rollup-linux-arm-gnueabihf: '-'
  rollup>@rollup/rollup-linux-arm-musleabihf: '-'
  rollup>@rollup/rollup-linux-arm64-gnu: '-'
  rollup>@rollup/rollup-linux-arm64-musl: '-'
  rollup>@rollup/rollup-linux-loong64-gnu: '-'
  rollup>@rollup/rollup-linux-loong64-musl: '-'
  rollup>@rollup/rollup-linux-ppc64-gnu: '-'
  rollup>@rollup/rollup-linux-ppc64-musl: '-'
  rollup>@rollup/rollup-linux-riscv64-gnu: '-'
  rollup>@rollup/rollup-linux-riscv64-musl: '-'
  rollup>@rollup/rollup-linux-s390x-gnu: '-'
  rollup>@rollup/rollup-linux-x64-musl: '-'
  rollup>@rollup/rollup-openbsd-x64: '-'
  rollup>@rollup/rollup-openharmony-arm64: '-'
  rollup>@rollup/rollup-win32-arm64-msvc: '-'
  rollup>@rollup/rollup-win32-ia32-msvc: '-'
  rollup>@rollup/rollup-win32-x64-gnu: '-'
  rollup>@rollup/rollup-win32-x64-msvc: '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-darwin-arm64': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-darwin-x64': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-freebsd-ia32': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-freebsd-x64': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-linux-arm64': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-linux-arm': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-linux-ia32': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-sunos-x64': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-win32-ia32': '-'
  '@expo/ngrok-bin>@expo/ngrok-bin-win32-x64': '-'
  '@esbuild-kit/esm-loader': npm:tsx@^4.21.0
  esbuild: 0.27.3

importers:

  .:
    devDependencies:
      prettier:
        specifier: ^3.8.3
        version: 3.8.3
      typescript:
        specifier: ~5.9.3
        version: 5.9.3

  artifacts/api-server:
    dependencies:
      '@workspace/api-zod':
        specifier: workspace:*
        version: link:../../lib/api-zod
      '@workspace/db':
        specifier: workspace:*
        version: link:../../lib/db
      '@workspace/integrations-openai-ai-server':
        specifier: workspace:*
        version: link:../../lib/integrations-openai-ai-server
      cookie-parser:
        specifier: ^1.4.7
        version: 1.4.7
      cors:
        specifier: ^2.8.6
        version: 2.8.6
      drizzle-orm:
        specifier: 'catalog:'
        version: 0.45.2(@types/pg@8.20.0)(pg@8.20.0)
      express:
        specifier: ^5.2.1
        version: 5.2.1
      pino:
        specifier: ^9.14.0
        version: 9.14.0
      pino-http:
        specifier: ^10.5.0
        version: 10.5.0
    devDependencies:
      '@types/cookie-parser':
        specifier: ^1.4.10
        version: 1.4.10(@types/express@5.0.6)
      '@types/cors':
        specifier: ^2.8.19
        version: 2.8.19
      '@types/express':
        specifier: ^5.0.6
        version: 5.0.6
      '@types/node':
        specifier: 'catalog:'
        version: 25.6.2
      esbuild:
        specifier: 0.27.3
        version: 0.27.3
      esbuild-plugin-pino:
        specifier: ^2.3.3
        version: 2.3.3(esbuild@0.27.3)(pino-pretty@13.1.3)(pino@9.14.0)(thread-stream@3.1.0)
      pino-pretty:
        specifier: ^13.1.3
        version: 13.1.3
      thread-stream:
        specifier: 3.1.0
        version: 3.1.0

  artifacts/mobile:
    dependencies:
      expo-clipboard:
        specifier: ~8.0.8
        version: 8.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
    devDependencies:
      '@babel/core':
        specifier: ^7.25.2
        version: 7.29.0
      '@expo-google-fonts/inter':
        specifier: ^0.4.0
        version: 0.4.2
      '@expo/cli':
        specifier: 54.0.23
        version: 54.0.23(expo-router@6.0.23)(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(typescript@5.9.3)
      '@expo/ngrok':
        specifier: ^4.1.0
        version: 4.1.3
      '@expo/vector-icons':
        specifier: ^15.0.3
        version: 15.1.1(expo-font@14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@react-native-async-storage/async-storage':
        specifier: 2.2.0
        version: 2.2.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      '@stardazed/streams-text-encoding':
        specifier: ^1.0.2
        version: 1.0.2
      '@tanstack/react-query':
        specifier: 'catalog:'
        version: 5.100.9(react@19.1.0)
      '@types/react':
        specifier: ~19.1.10
        version: 19.1.17
      '@types/react-dom':
        specifier: ~19.1.7
        version: 19.1.11(@types/react@19.1.17)
      '@ungap/structured-clone':
        specifier: ^1.3.0
        version: 1.3.1
      '@workspace/api-client-react':
        specifier: workspace:*
        version: link:../../lib/api-client-react
      babel-plugin-react-compiler:
        specifier: ^19.0.0-beta-e993439-20250117
        version: 19.0.0-beta-ebf51a3-20250411
      expo:
        specifier: ~54.0.27
        version: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-blur:
        specifier: ~15.0.8
        version: 15.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-constants:
        specifier: ~18.0.11
        version: 18.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      expo-font:
        specifier: ~14.0.10
        version: 14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-glass-effect:
        specifier: ~0.1.4
        version: 0.1.10(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-haptics:
        specifier: ~15.0.8
        version: 15.0.8(expo@54.0.34)
      expo-image:
        specifier: ~3.0.11
        version: 3.0.11(expo@54.0.34)(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-image-picker:
        specifier: ~17.0.9
        version: 17.0.11(expo@54.0.34)
      expo-linear-gradient:
        specifier: ~15.0.8
        version: 15.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-linking:
        specifier: ~8.0.10
        version: 8.0.12(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-location:
        specifier: ~19.0.8
        version: 19.0.8(expo@54.0.34)
      expo-router:
        specifier: ~6.0.17
        version: 6.0.23(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(expo-constants@18.0.13)(expo-linking@8.0.12)(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native-gesture-handler@2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-splash-screen:
        specifier: ~31.0.12
        version: 31.0.13(expo@54.0.34)(typescript@5.9.3)
      expo-status-bar:
        specifier: ~3.0.9
        version: 3.0.9(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-symbols:
        specifier: ~1.0.8
        version: 1.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      expo-system-ui:
        specifier: ~6.0.9
        version: 6.0.9(expo@54.0.34)(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      expo-web-browser:
        specifier: ~15.0.10
        version: 15.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      react:
        specifier: 'catalog:'
        version: 19.1.0
      react-dom:
        specifier: 'catalog:'
        version: 19.1.0(react@19.1.0)
      react-native:
        specifier: 0.81.5
        version: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-gesture-handler:
        specifier: ~2.28.0
        version: 2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-keyboard-controller:
        specifier: 1.18.5
        version: 1.18.5(react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-reanimated:
        specifier: ~4.1.1
        version: 4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-safe-area-context:
        specifier: ~5.6.0
        version: 5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-screens:
        specifier: ~4.16.0
        version: 4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-svg:
        specifier: 15.12.1
        version: 15.12.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-web:
        specifier: ^0.21.0
        version: 0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react-native-worklets:
        specifier: 0.5.1
        version: 0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      typescript:
        specifier: ~5.9.2
        version: 5.9.3
      zod:
        specifier: 'catalog:'
        version: 3.25.76
      zod-validation-error:
        specifier: ^3.4.0
        version: 3.5.4(zod@3.25.76)

  artifacts/mockup-sandbox:
    devDependencies:
      '@hookform/resolvers':
        specifier: ^3.10.0
        version: 3.10.0(react-hook-form@7.75.0(react@19.1.0))
      '@radix-ui/react-accordion':
        specifier: ^1.2.12
        version: 1.2.12(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-alert-dialog':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-aspect-ratio':
        specifier: ^1.1.8
        version: 1.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-avatar':
        specifier: ^1.1.11
        version: 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-checkbox':
        specifier: ^1.3.3
        version: 1.3.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-collapsible':
        specifier: ^1.1.12
        version: 1.1.12(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-context-menu':
        specifier: ^2.2.16
        version: 2.2.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-dialog':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-dropdown-menu':
        specifier: ^2.1.16
        version: 2.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-hover-card':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-label':
        specifier: ^2.1.8
        version: 2.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-menubar':
        specifier: ^1.1.16
        version: 1.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-navigation-menu':
        specifier: ^1.2.14
        version: 1.2.14(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-popover':
        specifier: ^1.1.15
        version: 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-progress':
        specifier: ^1.1.8
        version: 1.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-radio-group':
        specifier: ^1.3.8
        version: 1.3.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-scroll-area':
        specifier: ^1.2.10
        version: 1.2.10(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-select':
        specifier: ^2.2.6
        version: 2.2.6(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-separator':
        specifier: ^1.1.8
        version: 1.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slider':
        specifier: ^1.3.6
        version: 1.3.6(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot':
        specifier: ^1.2.4
        version: 1.2.4(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-switch':
        specifier: ^1.2.6
        version: 1.2.6(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-tabs':
        specifier: ^1.1.13
        version: 1.1.13(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-toast':
        specifier: ^1.2.15
        version: 1.2.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-toggle':
        specifier: ^1.1.10
        version: 1.1.10(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-toggle-group':
        specifier: ^1.1.11
        version: 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-tooltip':
        specifier: ^1.2.8
        version: 1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@replit/vite-plugin-cartographer':
        specifier: 'catalog:'
        version: 0.5.5
      '@replit/vite-plugin-runtime-error-modal':
        specifier: 'catalog:'
        version: 0.0.6
      '@tailwindcss/vite':
        specifier: 'catalog:'
        version: 4.3.0(vite@7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4))
      '@types/node':
        specifier: 'catalog:'
        version: 25.6.2
      '@types/react':
        specifier: 'catalog:'
        version: 19.2.14
      '@types/react-dom':
        specifier: 'catalog:'
        version: 19.2.3(@types/react@19.2.14)
      '@vitejs/plugin-react':
        specifier: 'catalog:'
        version: 5.2.0(vite@7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4))
      chokidar:
        specifier: ^4.0.3
        version: 4.0.3
      class-variance-authority:
        specifier: 'catalog:'
        version: 0.7.1
      clsx:
        specifier: 'catalog:'
        version: 2.1.1
      cmdk:
        specifier: ^1.1.1
        version: 1.1.1(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      date-fns:
        specifier: ^3.6.0
        version: 3.6.0
      embla-carousel-react:
        specifier: ^8.6.0
        version: 8.6.0(react@19.1.0)
      fast-glob:
        specifier: ^3.3.3
        version: 3.3.3
      framer-motion:
        specifier: 'catalog:'
        version: 12.38.0(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      input-otp:
        specifier: ^1.4.2
        version: 1.4.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      lucide-react:
        specifier: 'catalog:'
        version: 0.545.0(react@19.1.0)
      next-themes:
        specifier: ^0.4.6
        version: 0.4.6(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react:
        specifier: 'catalog:'
        version: 19.1.0
      react-day-picker:
        specifier: ^9.14.0
        version: 9.14.0(react@19.1.0)
      react-dom:
        specifier: 'catalog:'
        version: 19.1.0(react@19.1.0)
      react-hook-form:
        specifier: ^7.75.0
        version: 7.75.0(react@19.1.0)
      react-resizable-panels:
        specifier: ^2.1.9
        version: 2.1.9(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      recharts:
        specifier: ^2.15.4
        version: 2.15.4(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      sonner:
        specifier: ^2.0.7
        version: 2.0.7(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      tailwind-merge:
        specifier: 'catalog:'
        version: 3.5.0
      tailwindcss:
        specifier: 'catalog:'
        version: 4.3.0
      tailwindcss-animate:
        specifier: ^1.0.7
        version: 1.0.7(tailwindcss@4.3.0)
      tw-animate-css:
        specifier: ^1.4.0
        version: 1.4.0
      vaul:
        specifier: ^1.1.2
        version: 1.1.2(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      vite:
        specifier: 'catalog:'
        version: 7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4)
      zod:
        specifier: 'catalog:'
        version: 3.25.76

  lib/api-client-react:
    dependencies:
      '@tanstack/react-query':
        specifier: 'catalog:'
        version: 5.100.9(react@19.1.0)

  lib/api-spec:
    devDependencies:
      orval:
        specifier: ^8.9.1
        version: 8.9.1(prettier@3.8.3)(typescript@5.9.3)

  lib/api-zod:
    dependencies:
      zod:
        specifier: 'catalog:'
        version: 3.25.76

  lib/db:
    dependencies:
      drizzle-orm:
        specifier: 'catalog:'
        version: 0.45.2(@types/pg@8.20.0)(pg@8.20.0)
      drizzle-zod:
        specifier: ^0.8.3
        version: 0.8.3(drizzle-orm@0.45.2(@types/pg@8.20.0)(pg@8.20.0))(zod@3.25.76)
      pg:
        specifier: ^8.20.0
        version: 8.20.0
      zod:
        specifier: 'catalog:'
        version: 3.25.76
    devDependencies:
      '@types/node':
        specifier: 'catalog:'
        version: 25.6.2
      '@types/pg':
        specifier: ^8.20.0
        version: 8.20.0
      drizzle-kit:
        specifier: ^0.31.10
        version: 0.31.10

  lib/integrations-openai-ai-react: {}

  lib/integrations-openai-ai-server:
    dependencies:
      openai:
        specifier: ^6.27.0
        version: 6.38.0(ws@8.20.1)(zod@3.25.76)
      p-limit:
        specifier: ^7.3.0
        version: 7.3.0
      p-retry:
        specifier: ^7.1.1
        version: 7.1.1
    devDependencies:
      '@types/node':
        specifier: 'catalog:'
        version: 25.6.2

  scripts:
    devDependencies:
      '@types/node':
        specifier: 'catalog:'
        version: 25.6.2
      tsx:
        specifier: 'catalog:'
        version: 4.21.0

packages:

  '@0no-co/graphql.web@1.2.0':
    resolution: {integrity: sha512-/1iHy9TTr63gE1YcR5idjx8UREz1s0kFhydf3bBLCXyqjhkIc6igAzTOx3zPifCwFR87tsh/4Pa9cNts6d2otw==}
    peerDependencies:
      graphql: ^14.0.0 || ^15.0.0 || ^16.0.0
    peerDependenciesMeta:
      graphql:
        optional: true

  '@babel/code-frame@7.10.4':
    resolution: {integrity: sha512-vG6SvB6oYEhvgisZNFRmRCUkLz11c7rp+tbNTynGqc6mS1d5ATd/sGyV6W0KZZnXRKMTzZDRgQT3Ou9jhpAfUg==}

  '@babel/code-frame@7.29.0':
    resolution: {integrity: sha512-9NhCeYjq9+3uxgdtp20LSiJXJvN0FeCtNGpJxuMFZ1Kv3cWUNb6DOhJwUvcVCzKGR66cw4njwM6hrJLqgOwbcw==}
    engines: {node: '>=6.9.0'}

  '@babel/compat-data@7.29.3':
    resolution: {integrity: sha512-LIVqM46zQWZhj17qA8wb4nW/ixr2y1Nw+r1etiAWgRM6U1IqP+LNhL1yg440jYZR72jCWcWbLWzIosH+uP1fqg==}
    engines: {node: '>=6.9.0'}

  '@babel/core@7.29.0':
    resolution: {integrity: sha512-CGOfOJqWjg2qW/Mb6zNsDm+u5vFQ8DxXfbM09z69p5Z6+mE1ikP2jUXw+j42Pf1XTYED2Rni5f95npYeuwMDQA==}
    engines: {node: '>=6.9.0'}

  '@babel/generator@7.29.1':
    resolution: {integrity: sha512-qsaF+9Qcm2Qv8SRIMMscAvG4O3lJ0F1GuMo5HR/Bp02LopNgnZBC/EkbevHFeGs4ls/oPz9v+Bsmzbkbe+0dUw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-annotate-as-pure@7.27.3':
    resolution: {integrity: sha512-fXSwMQqitTGeHLBC08Eq5yXz2m37E4pJX1qAU1+2cNedz/ifv/bVXft90VeSav5nFO61EcNgwr0aJxbyPaWBPg==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-compilation-targets@7.28.6':
    resolution: {integrity: sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-create-class-features-plugin@7.29.3':
    resolution: {integrity: sha512-RpLYy2sb51oNLjuu1iD3bwBqCBWUzjO0ocp+iaCP/lJtb2CPLcnC2Fftw+4sAzaMELGeWTgExSKADbdo0GFVzA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-create-regexp-features-plugin@7.28.5':
    resolution: {integrity: sha512-N1EhvLtHzOvj7QQOUCCS3NrPJP8c5W6ZXCHDn7Yialuy1iu4r5EmIYkXlKNqT99Ciw+W0mDqWoR6HWMZlFP3hw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-define-polyfill-provider@0.6.8':
    resolution: {integrity: sha512-47UwBLPpQi1NoWzLuHNjRoHlYXMwIJoBf7MFou6viC/sIHWYygpvr0B6IAyh5sBdA2nr2LPIRww8lfaUVQINBA==}
    peerDependencies:
      '@babel/core': ^7.4.0 || ^8.0.0-0 <8.0.0

  '@babel/helper-globals@7.28.0':
    resolution: {integrity: sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-member-expression-to-functions@7.28.5':
    resolution: {integrity: sha512-cwM7SBRZcPCLgl8a7cY0soT1SptSzAlMH39vwiRpOQkJlh53r5hdHwLSCZpQdVLT39sZt+CRpNwYG4Y2v77atg==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-imports@7.28.6':
    resolution: {integrity: sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-transforms@7.28.6':
    resolution: {integrity: sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-optimise-call-expression@7.27.1':
    resolution: {integrity: sha512-URMGH08NzYFhubNSGJrpUEphGKQwMQYBySzat5cAByY1/YgIRkULnIy3tAMeszlL/so2HbeilYloUmSpd7GdVw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-plugin-utils@7.28.6':
    resolution: {integrity: sha512-S9gzZ/bz83GRysI7gAD4wPT/AI3uCnY+9xn+Mx/KPs2JwHJIz1W8PZkg2cqyt3RNOBM8ejcXhV6y8Og7ly/Dug==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-remap-async-to-generator@7.27.1':
    resolution: {integrity: sha512-7fiA521aVw8lSPeI4ZOD3vRFkoqkJcS+z4hFo82bFSH/2tNd6eJ5qCVMS5OzDmZh/kaHQeBaeyxK6wljcPtveA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-replace-supers@7.28.6':
    resolution: {integrity: sha512-mq8e+laIk94/yFec3DxSjCRD2Z0TAjhVbEJY3UQrlwVo15Lmt7C2wAUbK4bjnTs4APkwsYLTahXRraQXhb1WCg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-skip-transparent-expression-wrappers@7.27.1':
    resolution: {integrity: sha512-Tub4ZKEXqbPjXgWLl2+3JpQAYBJ8+ikpQ2Ocj/q/r0LwE3UhENh7EUabyHjz2kCEsrRY83ew2DQdHluuiDQFzg==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-string-parser@7.27.1':
    resolution: {integrity: sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-identifier@7.28.5':
    resolution: {integrity: sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-option@7.27.1':
    resolution: {integrity: sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-wrap-function@7.28.6':
    resolution: {integrity: sha512-z+PwLziMNBeSQJonizz2AGnndLsP2DeGHIxDAn+wdHOGuo4Fo1x1HBPPXeE9TAOPHNNWQKCSlA2VZyYyyibDnQ==}
    engines: {node: '>=6.9.0'}

  '@babel/helpers@7.29.2':
    resolution: {integrity: sha512-HoGuUs4sCZNezVEKdVcwqmZN8GoHirLUcLaYVNBK2J0DadGtdcqgr3BCbvH8+XUo4NGjNl3VOtSjEKNzqfFgKw==}
    engines: {node: '>=6.9.0'}

  '@babel/highlight@7.25.9':
    resolution: {integrity: sha512-llL88JShoCsth8fF8R4SJnIn+WLvR6ccFxu1H3FlMhDontdcmZWf2HgIZ7AIqV3Xcck1idlohrN4EUBQz6klbw==}
    engines: {node: '>=6.9.0'}

  '@babel/parser@7.29.3':
    resolution: {integrity: sha512-b3ctpQwp+PROvU/cttc4OYl4MzfJUWy6FZg+PMXfzmt/+39iHVF0sDfqay8TQM3JA2EUOyKcFZt75jWriQijsA==}
    engines: {node: '>=6.0.0'}
    hasBin: true

  '@babel/plugin-proposal-decorators@7.29.0':
    resolution: {integrity: sha512-CVBVv3VY/XRMxRYq5dwr2DS7/MvqPm23cOCjbwNnVrfOqcWlnefua1uUs0sjdKOGjvPUG633o07uWzJq4oI6dA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-proposal-export-default-from@7.27.1':
    resolution: {integrity: sha512-hjlsMBl1aJc5lp8MoCDEZCiYzlgdRAShOjAfRw6X+GlpLpUPU7c3XNLsKFZbQk/1cRzBlJ7CXg3xJAJMrFa1Uw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-async-generators@7.8.4':
    resolution: {integrity: sha512-tycmZxkGfZaxhMRbXlPXuVFpdWlXpir2W4AMhSJgRKzk/eDlIXOhb2LHWoLpDF7TEHylV5zNhykX6KAgHJmTNw==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-bigint@7.8.3':
    resolution: {integrity: sha512-wnTnFlG+YxQm3vDxpGE57Pj0srRU4sHE/mDkt1qv2YJJSeUAec2ma4WLUnUPeKjyrfntVwe/N6dCXpU+zL3Npg==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-class-properties@7.12.13':
    resolution: {integrity: sha512-fm4idjKla0YahUNgFNLCB0qySdsoPiZP3iQE3rky0mBUtMZ23yDJ9SJdg6dXTSDnulOVqiF3Hgr9nbXvXTQZYA==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-class-static-block@7.14.5':
    resolution: {integrity: sha512-b+YyPmr6ldyNnM6sqYeMWE+bgJcJpO6yS4QD7ymxgH34GBPNDM/THBh8iunyvKIZztiwLH4CJZ0RxTk9emgpjw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-decorators@7.28.6':
    resolution: {integrity: sha512-71EYI0ONURHJBL4rSFXnITXqXrrY8q4P0q006DPfN+Rk+ASM+++IBXem/ruokgBZR8YNEWZ8R6B+rCb8VcUTqA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-dynamic-import@7.8.3':
    resolution: {integrity: sha512-5gdGbFon+PszYzqs83S3E5mpi7/y/8M9eC90MRTZfduQOYW76ig6SOSPNe41IG5LoP3FGBn2N0RjVDSQiS94kQ==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-export-default-from@7.28.6':
    resolution: {integrity: sha512-Svlx1fjJFnNz0LZeUaybRukSxZI3KkpApUmIRzEdXC5k8ErTOz0OD0kNrICi5Vc3GlpP5ZCeRyRO+mfWTSz+iQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-flow@7.28.6':
    resolution: {integrity: sha512-D+OrJumc9McXNEBI/JmFnc/0uCM2/Y3PEBG3gfV3QIYkKv5pvnpzFrl1kYCrcHJP8nOeFB/SHi1IHz29pNGuew==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-import-attributes@7.28.6':
    resolution: {integrity: sha512-jiLC0ma9XkQT3TKJ9uYvlakm66Pamywo+qwL+oL8HJOvc6TWdZXVfhqJr8CCzbSGUAbDOzlGHJC1U+vRfLQDvw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-import-meta@7.10.4':
    resolution: {integrity: sha512-Yqfm+XDx0+Prh3VSeEQCPU81yC+JWZ2pDPFSS4ZdpfZhp4MkFMaDC1UqseovEKwSUpnIL7+vK+Clp7bfh0iD7g==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-json-strings@7.8.3':
    resolution: {integrity: sha512-lY6kdGpWHvjoe2vk4WrAapEuBR69EMxZl+RoGRhrFGNYVK8mOPAW8VfbT/ZgrFbXlDNiiaxQnAtgVCZ6jv30EA==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-jsx@7.28.6':
    resolution: {integrity: sha512-wgEmr06G6sIpqr8YDwA2dSRTE3bJ+V0IfpzfSY3Lfgd7YWOaAdlykvJi13ZKBt8cZHfgH1IXN+CL656W3uUa4w==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-logical-assignment-operators@7.10.4':
    resolution: {integrity: sha512-d8waShlpFDinQ5MtvGU9xDAOzKH47+FFoney2baFIoMr952hKOLp1HR7VszoZvOsV/4+RRszNY7D17ba0te0ig==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-nullish-coalescing-operator@7.8.3':
    resolution: {integrity: sha512-aSff4zPII1u2QD7y+F8oDsz19ew4IGEJg9SVW+bqwpwtfFleiQDMdzA/R+UlWDzfnHFCxxleFT0PMIrR36XLNQ==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-numeric-separator@7.10.4':
    resolution: {integrity: sha512-9H6YdfkcK/uOnY/K7/aA2xpzaAgkQn37yzWUMRK7OaPOqOpGS1+n0H5hxT9AUw9EsSjPW8SVyMJwYRtWs3X3ug==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-object-rest-spread@7.8.3':
    resolution: {integrity: sha512-XoqMijGZb9y3y2XskN+P1wUGiVwWZ5JmoDRwx5+3GmEplNyVM2s2Dg8ILFQm8rWM48orGy5YpI5Bl8U1y7ydlA==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-optional-catch-binding@7.8.3':
    resolution: {integrity: sha512-6VPD0Pc1lpTqw0aKoeRTMiB+kWhAoT24PA+ksWSBrFtl5SIRVpZlwN3NNPQjehA2E/91FV3RjLWoVTglWcSV3Q==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-optional-chaining@7.8.3':
    resolution: {integrity: sha512-KoK9ErH1MBlCPxV0VANkXW2/dw4vlbGDrFgz8bmUsBGYkFRcbRwMh6cIJubdPrkxRwuGdtCk0v/wPTKbQgBjkg==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-private-property-in-object@7.14.5':
    resolution: {integrity: sha512-0wVnp9dxJ72ZUJDV27ZfbSj6iHLoytYZmh3rFcxNnvsJF3ktkzLDZPy/mA17HGsaQT3/DQsWYX1f1QGWkCoVUg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-top-level-await@7.14.5':
    resolution: {integrity: sha512-hx++upLv5U1rgYfwe1xBQUhRmU41NEvpUvrp8jkrSCdvGSnM5/qdRMtylJ6PG5OFkBaHkbTAKTnd3/YyESRHFw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-typescript@7.28.6':
    resolution: {integrity: sha512-+nDNmQye7nlnuuHDboPbGm00Vqg3oO8niRRL27/4LYHUsHYh0zJ1xWOz0uRwNFmM1Avzk8wZbc6rdiYhomzv/A==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-arrow-functions@7.27.1':
    resolution: {integrity: sha512-8Z4TGic6xW70FKThA5HYEKKyBpOOsucTOD1DjU3fZxDg+K3zBJcXMFnt/4yQiZnf5+MiOMSXQ9PaEK/Ilh1DeA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-async-generator-functions@7.29.0':
    resolution: {integrity: sha512-va0VdWro4zlBr2JsXC+ofCPB2iG12wPtVGTWFx2WLDOM3nYQZZIGP82qku2eW/JR83sD+k2k+CsNtyEbUqhU6w==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-async-to-generator@7.28.6':
    resolution: {integrity: sha512-ilTRcmbuXjsMmcZ3HASTe4caH5Tpo93PkTxF9oG2VZsSWsahydmcEHhix9Ik122RcTnZnUzPbmux4wh1swfv7g==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-block-scoping@7.28.6':
    resolution: {integrity: sha512-tt/7wOtBmwHPNMPu7ax4pdPz6shjFrmHDghvNC+FG9Qvj7D6mJcoRQIF5dy4njmxR941l6rgtvfSB2zX3VlUIw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-class-properties@7.28.6':
    resolution: {integrity: sha512-dY2wS3I2G7D697VHndN91TJr8/AAfXQNt5ynCTI/MpxMsSzHp+52uNivYT5wCPax3whc47DR8Ba7cmlQMg24bw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-class-static-block@7.28.6':
    resolution: {integrity: sha512-rfQ++ghVwTWTqQ7w8qyDxL1XGihjBss4CmTgGRCTAC9RIbhVpyp4fOeZtta0Lbf+dTNIVJer6ych2ibHwkZqsQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.12.0

  '@babel/plugin-transform-classes@7.28.6':
    resolution: {integrity: sha512-EF5KONAqC5zAqT783iMGuM2ZtmEBy+mJMOKl2BCvPZ2lVrwvXnB6o+OBWCS+CoeCCpVRF2sA2RBKUxvT8tQT5Q==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-computed-properties@7.28.6':
    resolution: {integrity: sha512-bcc3k0ijhHbc2lEfpFHgx7eYw9KNXqOerKWfzbxEHUGKnS3sz9C4CNL9OiFN1297bDNfUiSO7DaLzbvHQQQ1BQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-destructuring@7.28.5':
    resolution: {integrity: sha512-Kl9Bc6D0zTUcFUvkNuQh4eGXPKKNDOJQXVyyM4ZAQPMveniJdxi8XMJwLo+xSoW3MIq81bD33lcUe9kZpl0MCw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-export-namespace-from@7.27.1':
    resolution: {integrity: sha512-tQvHWSZ3/jH2xuq/vZDy0jNn+ZdXJeM8gHvX4lnJmsc3+50yPlWdZXIc5ay+umX+2/tJIqHqiEqcJvxlmIvRvQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-flow-strip-types@7.27.1':
    resolution: {integrity: sha512-G5eDKsu50udECw7DL2AcsysXiQyB7Nfg521t2OAJ4tbfTJ27doHLeF/vlI1NZGlLdbb/v+ibvtL1YBQqYOwJGg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-for-of@7.27.1':
    resolution: {integrity: sha512-BfbWFFEJFQzLCQ5N8VocnCtA8J1CLkNTe2Ms2wocj75dd6VpiqS5Z5quTYcUoo4Yq+DN0rtikODccuv7RU81sw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-function-name@7.27.1':
    resolution: {integrity: sha512-1bQeydJF9Nr1eBCMMbC+hdwmRlsv5XYOMu03YSWFwNs0HsAmtSxxF1fyuYPqemVldVyFmlCU7w8UE14LupUSZQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-literals@7.27.1':
    resolution: {integrity: sha512-0HCFSepIpLTkLcsi86GG3mTUzxV5jpmbv97hTETW3yzrAij8aqlD36toB1D0daVFJM8NK6GvKO0gslVQmm+zZA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-logical-assignment-operators@7.28.6':
    resolution: {integrity: sha512-+anKKair6gpi8VsM/95kmomGNMD0eLz1NQ8+Pfw5sAwWH9fGYXT50E55ZpV0pHUHWf6IUTWPM+f/7AAff+wr9A==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-modules-commonjs@7.28.6':
    resolution: {integrity: sha512-jppVbf8IV9iWWwWTQIxJMAJCWBuuKx71475wHwYytrRGQ2CWiDvYlADQno3tcYpS/T2UUWFQp3nVtYfK/YBQrA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-named-capturing-groups-regex@7.29.0':
    resolution: {integrity: sha512-1CZQA5KNAD6ZYQLPw7oi5ewtDNxH/2vuCh+6SmvgDfhumForvs8a1o9n0UrEoBD8HU4djO2yWngTQlXl1NDVEQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/plugin-transform-nullish-coalescing-operator@7.28.6':
    resolution: {integrity: sha512-3wKbRgmzYbw24mDJXT7N+ADXw8BC/imU9yo9c9X9NKaLF1fW+e5H1U5QjMUBe4Qo4Ox/o++IyUkl1sVCLgevKg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-numeric-separator@7.28.6':
    resolution: {integrity: sha512-SJR8hPynj8outz+SlStQSwvziMN4+Bq99it4tMIf5/Caq+3iOc0JtKyse8puvyXkk3eFRIA5ID/XfunGgO5i6w==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-object-rest-spread@7.28.6':
    resolution: {integrity: sha512-5rh+JR4JBC4pGkXLAcYdLHZjXudVxWMXbB6u6+E9lRL5TrGVbHt1TjxGbZ8CkmYw9zjkB7jutzOROArsqtncEA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-optional-catch-binding@7.28.6':
    resolution: {integrity: sha512-R8ja/Pyrv0OGAvAXQhSTmWyPJPml+0TMqXlO5w+AsMEiwb2fg3WkOvob7UxFSL3OIttFSGSRFKQsOhJ/X6HQdQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-optional-chaining@7.28.6':
    resolution: {integrity: sha512-A4zobikRGJTsX9uqVFdafzGkqD30t26ck2LmOzAuLL8b2x6k3TIqRiT2xVvA9fNmFeTX484VpsdgmKNA0bS23w==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-parameters@7.27.7':
    resolution: {integrity: sha512-qBkYTYCb76RRxUM6CcZA5KRu8K4SM8ajzVeUgVdMVO9NN9uI/GaVmBg/WKJJGnNokV9SY8FxNOVWGXzqzUidBg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-private-methods@7.28.6':
    resolution: {integrity: sha512-piiuapX9CRv7+0st8lmuUlRSmX6mBcVeNQ1b4AYzJxfCMuBfB0vBXDiGSmm03pKJw1v6cZ8KSeM+oUnM6yAExg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-private-property-in-object@7.28.6':
    resolution: {integrity: sha512-b97jvNSOb5+ehyQmBpmhOCiUC5oVK4PMnpRvO7+ymFBoqYjeDHIU9jnrNUuwHOiL9RpGDoKBpSViarV+BU+eVA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-display-name@7.28.0':
    resolution: {integrity: sha512-D6Eujc2zMxKjfa4Zxl4GHMsmhKKZ9VpcqIchJLvwTxad9zWIYulwYItBovpDOoNLISpcZSXoDJ5gaGbQUDqViA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-jsx-development@7.27.1':
    resolution: {integrity: sha512-ykDdF5yI4f1WrAolLqeF3hmYU12j9ntLQl/AOG1HAS21jxyg1Q0/J/tpREuYLfatGdGmXp/3yS0ZA76kOlVq9Q==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-jsx-self@7.27.1':
    resolution: {integrity: sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-jsx-source@7.27.1':
    resolution: {integrity: sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-jsx@7.28.6':
    resolution: {integrity: sha512-61bxqhiRfAACulXSLd/GxqmAedUSrRZIu/cbaT18T1CetkTmtDN15it7i80ru4DVqRK1WMxQhXs+Lf9kajm5Ow==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-react-pure-annotations@7.27.1':
    resolution: {integrity: sha512-JfuinvDOsD9FVMTHpzA/pBLisxpv1aSf+OIV8lgH3MuWrks19R27e6a6DipIg4aX1Zm9Wpb04p8wljfKrVSnPA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-regenerator@7.29.0':
    resolution: {integrity: sha512-FijqlqMA7DmRdg/aINBSs04y8XNTYw/lr1gJ2WsmBnnaNw1iS43EPkJW+zK7z65auG3AWRFXWj+NcTQwYptUog==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-runtime@7.29.0':
    resolution: {integrity: sha512-jlaRT5dJtMaMCV6fAuLbsQMSwz/QkvaHOHOSXRitGGwSpR1blCY4KUKoyP2tYO8vJcqYe8cEj96cqSztv3uF9w==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-shorthand-properties@7.27.1':
    resolution: {integrity: sha512-N/wH1vcn4oYawbJ13Y/FxcQrWk63jhfNa7jef0ih7PHSIHX2LB7GWE1rkPrOnka9kwMxb6hMl19p7lidA+EHmQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-spread@7.28.6':
    resolution: {integrity: sha512-9U4QObUC0FtJl05AsUcodau/RWDytrU6uKgkxu09mLR9HLDAtUMoPuuskm5huQsoktmsYpI+bGmq+iapDcriKA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-sticky-regex@7.27.1':
    resolution: {integrity: sha512-lhInBO5bi/Kowe2/aLdBAawijx+q1pQzicSgnkB6dUPc1+RC8QmJHKf2OjvU+NZWitguJHEaEmbV6VWEouT58g==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-template-literals@7.27.1':
    resolution: {integrity: sha512-fBJKiV7F2DxZUkg5EtHKXQdbsbURW3DZKQUWphDum0uRP6eHGGa/He9mc0mypL680pb+e/lDIthRohlv8NCHkg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-typescript@7.28.6':
    resolution: {integrity: sha512-0YWL2RFxOqEm9Efk5PvreamxPME8OyY0wM5wh5lHjF+VtVhdneCWGzZeSqzOfiobVqQaNCd2z0tQvnI9DaPWPw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-transform-unicode-regex@7.27.1':
    resolution: {integrity: sha512-xvINq24TRojDuyt6JGtHmkVkrfVV3FPT16uytxImLeBZqW3/H52yN+kM1MGuyPkIQxrzKwPHs5U/MP3qKyzkGw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/preset-react@7.28.5':
    resolution: {integrity: sha512-Z3J8vhRq7CeLjdC58jLv4lnZ5RKFUJWqH5emvxmv9Hv3BD1T9R/Im713R4MTKwvFaV74ejZ3sM01LyEKk4ugNQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/preset-typescript@7.28.5':
    resolution: {integrity: sha512-+bQy5WOI2V6LJZpPVxY+yp66XdZ2yifu0Mc1aP5CQKgjn4QM5IN2i5fAZ4xKop47pr8rpVhiAeu+nDQa12C8+g==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/runtime@7.29.2':
    resolution: {integrity: sha512-JiDShH45zKHWyGe4ZNVRrCjBz8Nh9TMmZG1kh4QTK8hCBTWBi8Da+i7s1fJw7/lYpM4ccepSNfqzZ/QvABBi5g==}
    engines: {node: '>=6.9.0'}

  '@babel/template@7.28.6':
    resolution: {integrity: sha512-YA6Ma2KsCdGb+WC6UpBVFJGXL58MDA6oyONbjyF/+5sBgxY/dwkhLogbMT2GXXyU84/IhRw/2D1Os1B/giz+BQ==}
    engines: {node: '>=6.9.0'}

  '@babel/traverse@7.29.0':
    resolution: {integrity: sha512-4HPiQr0X7+waHfyXPZpWPfWL/J7dcN1mx9gL6WdQVMbPnF3+ZhSMs8tCxN7oHddJE9fhNE7+lxdnlyemKfJRuA==}
    engines: {node: '>=6.9.0'}

  '@babel/types@7.29.0':
    resolution: {integrity: sha512-LwdZHpScM4Qz8Xw2iKSzS+cfglZzJGvofQICy7W7v4caru4EaAmyUuO6BGrbyQ2mYV11W0U8j5mBhd14dd3B0A==}
    engines: {node: '>=6.9.0'}

  '@commander-js/extra-typings@14.0.0':
    resolution: {integrity: sha512-hIn0ncNaJRLkZrxBIp5AsW/eXEHNKYQBh0aPdoUqNgD+Io3NIykQqpKFyKcuasZhicGaEZJX/JBSIkZ4e5x8Dg==}
    peerDependencies:
      commander: ~14.0.0

  '@date-fns/tz@1.4.1':
    resolution: {integrity: sha512-P5LUNhtbj6YfI3iJjw5EL9eUAG6OitD0W3fWQcpQjDRc/QIsL0tRNuO1PcDvPccWL1fSTXXdE1ds+l95DV/OFA==}

  '@drizzle-team/brocli@0.10.2':
    resolution: {integrity: sha512-z33Il7l5dKjUgGULTqBsQBQwckHh5AbIuxhdsIxDDiZAzBOrZO6q9ogcWC65kU382AfynTfgNumVcNIjuIua6w==}

  '@egjs/hammerjs@2.0.17':
    resolution: {integrity: sha512-XQsZgjm2EcVUiZQf11UBJQfmZeEmOW8DpI1gsFeln6w0ae0ii4dMQEQ0kjl6DspdWX1aGY1/loyXnP0JS06e/A==}
    engines: {node: '>=0.8.0'}

  '@esbuild/linux-x64@0.27.3':
    resolution: {integrity: sha512-Czi8yzXUWIQYAtL/2y6vogER8pvcsOsk5cpwL4Gk5nJqH5UZiVByIY8Eorm5R13gq+DQKYg0+JyQoytLQas4dA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]

  '@expo-google-fonts/inter@0.4.2':
    resolution: {integrity: sha512-syfiImMaDmq7cFi0of+waE2M4uSCyd16zgyWxdPOY7fN2VBmSLKEzkfbZgeOjJq61kSqPBNNtXjggiQiSD6gMQ==}

  '@expo/cli@54.0.23':
    resolution: {integrity: sha512-km0h72SFfQCmVycH/JtPFTVy69w6Lx1cHNDmfLfQqgKFYeeHTjx7LVDP4POHCtNxFP2UeRazrygJhlh4zz498g==}
    hasBin: true
    peerDependencies:
      expo: '*'
      expo-router: '*'
      react-native: '*'
    peerDependenciesMeta:
      expo-router:
        optional: true
      react-native:
        optional: true

  '@expo/cli@54.0.24':
    resolution: {integrity: sha512-5xse1bEgnVUBhOrtttc6xTNJVvjyTRavpzuF0/0nuj+312vfSbk7EiRbG+xJ2pW/iZxnhLPJkFCrPYG0nmheAQ==}
    hasBin: true
    peerDependencies:
      expo: '*'
      expo-router: '*'
      react-native: '*'
    peerDependenciesMeta:
      expo-router:
        optional: true
      react-native:
        optional: true

  '@expo/code-signing-certificates@0.0.6':
    resolution: {integrity: sha512-iNe0puxwBNEcuua9gmTGzq+SuMDa0iATai1FlFTMHJ/vUmKvN/V//drXoLJkVb5i5H3iE/n/qIJxyoBnXouD0w==}

  '@expo/config-plugins@54.0.4':
    resolution: {integrity: sha512-g2yXGICdoOw5i3LkQSDxl2Q5AlQCrG7oniu0pCPPO+UxGb7He4AFqSvPSy8HpRUj55io17hT62FTjYRD+d6j3Q==}

  '@expo/config-types@54.0.10':
    resolution: {integrity: sha512-/J16SC2an1LdtCZ67xhSkGXpALYUVUNyZws7v+PVsFZxClYehDSoKLqyRaGkpHlYrCc08bS0RF5E0JV6g50psA==}

  '@expo/config@12.0.13':
    resolution: {integrity: sha512-Cu52arBa4vSaupIWsF0h7F/Cg//N374nYb7HAxV0I4KceKA7x2UXpYaHOL7EEYYvp7tZdThBjvGpVmr8ScIvaQ==}

  '@expo/devcert@1.2.1':
    resolution: {integrity: sha512-qC4eaxmKMTmJC2ahwyui6ud8f3W60Ss7pMkpBq40Hu3zyiAaugPXnZ24145U7K36qO9UHdZUVxsCvIpz2RYYCA==}

  '@expo/devtools@0.1.8':
    resolution: {integrity: sha512-SVLxbuanDjJPgc0sy3EfXUMLb/tXzp6XIHkhtPVmTWJAp+FOr6+5SeiCfJrCzZFet0Ifyke2vX3sFcKwEvCXwQ==}
    peerDependencies:
      react: '*'
      react-native: '*'
    peerDependenciesMeta:
      react:
        optional: true
      react-native:
        optional: true

  '@expo/env@2.0.11':
    resolution: {integrity: sha512-xV+ps6YCW7XIPVUwFVCRN2nox09dnRwy8uIjwHWTODu0zFw4kp4omnVkl0OOjuu2XOe7tdgAHxikrkJt9xB/7Q==}

  '@expo/fingerprint@0.15.5':
    resolution: {integrity: sha512-mdVoAMcux1WlM6kd1RoWiHRNqKqS+J6mKmWQ/BKgeh937S/fcW58EE68O6nc4KDXtWi3PBeNHskOFcgyIuD4hw==}
    hasBin: true

  '@expo/image-utils@0.8.14':
    resolution: {integrity: sha512-5Sn+jG4Cw+shC2wDMXoqSAJnvERbiwzHn05FpWtD5IBflfTIs5gUmjzwiGVyjOdlMSQhgRrw/AymPbmO9h9mpQ==}

  '@expo/json-file@10.0.14':
    resolution: {integrity: sha512-yWwBFywFv+SxkJp/pIzzA416JVYflNUh7pqQzgaA6nXDqRyK7KfrqVzk8PdUfDnqbBcaZZxpzNssfQZzp5KHrA==}

  '@expo/metro-config@54.0.15':
    resolution: {integrity: sha512-SqIya4VZ9KHM1S9g+xR0A+QKw1Tfs7Gacx6bQNJ98vs4+O7I5+QP5mHZIB0QSZLUV8opiXebHYTiTu+0OAsIUw==}
    peerDependencies:
      expo: '*'
    peerDependenciesMeta:
      expo:
        optional: true

  '@expo/metro-runtime@6.1.2':
    resolution: {integrity: sha512-nvM+Qv45QH7pmYvP8JB1G8JpScrWND3KrMA6ZKe62cwwNiX/BjHU28Ear0v/4bQWXlOY0mv6B8CDIm8JxXde9g==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-dom: '*'
      react-native: '*'
    peerDependenciesMeta:
      react-dom:
        optional: true

  '@expo/metro@54.2.0':
    resolution: {integrity: sha512-h68TNZPGsk6swMmLm9nRSnE2UXm48rWwgcbtAHVMikXvbxdS41NDHHeqg1rcQ9AbznDRp6SQVC2MVpDnsRKU1w==}

  '@expo/ngrok-bin-linux-x64@2.3.41':
    resolution: {integrity: sha512-LcU3MbYHv7Sn2eFz8Yzo2rXduufOvX1/hILSirwCkH+9G8PYzpwp2TeGqVWuO+EmvtBe6NEYwgdQjJjN6I4L1A==}
    cpu: [x64]
    os: [linux]

  '@expo/ngrok-bin@2.3.42':
    resolution: {integrity: sha512-kyhORGwv9XpbPeNIrX6QZ9wDVCDOScyTwxeS+ScNmUqYoZqD9LRmEqF7bpDh5VonTsrXgWrGl7wD2++oSHcaTQ==}
    hasBin: true

  '@expo/ngrok@4.1.3':
    resolution: {integrity: sha512-AESYaROGIGKWwWmUyQoUXcbvaUZjmpecC5buArXxYou+RID813F8T0Y5jQ2HUY49mZpYfJiy9oh4VSN37GgrXA==}
    engines: {node: '>=10.19.0'}

  '@expo/osascript@2.4.3':
    resolution: {integrity: sha512-wbuj3EebM7W9hN/Wp4xTzKd6rQ2zKJzAxkFxkOOwyysLp0HOAgQ4/5RINyoS241pZUX2rUHq7mAJ7pcCQ8U0Ow==}
    engines: {node: '>=12'}

  '@expo/package-manager@1.10.5':
    resolution: {integrity: sha512-nCP9Mebfl3jvOr0/P6VAuyah6PAtun+aihIL2zAtuE8uSe94JWkVZ7051i0MUVO+y3gFpBqnr8IIH5ch+VJjHA==}

  '@expo/plist@0.4.8':
    resolution: {integrity: sha512-pfNtErGGzzRwHP+5+RqswzPDKkZrx+Cli0mzjQaus1ZWFsog5ibL+nVT3NcporW51o8ggnt7x813vtRbPiyOrQ==}

  '@expo/prebuild-config@54.0.8':
    resolution: {integrity: sha512-EA7N4dloty2t5Rde+HP0IEE+nkAQiu4A/+QGZGT9mFnZ5KKjPPkqSyYcRvP5bhQE10D+tvz6X0ngZpulbMdbsg==}
    peerDependencies:
      expo: '*'

  '@expo/require-utils@55.0.5':
    resolution: {integrity: sha512-U4K/CQ2VpXuwfNGsN+daKmYOt15hCP8v/pXaYH6eut7kdYZo6SfJ1yr67BIcJ+1Gzzs+QzTxswAZChKpXmceyw==}
    peerDependencies:
      typescript: ^5.0.0 || ^5.0.0-0
    peerDependenciesMeta:
      typescript:
        optional: true

  '@expo/schema-utils@0.1.8':
    resolution: {integrity: sha512-9I6ZqvnAvKKDiO+ZF8BpQQFYWXOJvTAL5L/227RUbWG1OVZDInFifzCBiqAZ3b67NRfeAgpgvbA7rejsqhY62A==}

  '@expo/sdk-runtime-versions@1.0.0':
    resolution: {integrity: sha512-Doz2bfiPndXYFPMRwPyGa1k5QaKDVpY806UJj570epIiMzWaYyCtobasyfC++qfIXVb5Ocy7r3tP9d62hAQ7IQ==}

  '@expo/spawn-async@1.8.0':
    resolution: {integrity: sha512-eb9xxd/LbuEGSdua4NumCu/McVB9EM+F/JxB9pWgnERw4HQ9XyTNH1KapG6oqLWR8TuRK2LQfzJlmNi94CVobw==}
    engines: {node: '>=12'}

  '@expo/sudo-prompt@9.3.2':
    resolution: {integrity: sha512-HHQigo3rQWKMDzYDLkubN5WQOYXJJE2eNqIQC2axC2iO3mHdwnIR7FgZVvHWtBwAdzBgAP0ECp8KqS8TiMKvgw==}

  '@expo/vector-icons@15.1.1':
    resolution: {integrity: sha512-Iu2VkcoI5vygbtYngm7jb4ifxElNVXQYdDrYkT7UCEIiKLeWnQY0wf2ZhHZ+Wro6Sc5TaumpKUOqDRpLi5rkvw==}
    peerDependencies:
      expo-font: '>=14.0.4'
      react: '*'
      react-native: '*'

  '@expo/ws-tunnel@1.0.6':
    resolution: {integrity: sha512-nDRbLmSrJar7abvUjp3smDwH8HcbZcoOEa5jVPUv9/9CajgmWw20JNRwTuBRzWIWIkEJDkz20GoNA+tSwUqk0Q==}

  '@expo/xcpretty@4.4.4':
    resolution: {integrity: sha512-4aQzz9vgxcNXFfo/iyNgDDYfsU5XGKKxWxZopw0cVotHiW+U8IJbIxMaxsINs6bHhtkG3StKNPcOrn3eBuxKPw==}
    hasBin: true

  '@floating-ui/core@1.7.5':
    resolution: {integrity: sha512-1Ih4WTWyw0+lKyFMcBHGbb5U5FtuHJuujoyyr5zTaWS5EYMeT6Jb2AuDeftsCsEuchO+mM2ij5+q9crhydzLhQ==}

  '@floating-ui/dom@1.7.6':
    resolution: {integrity: sha512-9gZSAI5XM36880PPMm//9dfiEngYoC6Am2izES1FF406YFsjvyBMmeJ2g4SAju3xWwtuynNRFL2s9hgxpLI5SQ==}

  '@floating-ui/react-dom@2.1.8':
    resolution: {integrity: sha512-cC52bHwM/n/CxS87FH0yWdngEZrjdtLW/qVruo68qg+prK7ZQ4YGdut2GyDVpoGeAYe/h899rVeOVm6Oi40k2A==}
    peerDependencies:
      react: '>=16.8.0'
      react-dom: '>=16.8.0'

  '@floating-ui/utils@0.2.11':
    resolution: {integrity: sha512-RiB/yIh78pcIxl6lLMG0CgBXAZ2Y0eVHqMPYugu+9U0AeT6YBeiJpf7lbdJNIugFP5SIjwNRgo4DhR1Qxi26Gg==}

  '@gerrit0/mini-shiki@3.23.0':
    resolution: {integrity: sha512-bEMORlG0cqdjVyCEuU0cDQbORWX+kYCeo0kV1lbxF5bt4r7SID2l9bqsxJEM0zndaxpOUT7riCyIVEuqq/Ynxg==}

  '@hookform/resolvers@3.10.0':
    resolution: {integrity: sha512-79Dv+3mDF7i+2ajj7SkypSKHhl1cbln1OGavqrsF7p6mbUv11xpqpacPsGDCTRvCSjEEIez2ef1NveSVL3b0Ag==}
    peerDependencies:
      react-hook-form: ^7.0.0

  '@isaacs/fs-minipass@4.0.1':
    resolution: {integrity: sha512-wgm9Ehl2jpeqP3zw/7mo3kRHFp5MEDhqAdwy1fTGkHAwnkGOVsgpvQhL8B5n1qlb01jV3n/bI0ZfZp5lWA1k4w==}
    engines: {node: '>=18.0.0'}

  '@isaacs/ttlcache@1.4.1':
    resolution: {integrity: sha512-RQgQ4uQ+pLbqXfOmieB91ejmLwvSgv9nLx6sT6sD83s7umBypgg+OIBOBbEUiJXrfpnp9j0mRhYYdzp9uqq3lA==}
    engines: {node: '>=12'}

  '@istanbuljs/load-nyc-config@1.1.0':
    resolution: {integrity: sha512-VjeHSlIzpv/NyD3N0YuHfXOPDIixcA1q2ZV98wsMqcYlPmv2n3Yb2lYP9XMElnaFVXg5A7YLTeLu6V84uQDjmQ==}
    engines: {node: '>=8'}

  '@istanbuljs/schema@0.1.6':
    resolution: {integrity: sha512-+Sg6GCR/wy1oSmQDFq4LQDAhm3ETKnorxN+y5nbLULOR3P0c14f2Wurzj3/xqPXtasLFfHd5iRFQ7AJt4KH2cw==}
    engines: {node: '>=8'}

  '@jest/create-cache-key-function@29.7.0':
    resolution: {integrity: sha512-4QqS3LY5PBmTRHj9sAg1HLoPzqAI0uOX6wI/TRqHIcOxlFidy6YEmCQJk6FSZjNLGCeubDMfmkWL+qaLKhSGQA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/environment@29.7.0':
    resolution: {integrity: sha512-aQIfHDq33ExsN4jP1NWGXhxgQ/wixs60gDiKO+XVMd8Mn0NWPWgc34ZQDTb2jKaUWQ7MuwoitXAsN2XVXNMpAw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/fake-timers@29.7.0':
    resolution: {integrity: sha512-q4DH1Ha4TTFPdxLsqDXK1d3+ioSL7yL5oCMJZgDYm6i+6CygW5E5xVr/D1HdsGxjt1ZWSfUAs9OxSB/BNelWrQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/schemas@29.6.3':
    resolution: {integrity: sha512-mo5j5X+jIZmJQveBKeS/clAueipV7KgiX1vMgCxam1RNYiqE1w62n0/tJJnHtjW8ZHcQco5gY85jA3mi0L+nSA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/transform@29.7.0':
    resolution: {integrity: sha512-ok/BTPFzFKVMwO5eOHRrvnBVHdRy9IrsrW1GpMaQ9MCnilNLXQKmAX8s1YXDFaai9xJpac2ySzV0YeRRECr2Vw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/types@29.6.3':
    resolution: {integrity: sha512-u3UPsIilWKOM3F9CXtrG8LEJmNxwoCQC/XVj4IKYXvvpx7QIi/Kg1LI5uDmDpKlac62NUtX7eLjRh+jVZcLOzw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jridgewell/gen-mapping@0.3.13':
    resolution: {integrity: sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==}

  '@jridgewell/remapping@2.3.5':
    resolution: {integrity: sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==}

  '@jridgewell/resolve-uri@3.1.2':
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/source-map@0.3.11':
    resolution: {integrity: sha512-ZMp1V8ZFcPG5dIWnQLr3NSI1MiCU7UETdS/A0G8V/XWHvJv3ZsFqutJn1Y5RPmAPX6F3BiE397OqveU/9NCuIA==}

  '@jridgewell/sourcemap-codec@1.5.5':
    resolution: {integrity: sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==}

  '@jridgewell/trace-mapping@0.3.31':
    resolution: {integrity: sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==}

  '@nodelib/fs.scandir@2.1.5':
    resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
    engines: {node: '>= 8'}

  '@nodelib/fs.stat@2.0.5':
    resolution: {integrity: sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==}
    engines: {node: '>= 8'}

  '@nodelib/fs.walk@1.2.8':
    resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
    engines: {node: '>= 8'}

  '@orval/angular@8.9.1':
    resolution: {integrity: sha512-S4OVIfyCO+lvNQ52tY6OnisYCYK71XiGKvSEP83I38YvQTKkkm1wJvkM5GC5Q9Evthqg169Qo59xSEiXFAftyw==}

  '@orval/axios@8.9.1':
    resolution: {integrity: sha512-OuZ6cY3r+GvL5HTfatoMYFgs3vDJw/my9S4CxwRRuQJF9sfP1Hsy5XYIbzCiDT60iIBQaakJg9CpXqP0yFLLkQ==}

  '@orval/core@8.9.1':
    resolution: {integrity: sha512-RkMud8bC7f3NZnm79baLFZGkYHR6lDd4DMPYjpJ5EmreM7tTTcVH5Nd6HEB0FVVd0UvcsS0tGWDIYiHxq04sJA==}
    peerDependencies:
      '@faker-js/faker': '>=10'
    peerDependenciesMeta:
      '@faker-js/faker':
        optional: true

  '@orval/fetch@8.9.1':
    resolution: {integrity: sha512-9SBqq0w6b5maIcHWbcSPYd0ZWg+VzOCTAmaVPsVpdmCR9ss8yZAkkmah1NiV44AAqE9PUtXTPEMZrH0MwUDoeg==}

  '@orval/hono@8.9.1':
    resolution: {integrity: sha512-kwLMcxnT5bm5aB7MYDsfFxwOdMDBBNzPcxdDgbVHAjOeNUkgAtCN+92yX9wAK89OjhkGb14V8McvU7eJqHl+nw==}

  '@orval/mcp@8.9.1':
    resolution: {integrity: sha512-2BL0tCclPZM0HIB8aUH3aWFwMqFGG1luoRgg5dLbJqQFpo2tMlIaahgQpNY9USOl1hIjhgY4CmlrcH1gqRXk4A==}

  '@orval/mock@8.9.1':
    resolution: {integrity: sha512-o66CdbPXVJ5GI6TEwH1UagKsfx8abV1aQIQ77vlN+QX9X6/gAeUU3e+6YsuCjANzM9xwcGLJgnHMgIlYNP32cA==}

  '@orval/query@8.9.1':
    resolution: {integrity: sha512-bCe903blfT4ICDR6OjszrLFFCvjfIA5bavyUUW3zxNxRdd65eaHrx9tLHv5fmpj+Rl+d1+t6XmJuAsQ4XJsXVg==}

  '@orval/solid-start@8.9.1':
    resolution: {integrity: sha512-2qWiTBxM3hPOBlUvf3TBVcvDjAnTfztlf57dRpzUeVyS9IglIit/Cedc3tmp9PzkjHzM82SifHVNANYd5F29Xg==}

  '@orval/swr@8.9.1':
    resolution: {integrity: sha512-ijP3ERy6MwvPrVaMgS8USDxj/LtbvzXEufeIC9Zm3qNaGDv1dAeE22MegRE8FfXweSD9f+FSrGl0baPe4Ne+fQ==}

  '@orval/zod@8.9.1':
    resolution: {integrity: sha512-MV75Xzz28W3ZttloNNmdTPa96AneY8FZExEwxmcySdY7lirJtErsqXt2EHnorETDAVEvSldVszhWG/AXpFBAPg==}

  '@pinojs/redact@0.4.0':
    resolution: {integrity: sha512-k2ENnmBugE/rzQfEcdWHcCY+/FM3VLzH9cYEsbdsoqrvzAKRhUZeRNhAZvB8OitQJ1TBed3yqWtdjzS6wJKBwg==}

  '@radix-ui/number@1.1.1':
    resolution: {integrity: sha512-MkKCwxlXTgz6CFoJx3pCwn07GKp36+aZyu/u2Ln2VrA5DcdyCZkASEDBTd8x5whTQQL5CiYf4prXKLcgQdv29g==}

  '@radix-ui/primitive@1.1.3':
    resolution: {integrity: sha512-JTF99U/6XIjCBo0wqkU5sK10glYe27MRRsfwoiq5zzOEZLHU3A3KCMa5X/azekYRCJ0HlwI0crAXS/5dEHTzDg==}

  '@radix-ui/react-accordion@1.2.12':
    resolution: {integrity: sha512-T4nygeh9YE9dLRPhAHSeOZi7HBXo+0kYIPJXayZfvWOWA0+n3dESrZbjfDPUABkUNym6Hd+f2IR113To8D2GPA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-alert-dialog@1.1.15':
    resolution: {integrity: sha512-oTVLkEw5GpdRe29BqJ0LSDFWI3qu0vR1M0mUkOQWDIUnY/QIkLpgDMWuKxP94c2NAC2LGcgVhG1ImF3jkZ5wXw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-arrow@1.1.7':
    resolution: {integrity: sha512-F+M1tLhO+mlQaOWspE8Wstg+z6PwxwRd8oQ8IXceWz92kfAmalTRf0EjrouQeo7QssEPfCn05B4Ihs1K9WQ/7w==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-aspect-ratio@1.1.8':
    resolution: {integrity: sha512-5nZrJTF7gH+e0nZS7/QxFz6tJV4VimhQb1avEgtsJxvvIp5JilL+c58HICsKzPxghdwaDt48hEfPM1au4zGy+w==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-avatar@1.1.11':
    resolution: {integrity: sha512-0Qk603AHGV28BOBO34p7IgD5m+V5Sg/YovfayABkoDDBM5d3NCx0Mp4gGrjzLGes1jV5eNOE1r3itqOR33VC6Q==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-checkbox@1.3.3':
    resolution: {integrity: sha512-wBbpv+NQftHDdG86Qc0pIyXk5IR3tM8Vd0nWLKDcX8nNn4nXFOFwsKuqw2okA/1D/mpaAkmuyndrPJTYDNZtFw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-collapsible@1.1.12':
    resolution: {integrity: sha512-Uu+mSh4agx2ib1uIGPP4/CKNULyajb3p92LsVXmH2EHVMTfZWpll88XJ0j4W0z3f8NK1eYl1+Mf/szHPmcHzyA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-collection@1.1.7':
    resolution: {integrity: sha512-Fh9rGN0MoI4ZFUNyfFVNU4y9LUz93u9/0K+yLgA2bwRojxM8JU1DyvvMBabnZPBgMWREAJvU2jjVzq+LrFUglw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-compose-refs@1.1.2':
    resolution: {integrity: sha512-z4eqJvfiNnFMHIIvXP3CY57y2WJs5g2v3X0zm9mEJkrkNv4rDxu+sg9Jh8EkXyeqBkB7SOcboo9dMVqhyrACIg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-context-menu@2.2.16':
    resolution: {integrity: sha512-O8morBEW+HsVG28gYDZPTrT9UUovQUlJue5YO836tiTJhuIWBm/zQHc7j388sHWtdH/xUZurK9olD2+pcqx5ww==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-context@1.1.2':
    resolution: {integrity: sha512-jCi/QKUM2r1Ju5a3J64TH2A5SpKAgh0LpknyqdQ4m6DCV0xJ2HG1xARRwNGPQfi1SLdLWZ1OJz6F4OMBBNiGJA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-context@1.1.3':
    resolution: {integrity: sha512-ieIFACdMpYfMEjF0rEf5KLvfVyIkOz6PDGyNnP+u+4xQ6jny3VCgA4OgXOwNx2aUkxn8zx9fiVcM8CfFYv9Lxw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-dialog@1.1.15':
    resolution: {integrity: sha512-TCglVRtzlffRNxRMEyR36DGBLJpeusFcgMVD9PZEzAKnUs1lKCgX5u9BmC2Yg+LL9MgZDugFFs1Vl+Jp4t/PGw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-direction@1.1.1':
    resolution: {integrity: sha512-1UEWRX6jnOA2y4H5WczZ44gOOjTEmlqv1uNW4GAJEO5+bauCBhv8snY65Iw5/VOS/ghKN9gr2KjnLKxrsvoMVw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-dismissable-layer@1.1.11':
    resolution: {integrity: sha512-Nqcp+t5cTB8BinFkZgXiMJniQH0PsUt2k51FUhbdfeKvc4ACcG2uQniY/8+h1Yv6Kza4Q7lD7PQV0z0oicE0Mg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-dropdown-menu@2.1.16':
    resolution: {integrity: sha512-1PLGQEynI/3OX/ftV54COn+3Sud/Mn8vALg2rWnBLnRaGtJDduNW/22XjlGgPdpcIbiQxjKtb7BkcjP00nqfJw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-focus-guards@1.1.3':
    resolution: {integrity: sha512-0rFg/Rj2Q62NCm62jZw0QX7a3sz6QCQU0LpZdNrJX8byRGaGVTqbrW9jAoIAHyMQqsNpeZ81YgSizOt5WXq0Pw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-focus-scope@1.1.7':
    resolution: {integrity: sha512-t2ODlkXBQyn7jkl6TNaw/MtVEVvIGelJDCG41Okq/KwUsJBwQ4XVZsHAVUkK4mBv3ewiAS3PGuUWuY2BoK4ZUw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-hover-card@1.1.15':
    resolution: {integrity: sha512-qgTkjNT1CfKMoP0rcasmlH2r1DAiYicWsDsufxl940sT2wHNEWWv6FMWIQXWhVdmC1d/HYfbhQx60KYyAtKxjg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-id@1.1.1':
    resolution: {integrity: sha512-kGkGegYIdQsOb4XjsfM97rXsiHaBwco+hFI66oO4s9LU+PLAC5oJ7khdOVFxkhsmlbpUqDAvXw11CluXP+jkHg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-label@2.1.8':
    resolution: {integrity: sha512-FmXs37I6hSBVDlO4y764TNz1rLgKwjJMQ0EGte6F3Cb3f4bIuHB/iLa/8I9VKkmOy+gNHq8rql3j686ACVV21A==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-menu@2.1.16':
    resolution: {integrity: sha512-72F2T+PLlphrqLcAotYPp0uJMr5SjP5SL01wfEspJbru5Zs5vQaSHb4VB3ZMJPimgHHCHG7gMOeOB9H3Hdmtxg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-menubar@1.1.16':
    resolution: {integrity: sha512-EB1FktTz5xRRi2Er974AUQZWg2yVBb1yjip38/lgwtCVRd3a+maUoGHN/xs9Yv8SY8QwbSEb+YrxGadVWbEutA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-navigation-menu@1.2.14':
    resolution: {integrity: sha512-YB9mTFQvCOAQMHU+C/jVl96WmuWeltyUEpRJJky51huhds5W2FQr1J8D/16sQlf0ozxkPK8uF3niQMdUwZPv5w==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-popover@1.1.15':
    resolution: {integrity: sha512-kr0X2+6Yy/vJzLYJUPCZEc8SfQcf+1COFoAqauJm74umQhta9M7lNJHP7QQS3vkvcGLQUbWpMzwrXYwrYztHKA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-popper@1.2.8':
    resolution: {integrity: sha512-0NJQ4LFFUuWkE7Oxf0htBKS6zLkkjBH+hM1uk7Ng705ReR8m/uelduy1DBo0PyBXPKVnBA6YBlU94MBGXrSBCw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-portal@1.1.9':
    resolution: {integrity: sha512-bpIxvq03if6UNwXZ+HTK71JLh4APvnXntDc6XOX8UVq4XQOVl7lwok0AvIl+b8zgCw3fSaVTZMpAPPagXbKmHQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-presence@1.1.5':
    resolution: {integrity: sha512-/jfEwNDdQVBCNvjkGit4h6pMOzq8bHkopq458dPt2lMjx+eBQUohZNG9A7DtO/O5ukSbxuaNGXMjHicgwy6rQQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-primitive@2.1.3':
    resolution: {integrity: sha512-m9gTwRkhy2lvCPe6QJp4d3G1TYEUHn/FzJUtq9MjH46an1wJU+GdoGC5VLof8RX8Ft/DlpshApkhswDLZzHIcQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-primitive@2.1.4':
    resolution: {integrity: sha512-9hQc4+GNVtJAIEPEqlYqW5RiYdrr8ea5XQ0ZOnD6fgru+83kqT15mq2OCcbe8KnjRZl5vF3ks69AKz3kh1jrhg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-progress@1.1.8':
    resolution: {integrity: sha512-+gISHcSPUJ7ktBy9RnTqbdKW78bcGke3t6taawyZ71pio1JewwGSJizycs7rLhGTvMJYCQB1DBK4KQsxs7U8dA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-radio-group@1.3.8':
    resolution: {integrity: sha512-VBKYIYImA5zsxACdisNQ3BjCBfmbGH3kQlnFVqlWU4tXwjy7cGX8ta80BcrO+WJXIn5iBylEH3K6ZTlee//lgQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-roving-focus@1.1.11':
    resolution: {integrity: sha512-7A6S9jSgm/S+7MdtNDSb+IU859vQqJ/QAtcYQcfFC6W8RS4IxIZDldLR0xqCFZ6DCyrQLjLPsxtTNch5jVA4lA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-scroll-area@1.2.10':
    resolution: {integrity: sha512-tAXIa1g3sM5CGpVT0uIbUx/U3Gs5N8T52IICuCtObaos1S8fzsrPXG5WObkQN3S6NVl6wKgPhAIiBGbWnvc97A==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-select@2.2.6':
    resolution: {integrity: sha512-I30RydO+bnn2PQztvo25tswPH+wFBjehVGtmagkU78yMdwTwVf12wnAOF+AeP8S2N8xD+5UPbGhkUfPyvT+mwQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-separator@1.1.8':
    resolution: {integrity: sha512-sDvqVY4itsKwwSMEe0jtKgfTh+72Sy3gPmQpjqcQneqQ4PFmr/1I0YA+2/puilhggCe2gJcx5EBAYFkWkdpa5g==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-slider@1.3.6':
    resolution: {integrity: sha512-JPYb1GuM1bxfjMRlNLE+BcmBC8onfCi60Blk7OBqi2MLTFdS+8401U4uFjnwkOr49BLmXxLC6JHkvAsx5OJvHw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-slot@1.2.0':
    resolution: {integrity: sha512-ujc+V6r0HNDviYqIK3rW4ffgYiZ8g5DEHrGJVk4x7kTlLXRDILnKX9vAUYeIsLOoDpDJ0ujpqMkjH4w2ofuo6w==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-slot@1.2.3':
    resolution: {integrity: sha512-aeNmHnBxbi2St0au6VBVC7JXFlhLlOnvIIlePNniyUNAClzmtAUEY8/pBiK3iHjufOlwA+c20/8jngo7xcrg8A==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-slot@1.2.4':
    resolution: {integrity: sha512-Jl+bCv8HxKnlTLVrcDE8zTMJ09R9/ukw4qBs/oZClOfoQk/cOTbDn+NceXfV7j09YPVQUryJPHurafcSg6EVKA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-switch@1.2.6':
    resolution: {integrity: sha512-bByzr1+ep1zk4VubeEVViV592vu2lHE2BZY5OnzehZqOOgogN80+mNtCqPkhn2gklJqOpxWgPoYTSnhBCqpOXQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-tabs@1.1.13':
    resolution: {integrity: sha512-7xdcatg7/U+7+Udyoj2zodtI9H/IIopqo+YOIcZOq1nJwXWBZ9p8xiu5llXlekDbZkca79a/fozEYQXIA4sW6A==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-toast@1.2.15':
    resolution: {integrity: sha512-3OSz3TacUWy4WtOXV38DggwxoqJK4+eDkNMl5Z/MJZaoUPaP4/9lf81xXMe1I2ReTAptverZUpbPY4wWwWyL5g==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-toggle-group@1.1.11':
    resolution: {integrity: sha512-5umnS0T8JQzQT6HbPyO7Hh9dgd82NmS36DQr+X/YJ9ctFNCiiQd6IJAYYZ33LUwm8M+taCz5t2ui29fHZc4Y6Q==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-toggle@1.1.10':
    resolution: {integrity: sha512-lS1odchhFTeZv3xwHH31YPObmJn8gOg7Lq12inrr0+BH/l3Tsq32VfjqH1oh80ARM3mlkfMic15n0kg4sD1poQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-tooltip@1.2.8':
    resolution: {integrity: sha512-tY7sVt1yL9ozIxvmbtN5qtmH2krXcBCfjEiCgKGLqunJHvgvZG2Pcl2oQ3kbcZARb1BGEHdkLzcYGO8ynVlieg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-use-callback-ref@1.1.1':
    resolution: {integrity: sha512-FkBMwD+qbGQeMu1cOHnuGB6x4yzPjho8ap5WtbEJ26umhgqVXbhekKUQO+hZEL1vU92a3wHwdp0HAcqAUF5iDg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-controllable-state@1.2.2':
    resolution: {integrity: sha512-BjasUjixPFdS+NKkypcyyN5Pmg83Olst0+c6vGov0diwTEo6mgdqVR6hxcEgFuh4QrAs7Rc+9KuGJ9TVCj0Zzg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-effect-event@0.0.2':
    resolution: {integrity: sha512-Qp8WbZOBe+blgpuUT+lw2xheLP8q0oatc9UpmiemEICxGvFLYmHm9QowVZGHtJlGbS6A6yJ3iViad/2cVjnOiA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-escape-keydown@1.1.1':
    resolution: {integrity: sha512-Il0+boE7w/XebUHyBjroE+DbByORGR9KKmITzbR7MyQ4akpORYP/ZmbhAr0DG7RmmBqoOnZdy2QlvajJ2QA59g==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-is-hydrated@0.1.0':
    resolution: {integrity: sha512-U+UORVEq+cTnRIaostJv9AGdV3G6Y+zbVd+12e18jQ5A3c0xL03IhnHuiU4UV69wolOQp5GfR58NW/EgdQhwOA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-layout-effect@1.1.1':
    resolution: {integrity: sha512-RbJRS4UWQFkzHTTwVymMTUv8EqYhOp8dOOviLj2ugtTiXRaRQS7GLGxZTLL1jWhMeoSCf5zmcZkqTl9IiYfXcQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-previous@1.1.1':
    resolution: {integrity: sha512-2dHfToCj/pzca2Ck724OZ5L0EVrr3eHRNsG/b3xQJLA2hZpVCS99bLAX+hm1IHXDEnzU6by5z/5MIY794/a8NQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-rect@1.1.1':
    resolution: {integrity: sha512-QTYuDesS0VtuHNNvMh+CjlKJ4LJickCMUAqjlE3+j8w+RlRpwyX3apEQKGFzbZGdo7XNG1tXa+bQqIE7HIXT2w==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-size@1.1.1':
    resolution: {integrity: sha512-ewrXRDTAqAXlkl6t/fkXWNAhFX9I+CkKlw6zjEwk86RSPKwZr3xpBRso655aqYafwtnbpHLj6toFzmd6xdVptQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-visually-hidden@1.2.3':
    resolution: {integrity: sha512-pzJq12tEaaIhqjbzpCuv/OypJY/BPavOofm+dbab+MHLajy277+1lLm6JFcGgF5eskJ6mquGirhXY2GD/8u8Ug==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/rect@1.1.1':
    resolution: {integrity: sha512-HPwpGIzkl28mWyZqG52jiqDJ12waP11Pa1lGoiyUkIEuMLBP0oeK/C89esbXrxsky5we7dfd8U58nm0SgAWpVw==}

  '@react-native-async-storage/async-storage@2.2.0':
    resolution: {integrity: sha512-gvRvjR5JAaUZF8tv2Kcq/Gbt3JHwbKFYfmb445rhOj6NUMx3qPLixmDx5pZAyb9at1bYvJ4/eTUipU5aki45xw==}
    peerDependencies:
      react-native: ^0.0.0-0 || >=0.65 <1.0

  '@react-native/assets-registry@0.81.5':
    resolution: {integrity: sha512-705B6x/5Kxm1RKRvSv0ADYWm5JOnoiQ1ufW7h8uu2E6G9Of/eE6hP/Ivw3U5jI16ERqZxiKQwk34VJbB0niX9w==}
    engines: {node: '>= 20.19.4'}

  '@react-native/babel-plugin-codegen@0.81.5':
    resolution: {integrity: sha512-oF71cIH6je3fSLi6VPjjC3Sgyyn57JLHXs+mHWc9MoCiJJcM4nqsS5J38zv1XQ8d3zOW2JtHro+LF0tagj2bfQ==}
    engines: {node: '>= 20.19.4'}

  '@react-native/babel-preset@0.81.5':
    resolution: {integrity: sha512-UoI/x/5tCmi+pZ3c1+Ypr1DaRMDLI3y+Q70pVLLVgrnC3DHsHRIbHcCHIeG/IJvoeFqFM2sTdhSOLJrf8lOPrA==}
    engines: {node: '>= 20.19.4'}
    peerDependencies:
      '@babel/core': '*'

  '@react-native/codegen@0.81.5':
    resolution: {integrity: sha512-a2TDA03Up8lpSa9sh5VRGCQDXgCTOyDOFH+aqyinxp1HChG8uk89/G+nkJ9FPd0rqgi25eCTR16TWdS3b+fA6g==}
    engines: {node: '>= 20.19.4'}
    peerDependencies:
      '@babel/core': '*'

  '@react-native/community-cli-plugin@0.81.5':
    resolution: {integrity: sha512-yWRlmEOtcyvSZ4+OvqPabt+NS36vg0K/WADTQLhrYrm9qdZSuXmq8PmdJWz/68wAqKQ+4KTILiq2kjRQwnyhQw==}
    engines: {node: '>= 20.19.4'}
    peerDependencies:
      '@react-native-community/cli': '*'
      '@react-native/metro-config': '*'
    peerDependenciesMeta:
      '@react-native-community/cli':
        optional: true
      '@react-native/metro-config':
        optional: true

  '@react-native/debugger-frontend@0.81.5':
    resolution: {integrity: sha512-bnd9FSdWKx2ncklOetCgrlwqSGhMHP2zOxObJbOWXoj7GHEmih4MKarBo5/a8gX8EfA1EwRATdfNBQ81DY+h+w==}
    engines: {node: '>= 20.19.4'}

  '@react-native/dev-middleware@0.81.5':
    resolution: {integrity: sha512-WfPfZzboYgo/TUtysuD5xyANzzfka8Ebni6RIb2wDxhb56ERi7qDrE4xGhtPsjCL4pQBXSVxyIlCy0d8I6EgGA==}
    engines: {node: '>= 20.19.4'}

  '@react-native/gradle-plugin@0.81.5':
    resolution: {integrity: sha512-hORRlNBj+ReNMLo9jme3yQ6JQf4GZpVEBLxmTXGGlIL78MAezDZr5/uq9dwElSbcGmLEgeiax6e174Fie6qPLg==}
    engines: {node: '>= 20.19.4'}

  '@react-native/js-polyfills@0.81.5':
    resolution: {integrity: sha512-fB7M1CMOCIUudTRuj7kzxIBTVw2KXnsgbQ6+4cbqSxo8NmRRhA0Ul4ZUzZj3rFd3VznTL4Brmocv1oiN0bWZ8w==}
    engines: {node: '>= 20.19.4'}

  '@react-native/normalize-colors@0.74.89':
    resolution: {integrity: sha512-qoMMXddVKVhZ8PA1AbUCk83trpd6N+1nF2A6k1i6LsQObyS92fELuk8kU/lQs6M7BsMHwqyLCpQJ1uFgNvIQXg==}

  '@react-native/normalize-colors@0.81.5':
    resolution: {integrity: sha512-0HuJ8YtqlTVRXGZuGeBejLE04wSQsibpTI+RGOyVqxZvgtlLLC/Ssw0UmbHhT4lYMp2fhdtvKZSs5emWB1zR/g==}

  '@react-native/virtualized-lists@0.81.5':
    resolution: {integrity: sha512-UVXgV/db25OPIvwZySeToXD/9sKKhOdkcWmmf4Jh8iBZuyfML+/5CasaZ1E7Lqg6g3uqVQq75NqIwkYmORJMPw==}
    engines: {node: '>= 20.19.4'}
    peerDependencies:
      '@types/react': ^19.1.0
      react: '*'
      react-native: '*'
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@react-navigation/bottom-tabs@7.16.1':
    resolution: {integrity: sha512-wjFATJmbq0K8B96Ax0JcK2+Eu7syfYvQ5qUd/tgcv8JuCYLwKKqojJMAl31qdjpKqFG09pQ6TSdEDHOek60CAA==}
    peerDependencies:
      '@react-navigation/native': ^7.2.4
      react: '>= 18.2.0'
      react-native: '*'
      react-native-safe-area-context: '>= 4.0.0'
      react-native-screens: '>= 4.0.0'

  '@react-navigation/core@7.17.4':
    resolution: {integrity: sha512-Rv9E2oNNQEkPGpmu9q+vJwGJRSQR6LBg5L+Yo1QHjtwGbHUbjkIKOdYymDZoZYgNzX2OD4rAIlfuzbDKa3cCeA==}
    peerDependencies:
      react: '>= 18.2.0'

  '@react-navigation/elements@2.9.18':
    resolution: {integrity: sha512-mKEvDr6CkCVYZSb8W9WubNseihL+1c8M7ktZJCTCbMk8rQgdQfkdRNwpSUQKspdGpUHCb9cyzvaiuzl1NtjVgw==}
    peerDependencies:
      '@react-native-masked-view/masked-view': '>= 0.2.0'
      '@react-navigation/native': ^7.2.4
      react: '>= 18.2.0'
      react-native: '*'
      react-native-safe-area-context: '>= 4.0.0'
    peerDependenciesMeta:
      '@react-native-masked-view/masked-view':
        optional: true

  '@react-navigation/native-stack@7.15.1':
    resolution: {integrity: sha512-kNrJggwoB/onC0MpZIuZ6qaqeAziFchz+W9txBzhd6qbWmB1OkPVUnu6fWgc6BQc7MeMf59djVmqgX+6kJU1Ug==}
    peerDependencies:
      '@react-navigation/native': ^7.2.4
      react: '>= 18.2.0'
      react-native: '*'
      react-native-safe-area-context: '>= 4.0.0'
      react-native-screens: '>= 4.0.0'

  '@react-navigation/native@7.2.4':
    resolution: {integrity: sha512-eWC2D3JjhYLId2fVTZhhCiUpWIaPhO9XyEb7Wq8ElmOHyIODlbOzgZ0rKia02OIsDKr9BzZl2sK1dL70yMxDaw==}
    peerDependencies:
      react: '>= 18.2.0'
      react-native: '*'

  '@react-navigation/routers@7.5.5':
    resolution: {integrity: sha512-9/hhMte12Kgu+pMnLfA4EWJ0OQmIEAMVMX06FPH2yGkEQSQ3JhhCN/GkcRikzQhtEi97VYYQA15umptBUShcOQ==}

  '@replit/vite-plugin-cartographer@0.5.5':
    resolution: {integrity: sha512-iEXsvofgEQb1BSjMflHfuqVbRhWqI7n8u5ESSH+cSoxHgX4Lk8wM7qHk1h7u1BZSwqmPn8ftsRFSN4IVvUzB5w==}

  '@replit/vite-plugin-runtime-error-modal@0.0.6':
    resolution: {integrity: sha512-53iuzLsrvcUnWxAo0fvNrUhOf7LYJ+3at61dZeTIrkaZD4vGNjTbvE0j50TFcjjTC9UM74uprlnQ4+L2A//Cjg==}

  '@rolldown/pluginutils@1.0.0-rc.3':
    resolution: {integrity: sha512-eybk3TjzzzV97Dlj5c+XrBFW57eTNhzod66y9HrBlzJ6NsCrWCp/2kaPS3K9wJmurBC0Tdw4yPjXKZqlznim3Q==}

  '@rollup/rollup-linux-x64-gnu@4.60.3':
    resolution: {integrity: sha512-DAZDBHQfG2oQuhY7mc6I3/qB4LU2fQCjRvxbDwd/Jdvb9fypP4IJ4qmtu6lNjes6B531AI8cg1aKC2di97bUxA==}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  '@scalar/helpers@0.5.2':
    resolution: {integrity: sha512-Pi1GAl8jO6ungmGj2sjDfCfqiBNrKW6HXDZmminV94ybGU/KtRLOqHwd0n9FIhY3j0RYGpGC0VCuniCICfQPHg==}
    engines: {node: '>=22'}

  '@scalar/helpers@0.6.0':
    resolution: {integrity: sha512-pfSamAgBxqFeE8IpEG6uGkHlnPhY1CLeOTttV9+vKQbrBk5b7vvyTsUXv0Hz4kNU1TFrxcTTPE+Akn5S+jlTtQ==}
    engines: {node: '>=22'}

  '@scalar/json-magic@0.12.12':
    resolution: {integrity: sha512-F7q6mPlVdHntvEvlJPwzvA2E2fjxsNtMeSzODtcdhp4mdQndMqqxEhy0rKmRvk36Oka+9F/hl3EDG194BpNBGg==}
    engines: {node: '>=22'}

  '@scalar/json-magic@0.12.8':
    resolution: {integrity: sha512-a559iO8tmFeA90JJAAM3U5x1Asf3mr0Z8uDC1PmyLTDjdSOfajP7EY9VzNoXE2cM48ilf9qrjmkbw/d4VCFjQw==}
    engines: {node: '>=22'}

  '@scalar/openapi-parser@0.25.12':
    resolution: {integrity: sha512-1hajBAbc7cbEcsSZEQxaPXZyCjMf6h6hObV+SO32jkC6rrxinPXQIucDu9HTu/jm/FaaMnNhc8/XDWz5/E49cQ==}
    engines: {node: '>=22'}

  '@scalar/openapi-types@0.8.0':
    resolution: {integrity: sha512-WmaxVSfvY5K/TwcG2B2TU1WOe1As1uc2s7myswtP6dBlcjU3hM08SApxv/jmyGaCE8t4gO5BBhmHY4pDUfmr2g==}
    engines: {node: '>=22'}

  '@scalar/openapi-upgrader@0.2.6':
    resolution: {integrity: sha512-pvEmfSCDNYR4+lygidUqfo+shzyp4OSh9+UgK110rzA8Oot6WbJBM03Fuq3M255G7G6R9iXyfsebB7MBUocPkw==}
    engines: {node: '>=22'}

  '@sec-ant/readable-stream@0.4.1':
    resolution: {integrity: sha512-831qok9r2t8AlxLko40y2ebgSDhenenCatLVeW/uBtnHPyhHOvG0C7TvfgecV+wHzIm5KUICgzmVpWS+IMEAeg==}

  '@shikijs/engine-oniguruma@3.23.0':
    resolution: {integrity: sha512-1nWINwKXxKKLqPibT5f4pAFLej9oZzQTsby8942OTlsJzOBZ0MWKiwzMsd+jhzu8YPCHAswGnnN1YtQfirL35g==}

  '@shikijs/langs@3.23.0':
    resolution: {integrity: sha512-2Ep4W3Re5aB1/62RSYQInK9mM3HsLeB91cHqznAJMuylqjzNVAVCMnNWRHFtcNHXsoNRayP9z1qj4Sq3nMqYXg==}

  '@shikijs/themes@3.23.0':
    resolution: {integrity: sha512-5qySYa1ZgAT18HR/ypENL9cUSGOeI2x+4IvYJu4JgVJdizn6kG4ia5Q1jDEOi7gTbN4RbuYtmHh0W3eccOrjMA==}

  '@shikijs/types@3.23.0':
    resolution: {integrity: sha512-3JZ5HXOZfYjsYSk0yPwBrkupyYSLpAE26Qc0HLghhZNGTZg/SKxXIIgoxOpmmeQP0RRSDJTk1/vPfw9tbw+jSQ==}

  '@shikijs/vscode-textmate@10.0.2':
    resolution: {integrity: sha512-83yeghZ2xxin3Nj8z1NMd/NCuca+gsYXswywDy5bHvwlWL8tpTQmzGeUuHd9FC3E/SBEMvzJRwWEOz5gGes9Qg==}

  '@sinclair/typebox@0.27.10':
    resolution: {integrity: sha512-MTBk/3jGLNB2tVxv6uLlFh1iu64iYOQ2PbdOSK3NW8JZsmlaOh2q6sdtKowBhfw8QFLmYNzTW4/oK4uATIi6ZA==}

  '@sindresorhus/is@4.6.0':
    resolution: {integrity: sha512-t09vSN3MdfsyCHoFcTRCH/iUtG7OJ0CsjzB8cjAmKc/va/kIgeDI/TxsigdncE/4be734m0cvIYwNaV4i2XqAw==}
    engines: {node: '>=10'}

  '@sindresorhus/merge-streams@4.0.0':
    resolution: {integrity: sha512-tlqY9xq5ukxTUZBmoOp+m61cqwQD5pHJtFY3Mn8CA8ps6yghLH/Hw8UPdqg4OLmFW3IFlcXnQNmo/dh8HzXYIQ==}
    engines: {node: '>=18'}

  '@sinonjs/commons@3.0.1':
    resolution: {integrity: sha512-K3mCHKQ9sVh8o1C9cxkwxaOmXoAMlDxC1mYyHrjqOWEcBjYr76t96zL2zlj5dUGZ3HSw240X1qgH3Mjf1yJWpQ==}

  '@sinonjs/fake-timers@10.3.0':
    resolution: {integrity: sha512-V4BG07kuYSUkTCSBHG8G8TNhM+F19jXFWnQtzj+we8DrkpSBCee9Z3Ms8yiGer/dlmhe35/Xdgyo3/0rQKg7YA==}

  '@stardazed/streams-text-encoding@1.0.2':
    resolution: {integrity: sha512-f2Z15BId3t44a/u21yYSGXFAkCyKocmAyduoAy7swnZ4xIfbaZlOWsgly/jDNNOuj6hYQN72UaBRe3Z/tOHfqg==}

  '@szmarczak/http-timer@4.0.6':
    resolution: {integrity: sha512-4BAffykYOgO+5nzBWYwE3W90sBgLJoUPRWWcL8wlyiM8IB8ipJz3UMJ9KXQd1RKQXpKp8Tutn80HZtWsu2u76w==}
    engines: {node: '>=10'}

  '@tabby_ai/hijri-converter@1.0.5':
    resolution: {integrity: sha512-r5bClKrcIusDoo049dSL8CawnHR6mRdDwhlQuIgZRNty68q0x8k3Lf1BtPAMxRf/GgnHBnIO4ujd3+GQdLWzxQ==}
    engines: {node: '>=16.0.0'}

  '@tailwindcss/node@4.3.0':
    resolution: {integrity: sha512-aFb4gUhFOgdh9AXo4IzBEOzBkkAxm9VigwDJnMIYv3lcfXCJVesNfbEaBl4BNgVRyid92AmdviqwBUBRKSeY3g==}

  '@tailwindcss/oxide-linux-x64-gnu@4.3.0':
    resolution: {integrity: sha512-DRNdQRpSGzRGfARVuVkxvM8Q12nh19l4BF/G7zGA1oe+9wcC6saFBHTISrpIcKzhiXtSrlSrluCfvMuledoCTQ==}
    engines: {node: '>= 20'}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  '@tailwindcss/oxide-wasm32-wasi@4.3.0':
    resolution: {integrity: sha512-HNZGOUxEmElksYR7S6sC5jTeNGpobAsy9u7Gu0AskJ8/20FR9GqebUyB+HBcU/ax6BHuiuJi+Oda4B+YX6H1yA==}
    engines: {node: '>=14.0.0'}
    cpu: [wasm32]
    bundledDependencies:
      - '@napi-rs/wasm-runtime'
      - '@emnapi/core'
      - '@emnapi/runtime'
      - '@tybys/wasm-util'
      - '@emnapi/wasi-threads'
      - tslib

  '@tailwindcss/oxide@4.3.0':
    resolution: {integrity: sha512-F7HZGBeN9I0/AuuJS5PwcD8xayx5ri5GhjYUDBEVYUkexyA/giwbDNjRVrxSezE3T250OU2K/wp/ltWx3UOefg==}
    engines: {node: '>= 20'}

  '@tailwindcss/vite@4.3.0':
    resolution: {integrity: sha512-t6J3OrB5Fc0ExuhohouH0fWUGMYL6PTLhW+E7zIk/pdbnJARZDCwjBznFnkh5ynRnIRSI4YjtTH0t6USjJISrw==}
    peerDependencies:
      vite: ^5.2.0 || ^6 || ^7 || ^8

  '@tanstack/query-core@5.100.9':
    resolution: {integrity: sha512-SJSFw1S8+kQ0+knv/XGfrbocWoAlT7vDKsSImtLx3ZPQmEcR46hkDjLSvynSy25N8Ms4tIEini1FuBd5k7IscQ==}

  '@tanstack/react-query@5.100.9':
    resolution: {integrity: sha512-Oa44XkaI3kCNN6ME0KByU3xT3SEUNOMfZpHxL6+wFoTm+OeUFYHKdeYVe0aOXlRDm/f15sgLwEt2HDorIdW8+A==}
    peerDependencies:
      react: ^18 || ^19

  '@types/babel__core@7.20.5':
    resolution: {integrity: sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==}

  '@types/babel__generator@7.27.0':
    resolution: {integrity: sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==}

  '@types/babel__template@7.4.4':
    resolution: {integrity: sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==}

  '@types/babel__traverse@7.28.0':
    resolution: {integrity: sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==}

  '@types/body-parser@1.19.6':
    resolution: {integrity: sha512-HLFeCYgz89uk22N5Qg3dvGvsv46B8GLvKKo1zKG4NybA8U2DiEO3w9lqGg29t/tfLRJpJ6iQxnVw4OnB7MoM9g==}

  '@types/cacheable-request@6.0.3':
    resolution: {integrity: sha512-IQ3EbTzGxIigb1I3qPZc1rWJnH0BmSKv5QYTalEwweFvyBDLSAe24zP0le/hyi7ecGfZVlIVAg4BZqb8WBwKqw==}

  '@types/connect@3.4.38':
    resolution: {integrity: sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==}

  '@types/cookie-parser@1.4.10':
    resolution: {integrity: sha512-B4xqkqfZ8Wek+rCOeRxsjMS9OgvzebEzzLYw7NHYuvzb7IdxOkI0ZHGgeEBX4PUM7QGVvNSK60T3OvWj3YfBRg==}
    peerDependencies:
      '@types/express': '*'

  '@types/cors@2.8.19':
    resolution: {integrity: sha512-mFNylyeyqN93lfe/9CSxOGREz8cpzAhH+E93xJ4xWQf62V8sQ/24reV2nyzUWM6H6Xji+GGHpkbLe7pVoUEskg==}

  '@types/d3-array@3.2.2':
    resolution: {integrity: sha512-hOLWVbm7uRza0BYXpIIW5pxfrKe0W+D5lrFiAEYR+pb6w3N2SwSMaJbXdUfSEv+dT4MfHBLtn5js0LAWaO6otw==}

  '@types/d3-color@3.1.3':
    resolution: {integrity: sha512-iO90scth9WAbmgv7ogoq57O9YpKmFBbmoEoCHDB2xMBY0+/KVrqAaCDyCE16dUspeOvIxFFRI+0sEtqDqy2b4A==}

  '@types/d3-ease@3.0.2':
    resolution: {integrity: sha512-NcV1JjO5oDzoK26oMzbILE6HW7uVXOHLQvHshBUW4UMdZGfiY6v5BeQwh9a9tCzv+CeefZQHJt5SRgK154RtiA==}

  '@types/d3-interpolate@3.0.4':
    resolution: {integrity: sha512-mgLPETlrpVV1YRJIglr4Ez47g7Yxjl1lj7YKsiMCb27VJH9W8NVM6Bb9d8kkpG/uAQS5AmbA48q2IAolKKo1MA==}

  '@types/d3-path@3.1.1':
    resolution: {integrity: sha512-VMZBYyQvbGmWyWVea0EHs/BwLgxc+MKi1zLDCONksozI4YJMcTt8ZEuIR4Sb1MMTE8MMW49v0IwI5+b7RmfWlg==}

  '@types/d3-scale@4.0.9':
    resolution: {integrity: sha512-dLmtwB8zkAeO/juAMfnV+sItKjlsw2lKdZVVy6LRr0cBmegxSABiLEpGVmSJJ8O08i4+sGR6qQtb6WtuwJdvVw==}

  '@types/d3-shape@3.1.8':
    resolution: {integrity: sha512-lae0iWfcDeR7qt7rA88BNiqdvPS5pFVPpo5OfjElwNaT2yyekbM0C9vK+yqBqEmHr6lDkRnYNoTBYlAgJa7a4w==}

  '@types/d3-time@3.0.4':
    resolution: {integrity: sha512-yuzZug1nkAAaBlBBikKZTgzCeA+k1uy4ZFwWANOfKw5z5LRhV0gNA7gNkKm7HoK+HRN0wX3EkxGk0fpbWhmB7g==}

  '@types/d3-timer@3.0.2':
    resolution: {integrity: sha512-Ps3T8E8dZDam6fUyNiMkekK3XUsaUEik+idO9/YjPtfj2qruF8tFBXS7XhtE4iIXBLxhmLjP3SXpLhVf21I9Lw==}

  '@types/estree@1.0.8':
    resolution: {integrity: sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==}

  '@types/express-serve-static-core@5.1.1':
    resolution: {integrity: sha512-v4zIMr/cX7/d2BpAEX3KNKL/JrT1s43s96lLvvdTmza1oEvDudCqK9aF/djc/SWgy8Yh0h30TZx5VpzqFCxk5A==}

  '@types/express@5.0.6':
    resolution: {integrity: sha512-sKYVuV7Sv9fbPIt/442koC7+IIwK5olP1KWeD88e/idgoJqDm3JV/YUiPwkoKK92ylff2MGxSz1CSjsXelx0YA==}

  '@types/graceful-fs@4.1.9':
    resolution: {integrity: sha512-olP3sd1qOEe5dXTSaFvQG+02VdRXcdytWLAZsAq1PecU8uqQAhkrnbli7DagjtXKW/Bl7YJbUsa8MPcuc8LHEQ==}

  '@types/hammerjs@2.0.46':
    resolution: {integrity: sha512-ynRvcq6wvqexJ9brDMS4BnBLzmr0e14d6ZJTEShTBWKymQiHwlAyGu0ZPEFI2Fh1U53F7tN9ufClWM5KvqkKOw==}

  '@types/hast@3.0.4':
    resolution: {integrity: sha512-WPs+bbQw5aCj+x6laNGWLH3wviHtoCv/P3+otBhbOhJgG8qtpdAMlTCxLtsTWA7LH1Oh/bFCHsBn0TPS5m30EQ==}

  '@types/http-cache-semantics@4.2.0':
    resolution: {integrity: sha512-L3LgimLHXtGkWikKnsPg0/VFx9OGZaC+eN1u4r+OB1XRqH3meBIAVC2zr1WdMH+RHmnRkqliQAOHNJ/E0j/e0Q==}

  '@types/http-errors@2.0.5':
    resolution: {integrity: sha512-r8Tayk8HJnX0FztbZN7oVqGccWgw98T/0neJphO91KkmOzug1KkofZURD4UaD5uH8AqcFLfdPErnBod0u71/qg==}

  '@types/istanbul-lib-coverage@2.0.6':
    resolution: {integrity: sha512-2QF/t/auWm0lsy8XtKVPG19v3sSOQlJe/YHZgfjb/KBBHOGSV+J2q/S671rcq9uTBrLAXmZpqJiaQbMT+zNU1w==}

  '@types/istanbul-lib-report@3.0.3':
    resolution: {integrity: sha512-NQn7AHQnk/RSLOxrBbGyJM/aVQ+pjj5HCgasFxc0K/KhoATfQ/47AyUl15I2yBUpihjmas+a+VJBOqecrFH+uA==}

  '@types/istanbul-reports@3.0.4':
    resolution: {integrity: sha512-pk2B1NWalF9toCRu6gjBzR69syFjP4Od8WRAX+0mmf9lAjCRicLOWc+ZrxZHx/0XRjotgkF9t6iaMJ+aXcOdZQ==}

  '@types/keyv@3.1.4':
    resolution: {integrity: sha512-BQ5aZNSCpj7D6K2ksrRCTmKRLEpnPvWDiLPfoGyhZ++8YtiK9d/3DBKPJgry359X/P1PfruyYwvnvwFjuEiEIg==}

  '@types/node@25.6.2':
    resolution: {integrity: sha512-sokuT28dxf9JT5Kady1fsXOvI4HVpjZa95NKT5y9PNTIrs2AsobR4GFAA90ZG8M+nxVRLysCXsVj6eGC7Vbrlw==}

  '@types/pg@8.20.0':
    resolution: {integrity: sha512-bEPFOaMAHTEP1EzpvHTbmwR8UsFyHSKsRisLIHVMXnpNefSbGA1bD6CVy+qKjGSqmZqNqBDV2azOBo8TgkcVow==}

  '@types/qs@6.15.1':
    resolution: {integrity: sha512-GZHUBZR9hckSUhrxmp1nG6NwdpM9fCunJwyThLW1X3AyHgd9IlHb6VANpQQqDr2o/qQp6McZ3y/IA2rVzKzSbw==}

  '@types/range-parser@1.2.7':
    resolution: {integrity: sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==}

  '@types/react-dom@19.1.11':
    resolution: {integrity: sha512-3BKc/yGdNTYQVVw4idqHtSOcFsgGuBbMveKCOgF8wQ5QtrYOc3jDIlzg3jef04zcXFIHLelyGlj0T+BJ8+KN+w==}
    peerDependencies:
      '@types/react': ^19.0.0

  '@types/react-dom@19.2.3':
    resolution: {integrity: sha512-jp2L/eY6fn+KgVVQAOqYItbF0VY/YApe5Mz2F0aykSO8gx31bYCZyvSeYxCHKvzHG5eZjc+zyaS5BrBWya2+kQ==}
    peerDependencies:
      '@types/react': ^19.2.0

  '@types/react@19.1.17':
    resolution: {integrity: sha512-Qec1E3mhALmaspIrhWt9jkQMNdw6bReVu64mjvhbhq2NFPftLPVr+l1SZgmw/66WwBNpDh7ao5AT6gF5v41PFA==}

  '@types/react@19.2.14':
    resolution: {integrity: sha512-ilcTH/UniCkMdtexkoCN0bI7pMcJDvmQFPvuPvmEaYA/NSfFTAgdUSLAoVjaRJm7+6PvcM+q1zYOwS4wTYMF9w==}

  '@types/responselike@1.0.3':
    resolution: {integrity: sha512-H/+L+UkTV33uf49PH5pCAUBVPNj2nDBXTN+qS1dOwyyg24l3CcicicCA7ca+HMvJBZcFgl5r8e+RR6elsb4Lyw==}

  '@types/send@1.2.1':
    resolution: {integrity: sha512-arsCikDvlU99zl1g69TcAB3mzZPpxgw0UQnaHeC1Nwb015xp8bknZv5rIfri9xTOcMuaVgvabfIRA7PSZVuZIQ==}

  '@types/serve-static@2.2.0':
    resolution: {integrity: sha512-8mam4H1NHLtu7nmtalF7eyBH14QyOASmcxHhSfEoRyr0nP/YdoesEtU+uSRvMe96TW/HPTtkoKqQLl53N7UXMQ==}

  '@types/stack-utils@2.0.3':
    resolution: {integrity: sha512-9aEbYZ3TbYMznPdcdr3SmIrLXwC/AKZXQeCf9Pgao5CKb8CyHuEX5jzWPTkvregvhRJHcpRO6BFoGW9ycaOkYw==}

  '@types/unist@3.0.3':
    resolution: {integrity: sha512-ko/gIFJRv177XgZsZcBwnqJN5x/Gien8qNOn0D5bQU/zAzVf9Zt3BlcUiLqhV9y4ARk0GbT3tnUiPNgnTXzc/Q==}

  '@types/yargs-parser@21.0.3':
    resolution: {integrity: sha512-I4q9QU9MQv4oEOz4tAHJtNz1cwuLxn2F3xcc2iV5WdqLPpUnj30aUuxt1mAxYTG+oe8CZMV/+6rU4S4gRDzqtQ==}

  '@types/yargs@17.0.35':
    resolution: {integrity: sha512-qUHkeCyQFxMXg79wQfTtfndEC+N9ZZg76HJftDJp+qH2tV7Gj4OJi7l+PiWwJ+pWtW8GwSmqsDj/oymhrTWXjg==}

  '@ungap/structured-clone@1.3.1':
    resolution: {integrity: sha512-mUFwbeTqrVgDQxFveS+df2yfap6iuP20NAKAsBt5jDEoOTDew+zwLAOilHCeQJOVSvmgCX4ogqIrA0mnyr08yQ==}

  '@urql/core@5.2.0':
    resolution: {integrity: sha512-/n0ieD0mvvDnVAXEQgX/7qJiVcvYvNkOHeBvkwtylfjydar123caCXcl58PXFY11oU1oquJocVXHxLAbtv4x1A==}

  '@urql/exchange-retry@1.3.2':
    resolution: {integrity: sha512-TQMCz2pFJMfpNxmSfX1VSfTjwUIFx/mL+p1bnfM1xjjdla7Z+KnGMW/EhFbpckp3LyWAH4PgOsMwOMnIN+MBFg==}

  '@vitejs/plugin-react@5.2.0':
    resolution: {integrity: sha512-YmKkfhOAi3wsB1PhJq5Scj3GXMn3WvtQ/JC0xoopuHoXSdmtdStOpFrYaT1kie2YgFBcIe64ROzMYRjCrYOdYw==}
    engines: {node: ^20.19.0 || >=22.12.0}
    peerDependencies:
      vite: ^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0

  '@xmldom/xmldom@0.8.13':
    resolution: {integrity: sha512-KRYzxepc14G/CEpEGc3Yn+JKaAeT63smlDr+vjB8jRfgTBBI9wRj/nkQEO+ucV8p8I9bfKLWp37uHgFrbntPvw==}
    engines: {node: '>=10.0.0'}

  '@xmldom/xmldom@0.9.10':
    resolution: {integrity: sha512-A9gOqLdi6cV4ibazAjcQufGj0B1y/vDqYrcuP6d/6x8P27gRS8643Dj9o1dEKtB6O7fwxb2FgBmJS2mX7gpvdw==}
    engines: {node: '>=14.6'}

  abort-controller@3.0.0:
    resolution: {integrity: sha512-h8lQ8tacZYnR3vNQTgibj+tODHI5/+l06Au2Pcriv/Gmet0eaj4TwWH41sO9wnHDiQsEj19q0drzdWdeAHtweg==}
    engines: {node: '>=6.5'}

  accepts@1.3.8:
    resolution: {integrity: sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==}
    engines: {node: '>= 0.6'}

  accepts@2.0.0:
    resolution: {integrity: sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==}
    engines: {node: '>= 0.6'}

  acorn@8.16.0:
    resolution: {integrity: sha512-UVJyE9MttOsBQIDKw1skb9nAwQuR5wuGD3+82K6JgJlm/Y+KI92oNsMNGZCYdDsVtRHSak0pcV5Dno5+4jh9sw==}
    engines: {node: '>=0.4.0'}
    hasBin: true

  agent-base@7.1.4:
    resolution: {integrity: sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==}
    engines: {node: '>= 14'}

  ajv-draft-04@1.0.0:
    resolution: {integrity: sha512-mv00Te6nmYbRp5DCwclxtt7yV/joXJPGS7nM+97GdxvuttCOfgI3K4U25zboyeX0O+myI8ERluxQe5wljMmVIw==}
    peerDependencies:
      ajv: ^8.5.0
    peerDependenciesMeta:
      ajv:
        optional: true

  ajv-formats@3.0.1:
    resolution: {integrity: sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==}

  ajv@8.20.0:
    resolution: {integrity: sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==}

  anser@1.4.10:
    resolution: {integrity: sha512-hCv9AqTQ8ycjpSd3upOJd7vFwW1JaoYQ7tpham03GJ1ca8/65rqn0RpaWpItOAd6ylW9wAw6luXYPJIyPFVOww==}

  ansi-colors@4.1.3:
    resolution: {integrity: sha512-/6w/C21Pm1A7aZitlI5Ni/2J6FFQN8i1Cvz3kHABAAbw93v/NlvKdVOqz7CCWz/3iv/JplRSEEZ83XION15ovw==}
    engines: {node: '>=6'}

  ansi-escapes@4.3.2:
    resolution: {integrity: sha512-gKXj5ALrKWQLsYG9jlTRmR/xKluxHV+Z9QEwNIgCfM1/uwPMCuzVVnh5mwTd+OuBZcwSIMbqssNWRm1lE51QaQ==}
    engines: {node: '>=8'}

  ansi-regex@4.1.1:
    resolution: {integrity: sha512-ILlv4k/3f6vfQ4OoP2AGvirOktlQ98ZEL1k9FaQjxa3L1abBgbuTDAdPOpvbGncC0BTVQrl+OM8xZGK6tWXt7g==}
    engines: {node: '>=6'}

  ansi-regex@5.0.1:
    resolution: {integrity: sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==}
    engines: {node: '>=8'}

  ansi-styles@3.2.1:
    resolution: {integrity: sha512-VT0ZI6kZRdTh8YyJw3SMbYm/u+NqfsAxEpWO0Pf9sq8/e94WxxOpPKx9FR1FlyCtOVDNOQ+8ntlqFxiRc+r5qA==}
    engines: {node: '>=4'}

  ansi-styles@4.3.0:
    resolution: {integrity: sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==}
    engines: {node: '>=8'}

  ansi-styles@5.2.0:
    resolution: {integrity: sha512-Cxwpt2SfTzTtXcfOlzGEee8O+c+MmUgGrNiBcXnuWxuFJHe6a5Hz7qwhwe5OgaSYI0IJvkLqWX1ASG+cJOkEiA==}
    engines: {node: '>=10'}

  any-promise@1.3.0:
    resolution: {integrity: sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==}

  anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}

  arg@5.0.2:
    resolution: {integrity: sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==}

  argparse@1.0.10:
    resolution: {integrity: sha512-o5Roy6tNG4SL/FOkCAN6RzjiakZS25RLYFrcMttJqbdd8BWrnA+fGz57iN5Pb06pvBGvl5gQ0B48dJlslXvoTg==}

  argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}

  aria-hidden@1.2.6:
    resolution: {integrity: sha512-ik3ZgC9dY/lYVVM++OISsaYDeg1tb0VtP5uL3ouh1koGOaUMDPpbFIei4JkFimWUFPn90sbMNMXQAIVOlnYKJA==}
    engines: {node: '>=10'}

  asap@2.0.6:
    resolution: {integrity: sha512-BSHWgDSAiKs50o2Re8ppvp3seVHXSRM44cdSsT9FfNEUUZLOGWVCsiWaRPWM1Znn+mqZ1OfVZ3z3DWEzSp7hRA==}

  async-limiter@1.0.1:
    resolution: {integrity: sha512-csOlWGAcRFJaI6m+F2WKdnMKr4HhdhFVBk0H/QbJFMCr+uO2kwohwXQPxw/9OCxp05r5ghVBFSyioixx3gfkNQ==}

  atomic-sleep@1.0.0:
    resolution: {integrity: sha512-kNOjDqAh7px0XWNI+4QbzoiR/nTkHAWNud2uvnJquD1/x5a7EQZMJT0AczqK0Qn67oY/TTQ1LbUKajZpp3I9tQ==}
    engines: {node: '>=8.0.0'}

  babel-jest@29.7.0:
    resolution: {integrity: sha512-BrvGY3xZSwEcCzKvKsCi2GgHqDqsYkOP4/by5xCgIwGXQxIEh+8ew3gmrE1y7XRR6LHZIj6yLYnUi/mm2KXKBg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      '@babel/core': ^7.8.0

  babel-plugin-istanbul@6.1.1:
    resolution: {integrity: sha512-Y1IQok9821cC9onCx5otgFfRm7Lm+I+wwxOx738M/WLPZ9Q42m4IG5W0FNX8WLL2gYMZo3JkuXIH2DOpWM+qwA==}
    engines: {node: '>=8'}

  babel-plugin-jest-hoist@29.6.3:
    resolution: {integrity: sha512-ESAc/RJvGTFEzRwOTT4+lNDk/GNHMkKbNzsvT0qKRfDyyYTskxB5rnU2njIDYVxXCBHHEI1c0YwHob3WaYujOg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  babel-plugin-polyfill-corejs2@0.4.17:
    resolution: {integrity: sha512-aTyf30K/rqAsNwN76zYrdtx8obu0E4KoUME29B1xj+B3WxgvWkp943vYQ+z8Mv3lw9xHXMHpvSPOBxzAkIa94w==}
    peerDependencies:
      '@babel/core': ^7.4.0 || ^8.0.0-0 <8.0.0

  babel-plugin-polyfill-corejs3@0.13.0:
    resolution: {integrity: sha512-U+GNwMdSFgzVmfhNm8GJUX88AadB3uo9KpJqS3FaqNIPKgySuvMb+bHPsOmmuWyIcuqZj/pzt1RUIUZns4y2+A==}
    peerDependencies:
      '@babel/core': ^7.4.0 || ^8.0.0-0 <8.0.0

  babel-plugin-polyfill-regenerator@0.6.8:
    resolution: {integrity: sha512-M762rNHfSF1EV3SLtnCJXFoQbbIIz0OyRwnCmV0KPC7qosSfCO0QLTSuJX3ayAebubhE6oYBAYPrBA5ljowaZg==}
    peerDependencies:
      '@babel/core': ^7.4.0 || ^8.0.0-0 <8.0.0

  babel-plugin-react-compiler@1.0.0:
    resolution: {integrity: sha512-Ixm8tFfoKKIPYdCCKYTsqv+Fd4IJ0DQqMyEimo+pxUOMUR9cVPlwTrFt9Avu+3cb6Zp3mAzl+t1MrG2fxxKsxw==}

  babel-plugin-react-compiler@19.0.0-beta-ebf51a3-20250411:
    resolution: {integrity: sha512-q84bNR9JG1crykAlJUt5Ud0/5BUyMFuQww/mrwIQDFBaxsikqBDj3f/FNDsVd2iR26A1HvXKWPEIfgJDv8/V2g==}

  babel-plugin-react-native-web@0.21.2:
    resolution: {integrity: sha512-SPD0J6qjJn8231i0HZhlAGH6NORe+QvRSQM2mwQEzJ2Fb3E4ruWTiiicPlHjmeWShDXLcvoorOCXjeR7k/lyWA==}

  babel-plugin-syntax-hermes-parser@0.29.1:
    resolution: {integrity: sha512-2WFYnoWGdmih1I1J5eIqxATOeycOqRwYxAQBu3cUu/rhwInwHUg7k60AFNbuGjSDL8tje5GDrAnxzRLcu2pYcA==}

  babel-plugin-transform-flow-enums@0.0.2:
    resolution: {integrity: sha512-g4aaCrDDOsWjbm0PUUeVnkcVd6AKJsVc/MbnPhEotEpkeJQP6b8nzewohQi7+QS8UyPehOhGWn0nOwjvWpmMvQ==}

  babel-preset-current-node-syntax@1.2.0:
    resolution: {integrity: sha512-E/VlAEzRrsLEb2+dv8yp3bo4scof3l9nR4lrld+Iy5NyVqgVYUJnDAmunkhPMisRI32Qc4iRiz425d8vM++2fg==}
    peerDependencies:
      '@babel/core': ^7.0.0 || ^8.0.0-0

  babel-preset-expo@54.0.10:
    resolution: {integrity: sha512-wTt7POavLFypLcPW/uC5v8y+mtQKDJiyGLzYCjqr9tx0Qc3vCXcDKk1iCFIj/++Iy5CWhhTflEa7VvVPNWeCfw==}
    peerDependencies:
      '@babel/runtime': ^7.20.0
      expo: '*'
      react-refresh: '>=0.14.0 <1.0.0'
    peerDependenciesMeta:
      '@babel/runtime':
        optional: true
      expo:
        optional: true

  babel-preset-jest@29.6.3:
    resolution: {integrity: sha512-0B3bhxR6snWXJZtR/RliHTDPRgn1sNHOR0yVtq/IiQFyuOVjFS+wuio/R4gSNkyYmKmJB4wGZv2NZanmKmTnNA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      '@babel/core': ^7.0.0

  balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}

  balanced-match@4.0.4:
    resolution: {integrity: sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==}
    engines: {node: 18 || 20 || >=22}

  base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}

  baseline-browser-mapping@2.10.28:
    resolution: {integrity: sha512-Ic44hnOtFIgravCunj1ifSoQPSUrkNiJuH9Mf6jr2jjoA74icqV8wU0KuadXeOR8zuIJMOoTv0GuQjZ9ZYNMeA==}
    engines: {node: '>=6.0.0'}
    hasBin: true

  better-opn@3.0.2:
    resolution: {integrity: sha512-aVNobHnJqLiUelTaHat9DZ1qM2w0C0Eym4LPI/3JxOnSokGVdsl1T1kN7TFvsEAD8G47A6VKQ0TVHqbBnYMJlQ==}
    engines: {node: '>=12.0.0'}

  big-integer@1.6.52:
    resolution: {integrity: sha512-QxD8cf2eVqJOOz63z6JIN9BzvVs/dlySa5HGSBH5xtR8dPteIRQnBxxKqkNTiT6jbDTF6jAfrd4oMcND9RGbQg==}
    engines: {node: '>=0.6'}

  body-parser@2.2.2:
    resolution: {integrity: sha512-oP5VkATKlNwcgvxi0vM0p/D3n2C3EReYVX+DNYs5TjZFn/oQt2j+4sVJtSMr18pdRr8wjTcBl6LoV+FUwzPmNA==}
    engines: {node: '>=18'}

  boolbase@1.0.0:
    resolution: {integrity: sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww==}

  bplist-creator@0.1.0:
    resolution: {integrity: sha512-sXaHZicyEEmY86WyueLTQesbeoH/mquvarJaQNbjuOQO+7gbFcDEWqKmcWA4cOTLzFlfgvkiVxolk1k5bBIpmg==}

  bplist-parser@0.3.1:
    resolution: {integrity: sha512-PyJxiNtA5T2PlLIeBot4lbp7rj4OadzjnMZD/G5zuBNt8ei/yCU7+wW0h2bag9vr8c+/WuRWmSxbqAl9hL1rBA==}
    engines: {node: '>= 5.10.0'}

  bplist-parser@0.3.2:
    resolution: {integrity: sha512-apC2+fspHGI3mMKj+dGevkGo/tCqVB8jMb6i+OX+E29p0Iposz07fABkRIfVUPNd5A5VbuOz1bZbnmkKLYF+wQ==}
    engines: {node: '>= 5.10.0'}

  brace-expansion@1.1.14:
    resolution: {integrity: sha512-MWPGfDxnyzKU7rNOW9SP/c50vi3xrmrua/+6hfPbCS2ABNWfx24vPidzvC7krjU/RTo235sV776ymlsMtGKj8g==}

  brace-expansion@2.1.0:
    resolution: {integrity: sha512-TN1kCZAgdgweJhWWpgKYrQaMNHcDULHkWwQIspdtjV4Y5aurRdZpjAqn6yX3FPqTA9ngHCc4hJxMAMgGfve85w==}

  brace-expansion@5.0.6:
    resolution: {integrity: sha512-kLpxurY4Z4r9sgMsyG0Z9uzsBlgiU/EFKhj/h91/8yHu0edo7XuixOIH3VcJ8kkxs6/jPzoI6U9Vj3WqbMQ94g==}
    engines: {node: 18 || 20 || >=22}

  braces@3.0.3:
    resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
    engines: {node: '>=8'}

  browserslist@4.28.2:
    resolution: {integrity: sha512-48xSriZYYg+8qXna9kwqjIVzuQxi+KYWp2+5nCYnYKPTr0LvD89Jqk2Or5ogxz0NUMfIjhh2lIUX/LyX9B4oIg==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true

  bser@2.1.1:
    resolution: {integrity: sha512-gQxTNE/GAfIIrmHLUE3oJyp5FO6HRBfhjnw4/wMmA63ZGDJnWBmgY/lyQBpnDUkGmAhbSe39tx2d/iTOAfglwQ==}

  buffer-from@1.1.2:
    resolution: {integrity: sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==}

  buffer@5.7.1:
    resolution: {integrity: sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==}

  bytes@3.1.2:
    resolution: {integrity: sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==}
    engines: {node: '>= 0.8'}

  cacheable-lookup@5.0.4:
    resolution: {integrity: sha512-2/kNscPhpcxrOigMZzbiWF7dz8ilhb/nIHU3EyZiXWXpeq/au8qJ8VhdftMkty3n7Gj6HIGalQG8oiBNB3AJgA==}
    engines: {node: '>=10.6.0'}

  cacheable-request@7.0.4:
    resolution: {integrity: sha512-v+p6ongsrp0yTGbJXjgxPow2+DL93DASP4kXCDKb8/bwRtt9OEF3whggkkDkGNzgcWy2XaF4a8nZglC7uElscg==}
    engines: {node: '>=8'}

  call-bind-apply-helpers@1.0.2:
    resolution: {integrity: sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==}
    engines: {node: '>= 0.4'}

  call-bound@1.0.4:
    resolution: {integrity: sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==}
    engines: {node: '>= 0.4'}

  camelcase@5.3.1:
    resolution: {integrity: sha512-L28STB170nwWS63UjtlEOE3dldQApaJXZkOI1uMFfzf3rRuPegHaHesyee+YxQ+W6SvRDQV6UrdOdRiR153wJg==}
    engines: {node: '>=6'}

  camelcase@6.3.0:
    resolution: {integrity: sha512-Gmy6FhYlCY7uOElZUSbxo2UCDH8owEk996gkbrpsgGtrJLM3J7jGxl9Ic7Qwwj4ivOE5AWZWRMecDdF7hqGjFA==}
    engines: {node: '>=10'}

  caniuse-lite@1.0.30001792:
    resolution: {integrity: sha512-hVLMUZFgR4JJ6ACt1uEESvQN1/dBVqPAKY0hgrV70eN3391K6juAfTjKZLKvOMsx8PxA7gsY1/tLMMTcfFLLpw==}

  chalk@2.4.2:
    resolution: {integrity: sha512-Mti+f9lpJNcwF4tWV8/OrTTtF1gZi+f8FqlyAdouralcFWFQWF2+NgCHShjkCb+IFBLq9buZwE1xckQU4peSuQ==}
    engines: {node: '>=4'}

  chalk@4.1.2:
    resolution: {integrity: sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==}
    engines: {node: '>=10'}

  chokidar@4.0.3:
    resolution: {integrity: sha512-Qgzu8kfBvo+cA4962jnP1KkS6Dop5NS6g7R5LFYJr4b8Ub94PPQXUksCw9PvXoeXPRRddRNC5C1JQUR2SMGtnA==}
    engines: {node: '>= 14.16.0'}

  chokidar@5.0.0:
    resolution: {integrity: sha512-TQMmc3w+5AxjpL8iIiwebF73dRDF4fBIieAqGn9RGCWaEVwQ6Fb2cGe31Yns0RRIzii5goJ1Y7xbMwo1TxMplw==}
    engines: {node: '>= 20.19.0'}

  chownr@3.0.0:
    resolution: {integrity: sha512-+IxzY9BZOQd/XuYPRmrvEVjF/nqj5kgT4kEq7VofrDoM1MxoRjEWkrCC3EtLi59TVawxTAn+orJwFQcrqEN1+g==}
    engines: {node: '>=18'}

  chrome-launcher@0.15.2:
    resolution: {integrity: sha512-zdLEwNo3aUVzIhKhTtXfxhdvZhUghrnmkvcAq2NoDd+LeOHKf03H5jwZ8T/STsAlzyALkBVK552iaG1fGf1xVQ==}
    engines: {node: '>=12.13.0'}
    hasBin: true

  chromium-edge-launcher@0.2.0:
    resolution: {integrity: sha512-JfJjUnq25y9yg4FABRRVPmBGWPZZi+AQXT4mxupb67766/0UlhG8PAZCz6xzEMXTbW3CsSoE8PcCWA49n35mKg==}

  ci-info@2.0.0:
    resolution: {integrity: sha512-5tK7EtrZ0N+OLFMthtqOj4fI2Jeb88C4CAZPu25LDVUgXJ0A3Js4PMGqrn0JU1W0Mh1/Z8wZzYPxqUrXeBboCQ==}

  ci-info@3.9.0:
    resolution: {integrity: sha512-NIxF55hv4nSqQswkAeiOi1r83xy8JldOFDTWiug55KBu9Jnblncd2U6ViHmYgHf01TPZS77NJBhBMKdWj9HQMQ==}
    engines: {node: '>=8'}

  class-variance-authority@0.7.1:
    resolution: {integrity: sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==}

  cli-cursor@2.1.0:
    resolution: {integrity: sha512-8lgKz8LmCRYZZQDpRyT2m5rKJ08TnU4tR9FFFW2rxpxR1FzWi4PQ/NfyODchAatHaUgnSPVcx/R5w6NuTBzFiw==}
    engines: {node: '>=4'}

  cli-spinners@2.9.2:
    resolution: {integrity: sha512-ywqV+5MmyL4E7ybXgKys4DugZbX0FC6LnwrhjuykIjnK9k8OQacQ7axGKnjDXWNhns0xot3bZI5h55H8yo9cJg==}
    engines: {node: '>=6'}

  client-only@0.0.1:
    resolution: {integrity: sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==}

  cliui@8.0.1:
    resolution: {integrity: sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==}
    engines: {node: '>=12'}

  clone-response@1.0.3:
    resolution: {integrity: sha512-ROoL94jJH2dUVML2Y/5PEDNaSHgeOdSDicUyS7izcF63G6sTc/FTjLub4b8Il9S8S0beOfYt0TaA5qvFK+w0wA==}

  clone@1.0.4:
    resolution: {integrity: sha512-JQHZ2QMW6l3aH/j6xCqQThY/9OH4D/9ls34cgkUBiEeocRTU04tHfKPBsUK1PqZCUQM7GiA0IIXJSuXHI64Kbg==}
    engines: {node: '>=0.8'}

  clsx@2.1.1:
    resolution: {integrity: sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==}
    engines: {node: '>=6'}

  cmdk@1.1.1:
    resolution: {integrity: sha512-Vsv7kFaXm+ptHDMZ7izaRsP70GgrW9NBNGswt9OZaVBLlE0SNpDq8eu/VGXyF9r7M0azK3Wy7OlYXsuyYLFzHg==}
    peerDependencies:
      react: ^18 || ^19 || ^19.0.0-rc
      react-dom: ^18 || ^19 || ^19.0.0-rc

  color-convert@1.9.3:
    resolution: {integrity: sha512-QfAUtd+vFdAtFQcC8CCyYt1fYWxSqAiK2cSD6zDB8N3cpsEBAvRxp9zOGg6G/SHHJYAT88/az/IuDGALsNVbGg==}

  color-convert@2.0.1:
    resolution: {integrity: sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==}
    engines: {node: '>=7.0.0'}

  color-name@1.1.3:
    resolution: {integrity: sha512-72fSenhMw2HZMTVHeCA9KCmpEIbzWiQsjN+BHcBbS9vr1mtt+vJjPdksIBNUmKAW8TFUDPJK5SUU3QhE9NEXDw==}

  color-name@1.1.4:
    resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}

  color-string@1.9.1:
    resolution: {integrity: sha512-shrVawQFojnZv6xM40anx4CkoDP+fZsw/ZerEMsW/pyzsRbElpsL/DBVW7q3ExxwusdNXI3lXpuhEZkzs8p5Eg==}

  color@4.2.3:
    resolution: {integrity: sha512-1rXeuUUiGGrykh+CeBdu5Ie7OJwinCgQY0bc7GCRxy5xVHy+moaqkpL/jqQq0MtQOeYcrqEz4abc5f0KtU7W4A==}
    engines: {node: '>=12.5.0'}

  colorette@2.0.20:
    resolution: {integrity: sha512-IfEDxwoWIjkeXL1eXcDiow4UbKjhLdq6/EuSVR9GMN7KVH3r9gQ83e73hsz1Nd1T3ijd5xv1wcWRYO+D6kCI2w==}

  commander@12.1.0:
    resolution: {integrity: sha512-Vw8qHK3bZM9y/P10u3Vib8o/DdkvA2OtPtZvD871QKjy74Wj1WSKFILMPRPSdUSx5RFK1arlJzEtA4PkFgnbuA==}
    engines: {node: '>=18'}

  commander@14.0.3:
    resolution: {integrity: sha512-H+y0Jo/T1RZ9qPP4Eh1pkcQcLRglraJaSLoyOtHxu6AapkjWVCy2Sit1QQ4x3Dng8qDlSsZEet7g5Pq06MvTgw==}
    engines: {node: '>=20'}

  commander@2.20.3:
    resolution: {integrity: sha512-GpVkmM8vF2vQUkj2LvZmD35JxeJOLCwJ9cUkugyk2nuhbv3+mJvpLYYt+0+USMxE+oj+ey/lJEnhZw75x/OMcQ==}

  commander@4.1.1:
    resolution: {integrity: sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==}
    engines: {node: '>= 6'}

  commander@7.2.0:
    resolution: {integrity: sha512-QrWXB+ZQSVPmIWIhtEO9H+gwHaMGYiF5ChvoJ+K9ZGHG/sVsa6yiesAD1GC/x46sET00Xlwo1u49RVVVzvcSkw==}
    engines: {node: '>= 10'}

  compare-versions@6.1.1:
    resolution: {integrity: sha512-4hm4VPpIecmlg59CHXnRDnqGplJFrbLG4aFEl5vl6cK1u76ws3LLvX7ikFnTDl5vo39sjWD6AaDPYodJp/NNHg==}

  compressible@2.0.18:
    resolution: {integrity: sha512-AF3r7P5dWxL8MxyITRMlORQNaOA2IkAFaTr4k7BUumjPtRpGDTZpl0Pb1XCO6JeDCBdp126Cgs9sMxqSjgYyRg==}
    engines: {node: '>= 0.6'}

  compression@1.8.1:
    resolution: {integrity: sha512-9mAqGPHLakhCLeNyxPkK4xVo746zQ/czLH1Ky+vkitMnWfWZps8r0qXuwhwizagCRttsL4lfG4pIOvaWLpAP0w==}
    engines: {node: '>= 0.8.0'}

  concat-map@0.0.1:
    resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}

  connect@3.7.0:
    resolution: {integrity: sha512-ZqRXc+tZukToSNmh5C2iWMSoV3X1YUcPbqEM4DkEG5tNQXrQUZCNVGGv3IuicnkMtPfGf3Xtp8WCXs295iQ1pQ==}
    engines: {node: '>= 0.10.0'}

  content-disposition@1.1.0:
    resolution: {integrity: sha512-5jRCH9Z/+DRP7rkvY83B+yGIGX96OYdJmzngqnw2SBSxqCFPd0w2km3s5iawpGX8krnwSGmF0FW5Nhr0Hfai3g==}
    engines: {node: '>=18'}

  content-type@1.0.5:
    resolution: {integrity: sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==}
    engines: {node: '>= 0.6'}

  convert-source-map@2.0.0:
    resolution: {integrity: sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==}

  cookie-parser@1.4.7:
    resolution: {integrity: sha512-nGUvgXnotP3BsjiLX2ypbQnWoGUPIIfHQNZkkC668ntrzGWEZVW70HDEB1qnNGMicPje6EttlIgzo51YSwNQGw==}
    engines: {node: '>= 0.8.0'}

  cookie-signature@1.0.6:
    resolution: {integrity: sha512-QADzlaHc8icV8I7vbaJXJwod9HWYp8uCqf1xa4OfNu1T7JVxQIrUgOWtHdNDtPiywmFbiS12VjotIXLrKM3orQ==}

  cookie-signature@1.2.2:
    resolution: {integrity: sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==}
    engines: {node: '>=6.6.0'}

  cookie@0.7.2:
    resolution: {integrity: sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==}
    engines: {node: '>= 0.6'}

  core-js-compat@3.49.0:
    resolution: {integrity: sha512-VQXt1jr9cBz03b331DFDCCP90b3fanciLkgiOoy8SBHy06gNf+vQ1A3WFLqG7I8TipYIKeYK9wxd0tUrvHcOZA==}

  cors@2.8.6:
    resolution: {integrity: sha512-tJtZBBHA6vjIAaF6EnIaq6laBBP9aq/Y3ouVJjEfoHbRBcHBAHYcMh/w8LDrk2PvIMMq8gmopa5D4V8RmbrxGw==}
    engines: {node: '>= 0.10'}

  cross-fetch@3.2.0:
    resolution: {integrity: sha512-Q+xVJLoGOeIMXZmbUK4HYk+69cQH6LudR0Vu/pRm2YlU/hDV9CiS0gKUMaWY5f2NeUH9C1nV3bsTlCo0FsTV1Q==}

  cross-spawn@7.0.6:
    resolution: {integrity: sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==}
    engines: {node: '>= 8'}

  css-in-js-utils@3.1.0:
    resolution: {integrity: sha512-fJAcud6B3rRu+KHYk+Bwf+WFL2MDCJJ1XG9x137tJQ0xYxor7XziQtuGFbWNdqrvF4Tk26O3H73nfVqXt/fW1A==}

  css-select@5.2.2:
    resolution: {integrity: sha512-TizTzUddG/xYLA3NXodFM0fSbNizXjOKhqiQQwvhlspadZokn1KDy0NZFS0wuEubIYAV5/c1/lAr0TaaFXEXzw==}

  css-tree@1.1.3:
    resolution: {integrity: sha512-tRpdppF7TRazZrjJ6v3stzv93qxRcSsFmW6cX0Zm2NVKpxE1WV1HblnghVv9TreireHkqI/VDEsfolRF1p6y7Q==}
    engines: {node: '>=8.0.0'}

  css-what@6.2.2:
    resolution: {integrity: sha512-u/O3vwbptzhMs3L1fQE82ZSLHQQfto5gyZzwteVIEyeaY5Fc7R4dapF/BvRoSYFeqfBk4m0V1Vafq5Pjv25wvA==}
    engines: {node: '>= 6'}

  csstype@3.2.3:
    resolution: {integrity: sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==}

  d3-array@3.2.4:
    resolution: {integrity: sha512-tdQAmyA18i4J7wprpYq8ClcxZy3SC31QMeByyCFyRt7BVHdREQZ5lpzoe5mFEYZUWe+oq8HBvk9JjpibyEV4Jg==}
    engines: {node: '>=12'}

  d3-color@3.1.0:
    resolution: {integrity: sha512-zg/chbXyeBtMQ1LbD/WSoW2DpC3I0mpmPdW+ynRTj/x2DAWYrIY7qeZIHidozwV24m4iavr15lNwIwLxRmOxhA==}
    engines: {node: '>=12'}

  d3-ease@3.0.1:
    resolution: {integrity: sha512-wR/XK3D3XcLIZwpbvQwQ5fK+8Ykds1ip7A2Txe0yxncXSdq1L9skcG7blcedkOX+ZcgxGAmLX1FrRGbADwzi0w==}
    engines: {node: '>=12'}

  d3-format@3.1.2:
    resolution: {integrity: sha512-AJDdYOdnyRDV5b6ArilzCPPwc1ejkHcoyFarqlPqT7zRYjhavcT3uSrqcMvsgh2CgoPbK3RCwyHaVyxYcP2Arg==}
    engines: {node: '>=12'}

  d3-interpolate@3.0.1:
    resolution: {integrity: sha512-3bYs1rOD33uo8aqJfKP3JWPAibgw8Zm2+L9vBKEHJ2Rg+viTR7o5Mmv5mZcieN+FRYaAOWX5SJATX6k1PWz72g==}
    engines: {node: '>=12'}

  d3-path@3.1.0:
    resolution: {integrity: sha512-p3KP5HCf/bvjBSSKuXid6Zqijx7wIfNW+J/maPs+iwR35at5JCbLUT0LzF1cnjbCHWhqzQTIN2Jpe8pRebIEFQ==}
    engines: {node: '>=12'}

  d3-scale@4.0.2:
    resolution: {integrity: sha512-GZW464g1SH7ag3Y7hXjf8RoUuAFIqklOAq3MRl4OaWabTFJY9PN/E1YklhXLh+OQ3fM9yS2nOkCoS+WLZ6kvxQ==}
    engines: {node: '>=12'}

  d3-shape@3.2.0:
    resolution: {integrity: sha512-SaLBuwGm3MOViRq2ABk3eLoxwZELpH6zhl3FbAoJ7Vm1gofKx6El1Ib5z23NUEhF9AsGl7y+dzLe5Cw2AArGTA==}
    engines: {node: '>=12'}

  d3-time-format@4.1.0:
    resolution: {integrity: sha512-dJxPBlzC7NugB2PDLwo9Q8JiTR3M3e4/XANkreKSUxF8vvXKqm1Yfq4Q5dl8budlunRVlUUaDUgFt7eA8D6NLg==}
    engines: {node: '>=12'}

  d3-time@3.1.0:
    resolution: {integrity: sha512-VqKjzBLejbSMT4IgbmVgDjpkYrNWUYJnbCGo874u7MMKIWsILRX+OpX/gTk8MqjpT1A/c6HY2dCA77ZN0lkQ2Q==}
    engines: {node: '>=12'}

  d3-timer@3.0.1:
    resolution: {integrity: sha512-ndfJ/JxxMd3nw31uyKoY2naivF+r29V+Lc0svZxe1JvvIRmi8hUsrMvdOwgS1o6uBHmiz91geQ0ylPP0aj1VUA==}
    engines: {node: '>=12'}

  date-fns-jalali@4.1.0-0:
    resolution: {integrity: sha512-hTIP/z+t+qKwBDcmmsnmjWTduxCg+5KfdqWQvb2X/8C9+knYY6epN/pfxdDuyVlSVeFz0sM5eEfwIUQ70U4ckg==}

  date-fns@3.6.0:
    resolution: {integrity: sha512-fRHTG8g/Gif+kSh50gaGEdToemgfj74aRX3swtiouboip5JDLAyDE9F11nHMIcvOaXeOC6D7SpNhi7uFyB7Uww==}

  date-fns@4.1.0:
    resolution: {integrity: sha512-Ukq0owbQXxa/U3EGtsdVBkR1w7KOQ5gIBqdH2hkvknzZPYvBxb/aa6E8L7tmjFtkwZBu3UXBbjIgPo/Ez4xaNg==}

  dateformat@4.6.3:
    resolution: {integrity: sha512-2P0p0pFGzHS5EMnhdxQi7aJN+iMheud0UhG4dlE1DLAlvL8JHjJJTX/CSm4JXwV0Ka5nGk3zC5mcb5bUQUxxMA==}

  debug@2.6.9:
    resolution: {integrity: sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@3.2.7:
    resolution: {integrity: sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.4.3:
    resolution: {integrity: sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  decimal.js-light@2.5.1:
    resolution: {integrity: sha512-qIMFpTMZmny+MMIitAB6D7iVPEorVw6YQRWkvarTkT4tBeSLLiHzcwj6q0MmYSFCiVpiqPJTJEYIrpcPzVEIvg==}

  decode-uri-component@0.2.2:
    resolution: {integrity: sha512-FqUYQ+8o158GyGTrMFJms9qh3CqTKvAqgqsTnkLI8sKu0028orqBhxNMFkFen0zGyg6epACD32pjVk58ngIErQ==}
    engines: {node: '>=0.10'}

  decompress-response@6.0.0:
    resolution: {integrity: sha512-aW35yZM6Bb/4oJlZncMH2LCoZtJXTRxES17vE3hoRiowU2kWHaJKFkSBDnDR+cm9J+9QhXmREyIfv0pji9ejCQ==}
    engines: {node: '>=10'}

  deep-extend@0.6.0:
    resolution: {integrity: sha512-LOHxIOaPYdHlJRtCQfDIVZtfw/ufM8+rVj649RIHzcm/vGwQRXFt6OPqIFWsm2XEMrNIEtWR64sY1LEKD2vAOA==}
    engines: {node: '>=4.0.0'}

  deepmerge@4.3.1:
    resolution: {integrity: sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==}
    engines: {node: '>=0.10.0'}

  defaults@1.0.4:
    resolution: {integrity: sha512-eFuaLoy/Rxalv2kr+lqMlUnrDWV+3j4pljOIJgLIhI058IQfWJ7vXhyEIHu+HtC738klGALYxOKDO0bQP3tg8A==}

  defer-to-connect@2.0.1:
    resolution: {integrity: sha512-4tvttepXG1VaYGrRibk5EwJd1t4udunSOVMdLSAL6mId1ix438oPwPZMALY41FCijukO1L0twNcGsdzS7dHgDg==}
    engines: {node: '>=10'}

  define-lazy-prop@2.0.0:
    resolution: {integrity: sha512-Ds09qNh8yw3khSjiJjiUInaGX9xlqZDY7JVryGxdxV7NPeuqQfplOpQ66yJFZut3jLa5zOwkXw1g9EI2uKh4Og==}
    engines: {node: '>=8'}

  depd@2.0.0:
    resolution: {integrity: sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==}
    engines: {node: '>= 0.8'}

  destroy@1.2.0:
    resolution: {integrity: sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}

  detect-libc@2.1.2:
    resolution: {integrity: sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==}
    engines: {node: '>=8'}

  detect-node-es@1.1.0:
    resolution: {integrity: sha512-ypdmJU/TbBby2Dxibuv7ZLW3Bs1QEmM7nHjEANfohJLvE0XVujisn1qPJcZxg+qDucsr+bP6fLD1rPS3AhJ7EQ==}

  dom-helpers@5.2.1:
    resolution: {integrity: sha512-nRCa7CK3VTrM2NmGkIy4cbK7IZlgBE/PYMn55rrXefr5xXDP0LdtfPnblFDoVdcAfslJ7or6iqAUnx0CCGIWQA==}

  dom-serializer@2.0.0:
    resolution: {integrity: sha512-wIkAryiqt/nV5EQKqQpo3SToSOV9J0DnbJqwK7Wv/Trc92zIAYZ4FlMu+JPFW1DfGFt81ZTCGgDEabffXeLyJg==}

  domelementtype@2.3.0:
    resolution: {integrity: sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==}

  domhandler@5.0.3:
    resolution: {integrity: sha512-cgwlv/1iFQiFnU96XXgROh8xTeetsnJiDsTc7TYCLFd9+/WNkIqPTxiM/8pSd8VIrhXGTf1Ny1q1hquVqDJB5w==}
    engines: {node: '>= 4'}

  domutils@3.2.2:
    resolution: {integrity: sha512-6kZKyUajlDuqlHKVX1w7gyslj9MPIXzIFiz/rGu35uC1wMi+kMhQwGhl4lt9unC9Vb9INnY9Z3/ZA3+FhASLaw==}

  dotenv-expand@11.0.7:
    resolution: {integrity: sha512-zIHwmZPRshsCdpMDyVsqGmgyP0yT8GAgXUnkdAoJisxvf33k7yO6OuoKmcTGuXPWSsm8Oh88nZicRLA9Y0rUeA==}
    engines: {node: '>=12'}

  dotenv@16.4.7:
    resolution: {integrity: sha512-47qPchRCykZC03FhkYAhrvwU4xDBFIj1QPqaarj6mdM/hgUzfPHcpkHJOn3mJAufFeeAxAzeGsr5X0M4k6fLZQ==}
    engines: {node: '>=12'}

  drizzle-kit@0.31.10:
    resolution: {integrity: sha512-7OZcmQUrdGI+DUNNsKBn1aW8qSoKuTH7d0mYgSP8bAzdFzKoovxEFnoGQp2dVs82EOJeYycqRtciopszwUf8bw==}
    hasBin: true

  drizzle-orm@0.45.2:
    resolution: {integrity: sha512-kY0BSaTNYWnoDMVoyY8uxmyHjpJW1geOmBMdSSicKo9CIIWkSxMIj2rkeSR51b8KAPB7m+qysjuHme5nKP+E5Q==}
    peerDependencies:
      '@aws-sdk/client-rds-data': '>=3'
      '@cloudflare/workers-types': '>=4'
      '@electric-sql/pglite': '>=0.2.0'
      '@libsql/client': '>=0.10.0'
      '@libsql/client-wasm': '>=0.10.0'
      '@neondatabase/serverless': '>=0.10.0'
      '@op-engineering/op-sqlite': '>=2'
      '@opentelemetry/api': ^1.4.1
      '@planetscale/database': '>=1.13'
      '@prisma/client': '*'
      '@tidbcloud/serverless': '*'
      '@types/better-sqlite3': '*'
      '@types/pg': '*'
      '@types/sql.js': '*'
      '@upstash/redis': '>=1.34.7'
      '@vercel/postgres': '>=0.8.0'
      '@xata.io/client': '*'
      better-sqlite3: '>=7'
      bun-types: '*'
      expo-sqlite: '>=14.0.0'
      gel: '>=2'
      knex: '*'
      kysely: '*'
      mysql2: '>=2'
      pg: '>=8'
      postgres: '>=3'
      prisma: '*'
      sql.js: '>=1'
      sqlite3: '>=5'
    peerDependenciesMeta:
      '@aws-sdk/client-rds-data':
        optional: true
      '@cloudflare/workers-types':
        optional: true
      '@electric-sql/pglite':
        optional: true
      '@libsql/client':
        optional: true
      '@libsql/client-wasm':
        optional: true
      '@neondatabase/serverless':
        optional: true
      '@op-engineering/op-sqlite':
        optional: true
      '@opentelemetry/api':
        optional: true
      '@planetscale/database':
        optional: true
      '@prisma/client':
        optional: true
      '@tidbcloud/serverless':
        optional: true
      '@types/better-sqlite3':
        optional: true
      '@types/pg':
        optional: true
      '@types/sql.js':
        optional: true
      '@upstash/redis':
        optional: true
      '@vercel/postgres':
        optional: true
      '@xata.io/client':
        optional: true
      better-sqlite3:
        optional: true
      bun-types:
        optional: true
      expo-sqlite:
        optional: true
      gel:
        optional: true
      knex:
        optional: true
      kysely:
        optional: true
      mysql2:
        optional: true
      pg:
        optional: true
      postgres:
        optional: true
      prisma:
        optional: true
      sql.js:
        optional: true
      sqlite3:
        optional: true

  drizzle-zod@0.8.3:
    resolution: {integrity: sha512-66yVOuvGhKJnTdiqj1/Xaaz9/qzOdRJADpDa68enqS6g3t0kpNkwNYjUuaeXgZfO/UWuIM9HIhSlJ6C5ZraMww==}
    peerDependencies:
      drizzle-orm: '>=0.36.0'
      zod: ^3.25.0 || ^4.0.0

  dunder-proto@1.0.1:
    resolution: {integrity: sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==}
    engines: {node: '>= 0.4'}

  ee-first@1.1.1:
    resolution: {integrity: sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==}

  electron-to-chromium@1.5.353:
    resolution: {integrity: sha512-kOrWphBi8TOZyiJZqsgqIle0lw+tzmnQK83pV9dZUd01Nm2POECSyFQMAuarzZdYqQW7FH9RaYOuaRo3h+bQ3w==}

  embla-carousel-react@8.6.0:
    resolution: {integrity: sha512-0/PjqU7geVmo6F734pmPqpyHqiM99olvyecY7zdweCw+6tKEXnrE90pBiBbMMU8s5tICemzpQ3hi5EpxzGW+JA==}
    peerDependencies:
      react: ^16.8.0 || ^17.0.1 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  embla-carousel-reactive-utils@8.6.0:
    resolution: {integrity: sha512-fMVUDUEx0/uIEDM0Mz3dHznDhfX+znCCDCeIophYb1QGVM7YThSWX+wz11zlYwWFOr74b4QLGg0hrGPJeG2s4A==}
    peerDependencies:
      embla-carousel: 8.6.0

  embla-carousel@8.6.0:
    resolution: {integrity: sha512-SjWyZBHJPbqxHOzckOfo8lHisEaJWmwd23XppYFYVh10bU66/Pn5tkVkbkCMZVdbUE5eTCI2nD8OyIP4Z+uwkA==}

  emoji-regex@8.0.0:
    resolution: {integrity: sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==}

  encodeurl@1.0.2:
    resolution: {integrity: sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==}
    engines: {node: '>= 0.8'}

  encodeurl@2.0.0:
    resolution: {integrity: sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==}
    engines: {node: '>= 0.8'}

  end-of-stream@1.4.5:
    resolution: {integrity: sha512-ooEGc6HP26xXq/N+GCGOT0JKCLDGrq2bQUZrQ7gyrJiZANJ/8YDTxTpQBXGMn+WbIQXNVpyWymm7KYVICQnyOg==}

  enhanced-resolve@5.21.2:
    resolution: {integrity: sha512-xe9vQb5kReirPUxgQrXA3ihgbCqssmTiM7cOZ+Gzu+VeGWgpV98lLZvp0dl4yriyAePcewxGUs9UpKD8PET9KQ==}
    engines: {node: '>=10.13.0'}

  enquirer@2.4.1:
    resolution: {integrity: sha512-rRqJg/6gd538VHvR3PSrdRBb/1Vy2YfzHqzvbhGIQpDRKIa4FgV/54b5Q1xYSxOOwKvjXweS26E0Q+nAMwp2pQ==}
    engines: {node: '>=8.6'}

  entities@4.5.0:
    resolution: {integrity: sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw==}
    engines: {node: '>=0.12'}

  env-editor@0.4.2:
    resolution: {integrity: sha512-ObFo8v4rQJAE59M69QzwloxPZtd33TpYEIjtKD1rrFDcM1Gd7IkDxEBU+HriziN6HSHQnBJi8Dmy+JWkav5HKA==}
    engines: {node: '>=8'}

  error-stack-parser@2.1.4:
    resolution: {integrity: sha512-Sk5V6wVazPhq5MhpO+AUxJn5x7XSXGl1R93Vn7i+zS15KDVxQijejNCrz8340/2bgLBjR9GtEG8ZVKONDjcqGQ==}

  es-define-property@1.0.1:
    resolution: {integrity: sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==}
    engines: {node: '>= 0.4'}

  es-errors@1.3.0:
    resolution: {integrity: sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==}
    engines: {node: '>= 0.4'}

  es-object-atoms@1.1.1:
    resolution: {integrity: sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==}
    engines: {node: '>= 0.4'}

  esbuild-plugin-pino@2.3.3:
    resolution: {integrity: sha512-5RIsILwgqy8wIV5pVg2gb13gJlH3EKKg613Js8q25p3tFsKA8ftsgWQFdgGbIkUe77Ttjl8lctuGkchRAvXGfw==}
    peerDependencies:
      esbuild: 0.27.3
      pino: '>=7.0.0'
      pino-pretty: '*'
      thread-stream: '*'
    peerDependenciesMeta:
      pino-pretty:
        optional: true
      thread-stream:
        optional: true

  esbuild@0.27.3:
    resolution: {integrity: sha512-8VwMnyGCONIs6cWue2IdpHxHnAjzxnw2Zr7MkVxB2vjmQ2ivqGFb4LEG3SMnv0Gb2F/G/2yA8zUaiL1gywDCCg==}
    engines: {node: '>=18'}
    hasBin: true

  escalade@3.2.0:
    resolution: {integrity: sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==}
    engines: {node: '>=6'}

  escape-html@1.0.3:
    resolution: {integrity: sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==}

  escape-string-regexp@1.0.5:
    resolution: {integrity: sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==}
    engines: {node: '>=0.8.0'}

  escape-string-regexp@2.0.0:
    resolution: {integrity: sha512-UpzcLCXolUWcNu5HtVMHYdXJjArjsF9C0aNnquZYY4uW/Vu0miy5YoWvbV345HauVvcAUnpRuhMMcqTcGOY2+w==}
    engines: {node: '>=8'}

  escape-string-regexp@4.0.0:
    resolution: {integrity: sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==}
    engines: {node: '>=10'}

  esprima@4.0.1:
    resolution: {integrity: sha512-eGuFFw7Upda+g4p+QHvnW0RyTX/SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB/sbNop0Kszm0jsaWU4A==}
    engines: {node: '>=4'}
    hasBin: true

  esutils@2.0.3:
    resolution: {integrity: sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==}
    engines: {node: '>=0.10.0'}

  etag@1.8.1:
    resolution: {integrity: sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==}
    engines: {node: '>= 0.6'}

  event-target-shim@5.0.1:
    resolution: {integrity: sha512-i/2XbnSz/uxRCU6+NdVJgKWDTM427+MqYbkQzD321DuCQJUqOuJKIA0IM2+W2xtYHdKOmZ4dR6fExsd4SXL+WQ==}
    engines: {node: '>=6'}

  eventemitter3@4.0.7:
    resolution: {integrity: sha512-8guHBZCwKnFhYdHr2ysuRWErTwhoN2X8XELRlrRwpmfeY2jjuUN4taQMsULKUVo1K4DvZl+0pgfyoysHxvmvEw==}

  execa@9.6.1:
    resolution: {integrity: sha512-9Be3ZoN4LmYR90tUoVu2te2BsbzHfhJyfEiAVfz7N5/zv+jduIfLrV2xdQXOHbaD6KgpGdO9PRPM1Y4Q9QkPkA==}
    engines: {node: ^18.19.0 || >=20.5.0}

  expo-asset@12.0.13:
    resolution: {integrity: sha512-x/p7WvQUnkn6K43b9eL6SPeq5Vnf1E8BDe9bDrWrvMqzyUvJnUFvl+ctg3034s/+UHe7Ne2pAmc0+yzbl8CrDQ==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'

  expo-blur@15.0.8:
    resolution: {integrity: sha512-rWyE1NBRZEu9WD+X+5l7gyPRszw7n12cW3IRNAb5i6KFzaBp8cxqT5oeaphJapqURvcqhkOZn2k5EtBSbsuU7w==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'

  expo-clipboard@8.0.8:
    resolution: {integrity: sha512-VKoBkHIpZZDJTB0jRO4/PZskHdMNOEz3P/41tmM6fDuODMpqhvyWK053X0ebspkxiawJX9lX33JXHBCvVsTTOA==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'

  expo-constants@18.0.13:
    resolution: {integrity: sha512-FnZn12E1dRYKDHlAdIyNFhBurKTS3F9CrfrBDJI5m3D7U17KBHMQ6JEfYlSj7LG7t+Ulr+IKaj58L1k5gBwTcQ==}
    peerDependencies:
      expo: '*'
      react-native: '*'

  expo-file-system@19.0.22:
    resolution: {integrity: sha512-l9pgahSc7sJD0bP9vBNeXvZjy8QKDpVHVxWmei/ESQOrzmoj5BidziqLVsyZdxsi+PfdbTtttLTAmddH/JafYA==}
    peerDependencies:
      expo: '*'
      react-native: '*'

  expo-font@14.0.11:
    resolution: {integrity: sha512-ga0q61ny4s/kr4k8JX9hVH69exVSIfcIc19+qZ7gt71Mqtm7xy2c6kwsPTCyhBW2Ro5yXTT8EaZOpuRi35rHbg==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'

  expo-glass-effect@0.1.10:
    resolution: {integrity: sha512-R0OrsMbs2TxFQZp26rRDl1Wxu5PaBXM7qAxiT0Bfyb1bojr3eI90bMKry9lBM3aKbq7DOBXYT7ePrE3vUaf41g==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'

  expo-haptics@15.0.8:
    resolution: {integrity: sha512-lftutojy8Qs8zaDzzjwM3gKHFZ8bOOEZDCkmh2Ddpe95Ra6kt2izeOfOfKuP/QEh0MZ1j9TfqippyHdRd1ZM9g==}
    peerDependencies:
      expo: '*'

  expo-image-loader@6.0.0:
    resolution: {integrity: sha512-nKs/xnOGw6ACb4g26xceBD57FKLFkSwEUTDXEDF3Gtcu3MqF3ZIYd3YM+sSb1/z9AKV1dYT7rMSGVNgsveXLIQ==}
    peerDependencies:
      expo: '*'

  expo-image-picker@17.0.11:
    resolution: {integrity: sha512-/apkoyukDvsCHHb9fzP+F34A1uQqSzUtYH/2P/xJACNEwq+mwEXjXvVU8bzlJq6ih0Qo1+tpVivIa7B9kYSwOQ==}
    peerDependencies:
      expo: '*'

  expo-image@3.0.11:
    resolution: {integrity: sha512-4TudfUCLgYgENv+f48omnU8tjS2S0Pd9EaON5/s1ZUBRwZ7K8acEr4NfvLPSaeXvxW24iLAiyQ7sV7BXQH3RoA==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'
      react-native-web: '*'
    peerDependenciesMeta:
      react-native-web:
        optional: true

  expo-keep-awake@15.0.8:
    resolution: {integrity: sha512-YK9M1VrnoH1vLJiQzChZgzDvVimVoriibiDIFLbQMpjYBnvyfUeHJcin/Gx1a+XgupNXy92EQJLgI/9ZuXajYQ==}
    peerDependencies:
      expo: '*'
      react: '*'

  expo-linear-gradient@15.0.8:
    resolution: {integrity: sha512-V2d8Wjn0VzhPHO+rrSBtcl+Fo+jUUccdlmQ6OoL9/XQB7Qk3d9lYrqKDJyccwDxmQT10JdST3Tmf2K52NLc3kw==}
    peerDependencies:
      expo: '*'
      react: '*'
      react-native: '*'

  expo-linking@8.0.12:
    resolution: {integrity: sha512-FpXeIpFgZuxihwT9lBo86YD3y6LphBuAhN680MMxm/Y7fmsc57vimn2d3vFu68VI0+Z9w457t494mu2wvlgWTQ==}
    peerDependencies:
      react: '*'
      react-native: '*'

  expo-location@19.0.8:
    resolution: {integrity: sha512-H/FI75VuJ1coodJbbMu82pf+Zjess8X8Xkiv9Bv58ZgPKS/2ztjC1YO1/XMcGz7+s9DrbLuMIw22dFuP4HqneA==}
    peerDependencies:
      expo: '*'

  expo-modules-autolinking@3.0.25:
    resolution: {integrity: sha512-YmHWctJlwvOuLZccg3cOXvSiXVJrPMKl7g2YR0YHWoGL9v2RvcmgaPJWPSLVW+voNEgEPsbo5UmUrAqbnYcBeg==}
    hasBin: true

  expo-modules-core@3.0.30:
    resolution: {integrity: sha512-a6IrpAn/Jbmwxi9L+hMmXKpNqnkUpoF7WHOpn02rVLyax2J0gB1vvCVE5rNydplEnt41Q6WxQwvcOjZaIkcSUg==}
    peerDependencies:
      react: '*'
      react-native: '*'

  expo-router@6.0.23:
    resolution: {integrity: sha512-qCxVAiCrCyu0npky6azEZ6dJDMt77OmCzEbpF6RbUTlfkaCA417LvY14SBkk0xyGruSxy/7pvJOI6tuThaUVCA==}
    peerDependencies:
      '@react-navigation/drawer': ^7.5.0
      '@testing-library/react-native': '>= 12.0.0'
      expo: '*'
      expo-constants: ^18.0.13
      expo-linking: ^8.0.11
      react: '*'
      react-dom: '*'
      react-native: '*'
      react-native-gesture-handler: '*'
      react-native-reanimated: '*'
      react-native-safe-area-context: '>= 5.4.0'
      react-native-screens: '*'
      react-native-web: '*'
      react-server-dom-webpack: ~19.0.4 || ~19.1.5 || ~19.2.4
    peerDependenciesMeta:
      '@react-navigation/drawer':
        optional: true
      '@testing-library/react-native':
        optional: true
      react-dom:
        optional: true
      react-native-gesture-handler:
        optional: true
      react-native-reanimated:
        optional: true
      react-native-web:
        optional: true
      react-server-dom-webpack:
        optional: true

  expo-server@1.0.6:
    resolution: {integrity: sha512-vb5TBtskvEdzYuW79lATXutOEBfW5m6U4EFpNjCVZTnI7S//SAsLQkYEpn+EDfn84m6VQfzSGkIVR6YPaScKFA==}
    engines: {node: '>=20.16.0'}

  expo-splash-screen@31.0.13:
    resolution: {integrity: sha512-1epJLC1cDlwwj089R2h8cxaU5uk4ONVAC+vzGiTZH4YARQhL4Stlz1MbR6yAS173GMosvkE6CAeihR7oIbCkDA==}
    peerDependencies:
      expo: '*'

  expo-status-bar@3.0.9:
    resolution: {integrity: sha512-xyYyVg6V1/SSOZWh4Ni3U129XHCnFHBTcUo0dhWtFDrZbNp/duw5AGsQfb2sVeU0gxWHXSY1+5F0jnKYC7WuOw==}
    peerDependencies:
      react: '*'
      react-native: '*'

  expo-symbols@1.0.8:
    resolution: {integrity: sha512-7bNjK350PaQgxBf0owpmSYkdZIpdYYmaPttDBb2WIp6rIKtcEtdzdfmhsc2fTmjBURHYkg36+eCxBFXO25/1hw==}
    peerDependencies:
      expo: '*'
      react-native: '*'

  expo-system-ui@6.0.9:
    resolution: {integrity: sha512-eQTYGzw1V4RYiYHL9xDLYID3Wsec2aZS+ypEssmF64D38aDrqbDgz1a2MSlHLQp2jHXSs3FvojhZ9FVela1Zcg==}
    peerDependencies:
      expo: '*'
      react-native: '*'
      react-native-web: '*'
    peerDependenciesMeta:
      react-native-web:
        optional: true

  expo-web-browser@15.0.11:
    resolution: {integrity: sha512-r2LS4Ro6DgUPZkcaEfgt8mp9eJuoA93x11Jh7S6utFe0FEzvUNn2yFhxg8XVwESaaHGt2k5V8LuK36rsp0BeIw==}
    peerDependencies:
      expo: '*'
      react-native: '*'

  expo@54.0.34:
    resolution: {integrity: sha512-XkVHguZZDC8BcTQxHAd14/TQFbDp1Wt0Z/KApO9t68Ll5A127hLCPzU+a9gytfCIiyL/V1IpF1vIcOLKEVAoNQ==}
    hasBin: true
    peerDependencies:
      '@expo/dom-webview': '*'
      '@expo/metro-runtime': '*'
      react: '*'
      react-native: '*'
      react-native-webview: '*'
    peerDependenciesMeta:
      '@expo/dom-webview':
        optional: true
      '@expo/metro-runtime':
        optional: true
      react-native-webview:
        optional: true

  exponential-backoff@3.1.3:
    resolution: {integrity: sha512-ZgEeZXj30q+I0EN+CbSSpIyPaJ5HVQD18Z1m+u1FXbAeT94mr1zw50q4q6jiiC447Nl/YTcIYSAftiGqetwXCA==}

  express@5.2.1:
    resolution: {integrity: sha512-hIS4idWWai69NezIdRt2xFVofaF4j+6INOpJlVOLDO8zXGpUVEVzIYk12UUi2JzjEzWL3IOAxcTubgz9Po0yXw==}
    engines: {node: '>= 18'}

  fast-copy@4.0.3:
    resolution: {integrity: sha512-58apWr0GUiDFM8+3afrO6eYwJBn9ZAhDOzG3L+/9llab/haCARS2UIfffmOurYLwbgDRs8n0rfr6qAAPEAuAQw==}

  fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}

  fast-equals@5.4.0:
    resolution: {integrity: sha512-jt2DW/aNFNwke7AUd+Z+e6pz39KO5rzdbbFCg2sGafS4mk13MI7Z8O5z9cADNn5lhGODIgLwug6TZO2ctf7kcw==}
    engines: {node: '>=6.0.0'}

  fast-glob@3.3.3:
    resolution: {integrity: sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==}
    engines: {node: '>=8.6.0'}

  fast-json-stable-stringify@2.1.0:
    resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}

  fast-safe-stringify@2.1.1:
    resolution: {integrity: sha512-W+KJc2dmILlPplD/H4K9l9LcAHAfPtP6BY84uVLXQ6Evcz9Lcg33Y2z1IVblT6xdY54PXYVHEv+0Wpq8Io6zkA==}

  fast-uri@3.1.2:
    resolution: {integrity: sha512-rVjf7ArG3LTk+FS6Yw81V1DLuZl1bRbNrev6Tmd/9RaroeeRRJhAt7jg/6YFxbvAQXUCavSoZhPPj6oOx+5KjQ==}

  fastq@1.20.1:
    resolution: {integrity: sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==}

  fb-watchman@2.0.2:
    resolution: {integrity: sha512-p5161BqbuCaSnB8jIbzQHOlpgsPmK5rJVDfDKO91Axs5NC1uu3HRQm6wt9cd9/+GtQQIO53JdGXXoyDpTAsgYA==}

  fbjs-css-vars@1.0.2:
    resolution: {integrity: sha512-b2XGFAFdWZWg0phtAWLHCk836A1Xann+I+Dgd3Gk64MHKZO44FfoD1KxyvbSh0qZsIoXQGGlVztIY+oitJPpRQ==}

  fbjs@3.0.5:
    resolution: {integrity: sha512-ztsSx77JBtkuMrEypfhgc3cI0+0h+svqeie7xHbh1k/IKdcydnvadp/mUaGgjAOXQmQSxsqgaRhS3q9fy+1kxg==}

  fdir@6.5.0:
    resolution: {integrity: sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==}
    engines: {node: '>=12.0.0'}
    peerDependencies:
      picomatch: ^3 || ^4
    peerDependenciesMeta:
      picomatch:
        optional: true

  figures@6.1.0:
    resolution: {integrity: sha512-d+l3qxjSesT4V7v2fh+QnmFnUWv9lSpjarhShNTgBOfA0ttejbQUAlHLitbjkoRiDulW0OPoQPYIGhIC8ohejg==}
    engines: {node: '>=18'}

  fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}

  filter-obj@1.1.0:
    resolution: {integrity: sha512-8rXg1ZnX7xzy2NGDVkBVaAy+lSlPNwad13BtgSlLuxfIslyt5Vg64U7tFcCt4WS1R0hvtnQybT/IyCkGZ3DpXQ==}
    engines: {node: '>=0.10.0'}

  finalhandler@1.1.2:
    resolution: {integrity: sha512-aAWcW57uxVNrQZqFXjITpW3sIUQmHGG3qSb9mUah9MgMC4NeWhNOlNjXEYq3HjRAvL6arUviZGGJsBg6z0zsWA==}
    engines: {node: '>= 0.8'}

  finalhandler@2.1.1:
    resolution: {integrity: sha512-S8KoZgRZN+a5rNwqTxlZZePjT/4cnm0ROV70LedRHZ0p8u9fRID0hJUZQpkKLzro8LfmC8sx23bY6tVNxv8pQA==}
    engines: {node: '>= 18.0.0'}

  find-up@4.1.0:
    resolution: {integrity: sha512-PpOwAdQ/YlXQ2vj8a3h8IipDuYRi3wceVQQGYWxNINccq40Anw7BlsEXCMbt1Zt+OLA6Fq9suIpIWD0OsnISlw==}
    engines: {node: '>=8'}

  find-up@8.0.0:
    resolution: {integrity: sha512-JGG8pvDi2C+JxidYdIwQDyS/CgcrIdh18cvgxcBge3wSHRQOrooMD3GlFBcmMJAN9M42SAZjDp5zv1dglJjwww==}
    engines: {node: '>=20'}

  flow-enums-runtime@0.0.6:
    resolution: {integrity: sha512-3PYnM29RFXwvAN6Pc/scUfkI7RwhQ/xqyLUyPNlXUp9S40zI8nup9tUSrTLSVnWGBN38FNiGWbwZOB6uR4OGdw==}

  fontfaceobserver@2.3.0:
    resolution: {integrity: sha512-6FPvD/IVyT4ZlNe7Wcn5Fb/4ChigpucKYSvD6a+0iMoLn2inpo711eyIcKjmDtE5XNcgAkSH9uN/nfAeZzHEfg==}

  forwarded@0.2.0:
    resolution: {integrity: sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==}
    engines: {node: '>= 0.6'}

  framer-motion@12.38.0:
    resolution: {integrity: sha512-rFYkY/pigbcswl1XQSb7q424kSTQ8q6eAC+YUsSKooHQYuLdzdHjrt6uxUC+PRAO++q5IS7+TamgIw1AphxR+g==}
    peerDependencies:
      '@emotion/is-prop-valid': '*'
      react: ^18.0.0 || ^19.0.0
      react-dom: ^18.0.0 || ^19.0.0
    peerDependenciesMeta:
      '@emotion/is-prop-valid':
        optional: true
      react:
        optional: true
      react-dom:
        optional: true

  freeport-async@2.0.0:
    resolution: {integrity: sha512-K7od3Uw45AJg00XUmy15+Hae2hOcgKcmN3/EF6Y7i01O0gaqiRx8sUSpsb9+BRNL8RPBrhzPsVfy8q9ADlJuWQ==}
    engines: {node: '>=8'}

  fresh@0.5.2:
    resolution: {integrity: sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==}
    engines: {node: '>= 0.6'}

  fresh@2.0.0:
    resolution: {integrity: sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==}
    engines: {node: '>= 0.8'}

  fs-extra@11.3.5:
    resolution: {integrity: sha512-eKpRKAovdpZtR1WopLHxlBWvAgPny3c4gX1G5Jhwmmw4XJj0ifSD5qB5TOo8hmA0wlRKDAOAhEE1yVPgs6Fgcg==}
    engines: {node: '>=14.14'}

  fs.realpath@1.0.0:
    resolution: {integrity: sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==}

  fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]

  function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}

  gensync@1.0.0-beta.2:
    resolution: {integrity: sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==}
    engines: {node: '>=6.9.0'}

  get-caller-file@2.0.5:
    resolution: {integrity: sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==}
    engines: {node: 6.* || 8.* || >= 10.*}

  get-intrinsic@1.3.0:
    resolution: {integrity: sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==}
    engines: {node: '>= 0.4'}

  get-nonce@1.0.1:
    resolution: {integrity: sha512-FJhYRoDaiatfEkUK8HKlicmu/3SGFD51q3itKDGoSTysQJBnfOcxU5GxnhE1E6soB76MbT0MBtnKJuXyAx+96Q==}
    engines: {node: '>=6'}

  get-package-type@0.1.0:
    resolution: {integrity: sha512-pjzuKtY64GYfWizNAJ0fr9VqttZkNiK2iS430LtIHzjBEr6bX8Am2zm4sW4Ro5wjWW5cAlRL1qAMTcXbjNAO2Q==}
    engines: {node: '>=8.0.0'}

  get-proto@1.0.1:
    resolution: {integrity: sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==}
    engines: {node: '>= 0.4'}

  get-stream@5.2.0:
    resolution: {integrity: sha512-nBF+F1rAZVCu/p7rjzgA+Yb4lfYXrpl7a6VmJrU8wF9I1CKvP/QwPNZHnOlwbTkY6dvtFIzFMSyQXbLoTQPRpA==}
    engines: {node: '>=8'}

  get-stream@9.0.1:
    resolution: {integrity: sha512-kVCxPF3vQM/N0B1PmoqVUqgHP+EeVjmZSQn+1oCRPxd2P21P2F19lIgbR3HBosbB1PUhOAoctJnfEn2GbN2eZA==}
    engines: {node: '>=18'}

  get-tsconfig@4.14.0:
    resolution: {integrity: sha512-yTb+8DXzDREzgvYmh6s9vHsSVCHeC0G3PI5bEXNBHtmshPnO+S5O7qgLEOn0I5QvMy6kpZN8K1NKGyilLb93wA==}

  getenv@2.0.0:
    resolution: {integrity: sha512-VilgtJj/ALgGY77fiLam5iD336eSWi96Q15JSAG1zi8NRBysm3LXKdGnHb4m5cuyxvOLQQKWpBZAT6ni4FI2iQ==}
    engines: {node: '>=6'}

  glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}

  glob@13.0.6:
    resolution: {integrity: sha512-Wjlyrolmm8uDpm/ogGyXZXb1Z+Ca2B8NbJwqBVg0axK9GbBeoS7yGV6vjXnYdGm6X53iehEuxxbyiKp8QmN4Vw==}
    engines: {node: 18 || 20 || >=22}

  glob@7.2.3:
    resolution: {integrity: sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==}
    deprecated: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me

  globby@16.1.0:
    resolution: {integrity: sha512-+A4Hq7m7Ze592k9gZRy4gJ27DrXRNnC1vPjxTt1qQxEY8RxagBkBxivkCwg7FxSTG0iLLEMaUx13oOr0R2/qcQ==}
    engines: {node: '>=20'}

  gopd@1.2.0:
    resolution: {integrity: sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==}
    engines: {node: '>= 0.4'}

  got@11.8.6:
    resolution: {integrity: sha512-6tfZ91bOr7bOXnK7PRDCGBLa1H4U080YHNaAQ2KsMGlLEzRbk44nsZF2E1IeRc3vtJHPVbKCYgdFbaGO2ljd8g==}
    engines: {node: '>=10.19.0'}

  graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}

  has-flag@3.0.0:
    resolution: {integrity: sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==}
    engines: {node: '>=4'}

  has-flag@4.0.0:
    resolution: {integrity: sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==}
    engines: {node: '>=8'}

  has-symbols@1.1.0:
    resolution: {integrity: sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==}
    engines: {node: '>= 0.4'}

  hasown@2.0.3:
    resolution: {integrity: sha512-ej4AhfhfL2Q2zpMmLo7U1Uv9+PyhIZpgQLGT1F9miIGmiCJIoCgSmczFdrc97mWT4kVY72KA+WnnhJ5pghSvSg==}
    engines: {node: '>= 0.4'}

  help-me@5.0.0:
    resolution: {integrity: sha512-7xgomUX6ADmcYzFik0HzAxh/73YlKR9bmFzf51CZwR+b6YtzU2m0u49hQCqV6SvlqIqsaxovfwdvbnsw3b/zpg==}

  hermes-estree@0.29.1:
    resolution: {integrity: sha512-jl+x31n4/w+wEqm0I2r4CMimukLbLQEYpisys5oCre611CI5fc9TxhqkBBCJ1edDG4Kza0f7CgNz8xVMLZQOmQ==}

  hermes-estree@0.32.0:
    resolution: {integrity: sha512-KWn3BqnlDOl97Xe1Yviur6NbgIZ+IP+UVSpshlZWkq+EtoHg6/cwiDj/osP9PCEgFE15KBm1O55JRwbMEm5ejQ==}

  hermes-estree@0.35.0:
    resolution: {integrity: sha512-xVx5Opwy8Oo1I5yGpVRhCvWL/iV3M+ylksSKVNlxxD90cpDpR/AR1jLYqK8HWihm065a6UI3HeyAmYzwS8NOOg==}

  hermes-parser@0.29.1:
    resolution: {integrity: sha512-xBHWmUtRC5e/UL0tI7Ivt2riA/YBq9+SiYFU7C1oBa/j2jYGlIF9043oak1F47ihuDIxQ5nbsKueYJDRY02UgA==}

  hermes-parser@0.32.0:
    resolution: {integrity: sha512-g4nBOWFpuiTqjR3LZdRxKUkij9iyveWeuks7INEsMX741f3r9xxrOe8TeQfUxtda0eXmiIFiMQzoeSQEno33Hw==}

  hermes-parser@0.35.0:
    resolution: {integrity: sha512-9JLjeHxBx8T4CAsydZR49PNZUaix+WpQJwu9p2010lu+7Kwl6D/7wYFFJxoz+aXkaaClp9Zfg6W6/zVlSJORaA==}

  hoist-non-react-statics@3.3.2:
    resolution: {integrity: sha512-/gGivxi8JPKWNm/W0jSmzcMPpfpPLc3dY/6GxhX2hQ9iGj3aDfklV4ET7NjKpSinLpJ5vafa9iiGIEZg10SfBw==}

  hosted-git-info@7.0.2:
    resolution: {integrity: sha512-puUZAUKT5m8Zzvs72XWy3HtvVbTWljRE66cP60bxJzAqf2DgICo7lYTY2IHUmLnNpjYvw5bvmoHvPc0QO2a62w==}
    engines: {node: ^16.14.0 || >=18.0.0}

  http-cache-semantics@4.2.0:
    resolution: {integrity: sha512-dTxcvPXqPvXBQpq5dUr6mEMJX4oIEFv6bwom3FDwKRDsuIjjJGANqhBuoAn9c1RQJIdAKav33ED65E2ys+87QQ==}

  http-errors@2.0.1:
    resolution: {integrity: sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==}
    engines: {node: '>= 0.8'}

  http2-wrapper@1.0.3:
    resolution: {integrity: sha512-V+23sDMr12Wnz7iTcDeJr3O6AIxlnvT/bmaAAAP/Xda35C90p9599p0F1eHR/N1KILWSoWVAiOMFjBBXaXSMxg==}
    engines: {node: '>=10.19.0'}

  https-proxy-agent@7.0.6:
    resolution: {integrity: sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==}
    engines: {node: '>= 14'}

  human-signals@8.0.1:
    resolution: {integrity: sha512-eKCa6bwnJhvxj14kZk5NCPc6Hb6BdsU9DZcOnmQKSnO1VKrfV0zCvtttPZUsBvjmNDn8rpcJfpwSYnHBjc95MQ==}
    engines: {node: '>=18.18.0'}

  hyphenate-style-name@1.1.0:
    resolution: {integrity: sha512-WDC/ui2VVRrz3jOVi+XtjqkDjiVjTtFaAGiW37k6b+ohyQ5wYDOGkvCZa8+H0nx3gyvv0+BST9xuOgIyGQ00gw==}

  iconv-lite@0.7.2:
    resolution: {integrity: sha512-im9DjEDQ55s9fL4EYzOAv0yMqmMBSZp6G0VvFyTMPKWxiSBHUj9NW/qqLmXUwXrrM7AvqSlTCfvqRb0cM8yYqw==}
    engines: {node: '>=0.10.0'}

  ieee754@1.2.1:
    resolution: {integrity: sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==}

  ignore@5.3.2:
    resolution: {integrity: sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==}
    engines: {node: '>= 4'}

  ignore@7.0.5:
    resolution: {integrity: sha512-Hs59xBNfUIunMFgWAbGX5cq6893IbWg4KnrjbYwX3tx0ztorVgTDA6B2sxf8ejHJ4wz8BqGUMYlnzNBer5NvGg==}
    engines: {node: '>= 4'}

  image-size@1.2.1:
    resolution: {integrity: sha512-rH+46sQJ2dlwfjfhCyNx5thzrv+dtmBIhPHk0zgRUukHzZ/kRueTJXoYYsclBaKcSMBWuGbOFXtioLpzTb5euw==}
    engines: {node: '>=16.x'}
    hasBin: true

  imurmurhash@0.1.4:
    resolution: {integrity: sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==}
    engines: {node: '>=0.8.19'}

  inflight@1.0.6:
    resolution: {integrity: sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==}
    deprecated: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

  inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}

  ini@1.3.8:
    resolution: {integrity: sha512-JV/yugV2uzW5iMRSiZAyDtQd+nxtUnjeLt0acNdw98kKLrvuRVyB80tsREOE7yvGVgalhZ6RNXCmEHkUKBKxew==}

  inline-style-prefixer@7.0.1:
    resolution: {integrity: sha512-lhYo5qNTQp3EvSSp3sRvXMbVQTLrvGV6DycRMJ5dm2BLMiJ30wpXKdDdgX+GmJZ5uQMucwRKHamXSst3Sj/Giw==}

  input-otp@1.4.2:
    resolution: {integrity: sha512-l3jWwYNvrEa6NTCt7BECfCm48GvwuZzkoeG3gBL2w4CHeOXW3eKFmf9UNYkNfYc3mxMrthMnxjIE07MT0zLBQA==}
    peerDependencies:
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc

  internmap@2.0.3:
    resolution: {integrity: sha512-5Hh7Y1wQbvY5ooGgPbDaL5iYLAPzMTUrjMulskHLH6wnv/A+1q5rgEaiuqEjB+oxGXIVZs1FF+R/KPN3ZSQYYg==}
    engines: {node: '>=12'}

  invariant@2.2.4:
    resolution: {integrity: sha512-phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns//LaXl6wGYtUBY83nWS6Rf9tXm2e8VaK60JEjYldbPif/A2B1C2gNA==}

  ipaddr.js@1.9.1:
    resolution: {integrity: sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==}
    engines: {node: '>= 0.10'}

  is-arrayish@0.3.4:
    resolution: {integrity: sha512-m6UrgzFVUYawGBh1dUsWR5M2Clqic9RVXC/9f8ceNlv2IcO9j9J/z8UoCLPqtsPBFNzEpfR3xftohbfqDx8EQA==}

  is-core-module@2.16.2:
    resolution: {integrity: sha512-evOr8xfXKxE6qSR0hSXL2r3sd7ALj8+7jQEUvPYcm5sgZFdJ+AYzT6yNmJenvIYQBgIGwfwz08sL8zoL7yq2BA==}
    engines: {node: '>= 0.4'}

  is-docker@2.2.1:
    resolution: {integrity: sha512-F+i2BKsFrH66iaUFc0woD8sLy8getkwTwtOBjvs56Cx4CgJDeKQeqfz8wAYiSb8JOprWhHH5p77PbmYCvvUuXQ==}
    engines: {node: '>=8'}
    hasBin: true

  is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}

  is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}

  is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}

  is-network-error@1.3.2:
    resolution: {integrity: sha512-PhBY86zaxNZUuWP6h13Vu5oFe0XY6/UlKzQnYFELzGVHygP3MxmvTfYSG7GN3aIab/iWudSMgjSnG9Dq+nHrgA==}
    engines: {node: '>=16'}

  is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}

  is-path-inside@4.0.0:
    resolution: {integrity: sha512-lJJV/5dYS+RcL8uQdBDW9c9uWFLLBNRyFhnAKXw5tVqLlKZ4RMGZKv+YQ/IA3OhD+RpbJa1LLFM1FQPGyIXvOA==}
    engines: {node: '>=12'}

  is-plain-obj@2.1.0:
    resolution: {integrity: sha512-YWnfyRwxL/+SsrWYfOpUtz5b3YD+nyfkHvjbcanzk8zgyO4ASD67uVMRt8k5bM4lLMDnXfriRhOpemw+NfT1eA==}
    engines: {node: '>=8'}

  is-plain-obj@4.1.0:
    resolution: {integrity: sha512-+Pgi+vMuUNkJyExiMBt5IlFoMyKnr5zhJ4Uspz58WOhBF5QoIZkFyNHIbBAtHwzVAgk5RtndVNsDRN61/mmDqg==}
    engines: {node: '>=12'}

  is-promise@4.0.0:
    resolution: {integrity: sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==}

  is-stream@4.0.1:
    resolution: {integrity: sha512-Dnz92NInDqYckGEUJv689RbRiTSEHCQ7wOVeALbkOz999YpqT46yMRIGtSNl2iCL1waAZSx40+h59NV/EwzV/A==}
    engines: {node: '>=18'}

  is-unicode-supported@2.1.0:
    resolution: {integrity: sha512-mE00Gnza5EEB3Ds0HfMyllZzbBrmLOX3vfWoj9A9PEnTfratQ/BcaJOuMhnkhjXvb2+FkY3VuHqtAGpTPmglFQ==}
    engines: {node: '>=18'}

  is-wsl@2.2.0:
    resolution: {integrity: sha512-fKzAra0rGJUUBwGBgNkHZuToZcn+TtXHpeCgmkMJMMYx1sQDYaCSyjJBSCa2nH1DGm7s3n1oBnohoVTBaN7Lww==}
    engines: {node: '>=8'}

  isexe@2.0.0:
    resolution: {integrity: sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==}

  istanbul-lib-coverage@3.2.2:
    resolution: {integrity: sha512-O8dpsF+r0WV/8MNRKfnmrtCWhuKjxrq2w+jpzBL5UZKTi2LeVWnWOmWRxFlesJONmc+wLAGvKQZEOanko0LFTg==}
    engines: {node: '>=8'}

  istanbul-lib-instrument@5.2.1:
    resolution: {integrity: sha512-pzqtp31nLv/XFOzXGuvhCb8qhjmTVo5vjVk19XE4CRlSWz0KoeJ3bw9XsA7nOp9YBf4qHjwBxkDzKcME/J29Yg==}
    engines: {node: '>=8'}

  jest-environment-node@29.7.0:
    resolution: {integrity: sha512-DOSwCRqXirTOyheM+4d5YZOrWcdu0LNZ87ewUoywbcb2XR4wKgqiG8vNeYwhjFMbEkfju7wx2GYH0P2gevGvFw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-get-type@29.6.3:
    resolution: {integrity: sha512-zrteXnqYxfQh7l5FHyL38jL39di8H8rHoecLH3JNxH3BwOrBsNeabdap5e0I23lD4HHI8W5VFBZqG4Eaq5LNcw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-haste-map@29.7.0:
    resolution: {integrity: sha512-fP8u2pyfqx0K1rGn1R9pyE0/KTn+G7PxktWidOBTqFPLYX0b9ksaMFkhK5vrS3DVun09pckLdlx90QthlW7AmA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-message-util@29.7.0:
    resolution: {integrity: sha512-GBEV4GRADeP+qtB2+6u61stea8mGcOT4mCtrYISZwfu9/ISHFJ/5zOMXYbpBE9RsS5+Gb63DW4FgmnKJ79Kf6w==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-mock@29.7.0:
    resolution: {integrity: sha512-ITOMZn+UkYS4ZFh83xYAOzWStloNzJFO2s8DWrE4lhtGD+AorgnbkiKERe4wQVBydIGPx059g6riW5Btp6Llnw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-regex-util@29.6.3:
    resolution: {integrity: sha512-KJJBsRCyyLNWCNBOvZyRDnAIfUiRJ8v+hOBQYGn8gDyF3UegwiP4gwRR3/SDa42g1YbVycTidUF3rKjyLFDWbg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-util@29.7.0:
    resolution: {integrity: sha512-z6EbKajIpqGKU56y5KBUgy1dt1ihhQJgWzUlZHArA/+X2ad7Cb5iF+AK1EWVL/Bo7Rz9uurpqw6SiBCefUbCGA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-validate@29.7.0:
    resolution: {integrity: sha512-ZB7wHqaRGVw/9hST/OuFUReG7M8vKeq0/J2egIGLdvjHCmYqGARhzXmtgi+gVeZ5uXFF219aOc3Ls2yLg27tkw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-worker@29.7.0:
    resolution: {integrity: sha512-eIz2msL/EzL9UFTFFx7jBTkeZfku0yUAyZZZmJ93H2TYEiroIx2PQjEXcwYtYl8zXCxb+PAmA2hLIt/6ZEkPHw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jimp-compact@0.16.1:
    resolution: {integrity: sha512-dZ6Ra7u1G8c4Letq/B5EzAxj4tLFHL+cGtdpR+PVm4yzPDj+lCk+AbivWt1eOM+ikzkowtyV7qSqX6qr3t71Ww==}

  jiti@2.7.0:
    resolution: {integrity: sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==}
    hasBin: true

  joycon@3.1.1:
    resolution: {integrity: sha512-34wB/Y7MW7bzjKRjUKTa46I2Z7eV62Rkhva+KkopW7Qvv/OSWBqvkSY7vusOPrNuZcUG3tApvdVgNB8POj3SPw==}
    engines: {node: '>=10'}

  js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

  js-yaml@3.14.2:
    resolution: {integrity: sha512-PMSmkqxr106Xa156c2M265Z+FTrPl+oxd/rgOQy2tijQeK5TxQ43psO1ZCwhVOSdnn+RzkzlRz/eY4BgJBYVpg==}
    hasBin: true

  js-yaml@4.1.1:
    resolution: {integrity: sha512-qQKT4zQxXl8lLwBtHMWwaTcGfFOZviOJet3Oy/xmGk2gZH677CJM9EvtfdSkgWcATZhj/55JZ0rmy3myCT5lsA==}
    hasBin: true

  jsc-safe-url@0.2.4:
    resolution: {integrity: sha512-0wM3YBWtYePOjfyXQH5MWQ8H7sdk5EXSwZvmSLKk2RboVQ2Bu239jycHDz5J/8Blf3K0Qnoy2b6xD+z10MFB+Q==}

  jsesc@3.1.0:
    resolution: {integrity: sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==}
    engines: {node: '>=6'}
    hasBin: true

  json-buffer@3.0.1:
    resolution: {integrity: sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==}

  json-schema-traverse@1.0.0:
    resolution: {integrity: sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==}

  json5@2.2.3:
    resolution: {integrity: sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==}
    engines: {node: '>=6'}
    hasBin: true

  jsonfile@6.2.1:
    resolution: {integrity: sha512-zwOTdL3rFQ/lRdBnntKVOX6k5cKJwEc1HdilT71BWEu7J41gXIB2MRp+vxduPSwZJPWBxEzv4yH1wYLJGUHX4Q==}

  jsonpointer@5.0.1:
    resolution: {integrity: sha512-p/nXbhSEcu3pZRdkW1OfJhpsVtW1gd4Wa1fnQc9YLiTfAjn0312eMKimbdIQzuZl9aa9xUGaRlP9T/CJE/ditQ==}
    engines: {node: '>=0.10.0'}

  keyv@4.5.4:
    resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}

  kleur@3.0.3:
    resolution: {integrity: sha512-eTIzlVOSUR+JxdDFepEYcBMtZ9Qqdef+rnzWdRZuMbOywu5tO2w2N7rqjoANZ5k9vywhL6Br1VRjUIgTQx4E8w==}
    engines: {node: '>=6'}

  lan-network@0.1.7:
    resolution: {integrity: sha512-mnIlAEMu4OyEvUNdzco9xpuB9YVcPkQec+QsgycBCtPZvEqWPCDPfbAE4OJMdBBWpZWtpCn1xw9jJYlwjWI5zQ==}
    hasBin: true

  lan-network@0.2.1:
    resolution: {integrity: sha512-ONPnazC96VKDntab9j9JKwIWhZ4ZUceB4A9Epu4Ssg0hYFmtHZSeQ+n15nIwTFmcBUKtExOer8WTJ4GF9MO64A==}
    hasBin: true

  leven@3.1.0:
    resolution: {integrity: sha512-qsda+H8jTaUaN/x5vzW2rzc+8Rw4TAQ/4KjB46IwK5VH+IlVeeeje/EoZRpiXvIqjFgK84QffqPztGI3VBLG1A==}
    engines: {node: '>=6'}

  leven@4.1.0:
    resolution: {integrity: sha512-KZ9W9nWDT7rF7Dazg8xyLHGLrmpgq2nVNFUckhqdW3szVP6YhCpp/RAnpmVExA9JvrMynjwSLVrEj3AepHR6ew==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}

  lighthouse-logger@1.4.2:
    resolution: {integrity: sha512-gPWxznF6TKmUHrOQjlVo2UbaL2EJ71mb2CCeRs/2qBpi4L/g4LUVc9+3lKQ6DTUZwJswfM7ainGrLO1+fOqa2g==}

  lightningcss-linux-x64-gnu@1.32.0:
    resolution: {integrity: sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==}
    engines: {node: '>= 12.0.0'}
    cpu: [x64]
    os: [linux]
    libc: [glibc]

  lightningcss@1.32.0:
    resolution: {integrity: sha512-NXYBzinNrblfraPGyrbPoD19C1h9lfI/1mzgWYvXUTe414Gz/X1FD2XBZSZM7rRTrMA8JL3OtAaGifrIKhQ5yQ==}
    engines: {node: '>= 12.0.0'}

  lines-and-columns@1.2.4:
    resolution: {integrity: sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==}

  linkify-it@5.0.0:
    resolution: {integrity: sha512-5aHCbzQRADcdP+ATqnDuhhJ/MRIqDkZX5pyjFHRRysS8vZ5AbqGEoFIb6pYHPZ+L/OC2Lc+xT8uHVVR5CAK/wQ==}

  locate-path@5.0.0:
    resolution: {integrity: sha512-t7hw9pI+WvuwNJXwk5zVHpyhIqzg2qTlklJOf0mVxGSbe3Fp2VieZcduNYjaLDoy6p9uGpQEGWG87WpMKlNq8g==}
    engines: {node: '>=8'}

  locate-path@8.0.0:
    resolution: {integrity: sha512-XT9ewWAC43tiAV7xDAPflMkG0qOPn2QjHqlgX8FOqmWa/rxnyYDulF9T0F7tRy1u+TVTmK/M//6VIOye+2zDXg==}
    engines: {node: '>=20'}

  lodash.debounce@4.0.8:
    resolution: {integrity: sha512-FT1yDzDYEoYWhnSGnpE/4Kj1fLZkDFyqRb7fNt6FdYOSxlUWAtp42Eh6Wb0rGIv/m9Bgo7x4GhQbm5Ys4SG5ow==}

  lodash.throttle@4.1.1:
    resolution: {integrity: sha512-wIkUCfVKpVsWo3JSZlc+8MB5it+2AN5W8J7YVMST30UrvcQNZ1Okbj+rbVniijTWE6FGYy4XJq/rHkas8qJMLQ==}

  lodash@4.18.1:
    resolution: {integrity: sha512-dMInicTPVE8d1e5otfwmmjlxkZoUpiVLwyeTdUsi/Caj/gfzzblBcCE5sRHV/AsjuCmxWrte2TNGSYuCeCq+0Q==}

  log-symbols@2.2.0:
    resolution: {integrity: sha512-VeIAFslyIerEJLXHziedo2basKbMKtTw3vfn5IzG0XTjhAVEJyNHnL2p7vc+wBDSdQuUpNw3M2u6xb9QsAY5Eg==}
    engines: {node: '>=4'}

  loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==}
    hasBin: true

  lowercase-keys@2.0.0:
    resolution: {integrity: sha512-tqNXrS78oMOE73NMxK4EMLQsQowWf8jKooH9g7xPavRT706R6bkQJ6DY2Te7QukaZsulxa30wQ7bk0pm4XiHmA==}
    engines: {node: '>=8'}

  lru-cache@10.4.3:
    resolution: {integrity: sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==}

  lru-cache@11.5.0:
    resolution: {integrity: sha512-5YgH9UJd7wVb9hIouI2adWpgqrrICkt070Dnj8EUY1+B4B2P9eRLPAkAAo6NICA7CEhOIeBHl46u9zSNpNu7zA==}
    engines: {node: 20 || >=22}

  lru-cache@5.1.1:
    resolution: {integrity: sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==}

  lucide-react@0.545.0:
    resolution: {integrity: sha512-7r1/yUuflQDSt4f1bpn5ZAocyIxcTyVyBBChSVtBKn5M+392cPmI5YJMWOJKk/HUWGm5wg83chlAZtCcGbEZtw==}
    peerDependencies:
      react: ^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0

  lunr@2.3.9:
    resolution: {integrity: sha512-zTU3DaZaF3Rt9rhN3uBMGQD3dD2/vFQqnvZCDv4dl5iOzq2IZQqTxu90r4E5J+nP70J3ilqVCrbho2eWaeW8Ow==}

  magic-string@0.30.21:
    resolution: {integrity: sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==}

  makeerror@1.0.12:
    resolution: {integrity: sha512-JmqCvUhmt43madlpFzG4BQzG2Z3m6tvQDNKdClZnO3VbIudJYmxsT0FNJMeiB2+JTSlTQTSbU8QdesVmwJcmLg==}

  markdown-it@14.1.1:
    resolution: {integrity: sha512-BuU2qnTti9YKgK5N+IeMubp14ZUKUUw7yeJbkjtosvHiP0AZ5c8IAgEMk79D0eC8F23r4Ac/q8cAIFdm2FtyoA==}
    hasBin: true

  marky@1.3.0:
    resolution: {integrity: sha512-ocnPZQLNpvbedwTy9kNrQEsknEfgvcLMvOtz3sFeWApDq1MXH1TqkCIx58xlpESsfwQOnuBO9beyQuNGzVvuhQ==}

  math-intrinsics@1.1.0:
    resolution: {integrity: sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==}
    engines: {node: '>= 0.4'}

  mdn-data@2.0.14:
    resolution: {integrity: sha512-dn6wd0uw5GsdswPFfsgMp5NSB0/aDe6fK94YJV/AJDYXL6HVLWBsxeq7js7Ad+mU2K9LAlwpk6kN2D5mwCPVow==}

  mdurl@2.0.0:
    resolution: {integrity: sha512-Lf+9+2r+Tdp5wXDXC4PcIBjTDtq4UKjCPMQhKIuzpJNW0b96kVqSwW0bT7FhRSfmAiFYgP+SCRvdrDozfh0U5w==}

  media-typer@1.1.0:
    resolution: {integrity: sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==}
    engines: {node: '>= 0.8'}

  memoize-one@5.2.1:
    resolution: {integrity: sha512-zYiwtZUcYyXKo/np96AGZAckk+FWWsUdJ3cHGGmld7+AhvcWmQyGCYUh1hc4Q/pkOhb65dQR/pqCyK0cOaHz4Q==}

  memoize-one@6.0.0:
    resolution: {integrity: sha512-rkpe71W0N0c0Xz6QD0eJETuWAJGnJ9afsl1srmwPrI+yBCkge5EycXXbYRyvL29zZVUWQCY7InPRCv3GDXuZNw==}

  merge-descriptors@2.0.0:
    resolution: {integrity: sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==}
    engines: {node: '>=18'}

  merge-options@3.0.4:
    resolution: {integrity: sha512-2Sug1+knBjkaMsMgf1ctR1Ujx+Ayku4EdJN4Z+C2+JzoeF7A3OZ9KM2GY0CpQS51NR61LTurMJrRKPhSs3ZRTQ==}
    engines: {node: '>=10'}

  merge-stream@2.0.0:
    resolution: {integrity: sha512-abv/qOcuPfk3URPfDzmZU1LKmuw8kT+0nIHvKrKgFrwifol/doWcdA4ZqsWQ8ENrFKkd67Mfpo/LovbIUsbt3w==}

  merge2@1.4.1:
    resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
    engines: {node: '>= 8'}

  metro-babel-transformer@0.83.3:
    resolution: {integrity: sha512-1vxlvj2yY24ES1O5RsSIvg4a4WeL7PFXgKOHvXTXiW0deLvQr28ExXj6LjwCCDZ4YZLhq6HddLpZnX4dEdSq5g==}
    engines: {node: '>=20.19.4'}

  metro-babel-transformer@0.83.7:
    resolution: {integrity: sha512-sBqBkt6kNut/88bv+Ucvm4yqdPetbvAEsHzi3MAgJEifOSYYzX5Z5Kgw3TFOrwf/mHJTOBG2ONlaMHoyfP15TA==}
    engines: {node: '>=20.19.4'}

  metro-cache-key@0.83.3:
    resolution: {integrity: sha512-59ZO049jKzSmvBmG/B5bZ6/dztP0ilp0o988nc6dpaDsU05Cl1c/lRf+yx8m9WW/JVgbmfO5MziBU559XjI5Zw==}
    engines: {node: '>=20.19.4'}

  metro-cache-key@0.83.7:
    resolution: {integrity: sha512-W1c2Nmx8MiJTJt+eWhMO08z9VKi3kZOaz99IYGdqeqDgY9j+yZjXl62rUav4Di0heZfh4/n2s722PqRL1OODeg==}
    engines: {node: '>=20.19.4'}

  metro-cache@0.83.3:
    resolution: {integrity: sha512-3jo65X515mQJvKqK3vWRblxDEcgY55Sk3w4xa6LlfEXgQ9g1WgMh9m4qVZVwgcHoLy0a2HENTPCCX4Pk6s8c8Q==}
    engines: {node: '>=20.19.4'}

  metro-cache@0.83.7:
    resolution: {integrity: sha512-E9SRePXQ1Zvlj79VcOk57q7VC7rMHMFQ+jhmPHBiq+dJ0bJB5BL87lWZF6oh5X76Cci5tpDuQNaDwwuSCToEeg==}
    engines: {node: '>=20.19.4'}

  metro-config@0.83.3:
    resolution: {integrity: sha512-mTel7ipT0yNjKILIan04bkJkuCzUUkm2SeEaTads8VfEecCh+ltXchdq6DovXJqzQAXuR2P9cxZB47Lg4klriA==}
    engines: {node: '>=20.19.4'}

  metro-config@0.83.7:
    resolution: {integrity: sha512-83mjWFbFOt2GeJ6pFIum5mSnc1uTsZJAtD8o4ej0s4NVsYsA7fB+pHvTfHhFrpeMONaobu2riKavkPei05Er/Q==}
    engines: {node: '>=20.19.4'}

  metro-core@0.83.3:
    resolution: {integrity: sha512-M+X59lm7oBmJZamc96usuF1kusd5YimqG/q97g4Ac7slnJ3YiGglW5CsOlicTR5EWf8MQFxxjDoB6ytTqRe8Hw==}
    engines: {node: '>=20.19.4'}

  metro-core@0.83.7:
    resolution: {integrity: sha512-6yn3w1wnltT6RQl7p7YES2l95ArC+mWrOssEiH8p5/DDrJS65/szf9LsC9JrBv8c5DdvSY3V3f0GRYg0Ox7hCg==}
    engines: {node: '>=20.19.4'}

  metro-file-map@0.83.3:
    resolution: {integrity: sha512-jg5AcyE0Q9Xbbu/4NAwwZkmQn7doJCKGW0SLeSJmzNB9Z24jBe0AL2PHNMy4eu0JiKtNWHz9IiONGZWq7hjVTA==}
    engines: {node: '>=20.19.4'}

  metro-file-map@0.83.7:
    resolution: {integrity: sha512-+j0F1m+FQYVAQ6syf+mwhIPV5GoFQrkInX8bppuc50IzNsZbMrp8R5H/Sx/K2daQ3YEa9F/XwkeZT8gzJfgeCw==}
    engines: {node: '>=20.19.4'}

  metro-minify-terser@0.83.3:
    resolution: {integrity: sha512-O2BmfWj6FSfzBLrNCXt/rr2VYZdX5i6444QJU0fFoc7Ljg+Q+iqebwE3K0eTvkI6TRjELsXk1cjU+fXwAR4OjQ==}
    engines: {node: '>=20.19.4'}

  metro-minify-terser@0.83.7:
    resolution: {integrity: sha512-MfJar2IS4tBRuLb9svwb0Gu5l9BsH+pcRm8eGcEi/wy8MzZinfinh5dFLt2nWkocnulIgtGB5NkFDdbXqMXKhQ==}
    engines: {node: '>=20.19.4'}

  metro-resolver@0.83.3:
    resolution: {integrity: sha512-0js+zwI5flFxb1ktmR///bxHYg7OLpRpWZlBBruYG8OKYxeMP7SV0xQ/o/hUelrEMdK4LJzqVtHAhBm25LVfAQ==}
    engines: {node: '>=20.19.4'}

  metro-resolver@0.83.7:
    resolution: {integrity: sha512-WSJIENlMcoSsuz66IfBHOkgfp3KJt2UW2TnEHPf1b8pIG2eEXNOVmo2+03A0H17WY2XGXWgxL0CG7FAopqgB1A==}
    engines: {node: '>=20.19.4'}

  metro-runtime@0.83.3:
    resolution: {integrity: sha512-JHCJb9ebr9rfJ+LcssFYA2x1qPYuSD/bbePupIGhpMrsla7RCwC/VL3yJ9cSU+nUhU4c9Ixxy8tBta+JbDeZWw==}
    engines: {node: '>=20.19.4'}

  metro-runtime@0.83.7:
    resolution: {integrity: sha512-9GKkJURaB2iyYoEExKnedzAHzxmKtSi+k0tsZUvMoU27tBZJElchYt7JH/Ai/XzYAI9lCAaV7u5HZSI8J5Z+wQ==}
    engines: {node: '>=20.19.4'}

  metro-source-map@0.83.3:
    resolution: {integrity: sha512-xkC3qwUBh2psVZgVavo8+r2C9Igkk3DibiOXSAht1aYRRcztEZNFtAMtfSB7sdO2iFMx2Mlyu++cBxz/fhdzQg==}
    engines: {node: '>=20.19.4'}

  metro-source-map@0.83.7:
    resolution: {integrity: sha512-JgA1h7oc1a1jydBe1GhVFsUoMYo3wLPk7oRA32rjlDsq+sP2JLt9x2p2lWbNSxTm/u8NV4VRid3hvEJgcX8tKw==}
    engines: {node: '>=20.19.4'}

  metro-symbolicate@0.83.3:
    resolution: {integrity: sha512-F/YChgKd6KbFK3eUR5HdUsfBqVsanf5lNTwFd4Ca7uuxnHgBC3kR/Hba/RGkenR3pZaGNp5Bu9ZqqP52Wyhomw==}
    engines: {node: '>=20.19.4'}
    hasBin: true

  metro-symbolicate@0.83.7:
    resolution: {integrity: sha512-g4suyxw20WOHWI680c+Kq4wC/NF+Hx5pRH9afrMp+sMTxqLeKcPR1Xf4wMhsjlbvx7LbIREdke6q928jEjvJWw==}
    engines: {node: '>=20.19.4'}
    hasBin: true

  metro-transform-plugins@0.83.3:
    resolution: {integrity: sha512-eRGoKJU6jmqOakBMH5kUB7VitEWiNrDzBHpYbkBXW7C5fUGeOd2CyqrosEzbMK5VMiZYyOcNFEphvxk3OXey2A==}
    engines: {node: '>=20.19.4'}

  metro-transform-plugins@0.83.7:
    resolution: {integrity: sha512-Ss0FpBiZDjX2kwhukMDl5sNdYK8T/06IPqxNE4H6PTlRlfs9q11cef13c/xESY/Pm4VCkp1yJUZO3kXzvMxQFA==}
    engines: {node: '>=20.19.4'}

  metro-transform-worker@0.83.3:
    resolution: {integrity: sha512-Ztekew9t/gOIMZX1tvJOgX7KlSLL5kWykl0Iwu2cL2vKMKVALRl1hysyhUw0vjpAvLFx+Kfq9VLjnHIkW32fPA==}
    engines: {node: '>=20.19.4'}

  metro-transform-worker@0.83.7:
    resolution: {integrity: sha512-UegCo7ygB2fT64mRK2nbAjQVJ1zSwIIHy8d96jJv2nKZFDaViYBiughEdu5HM/Ceq0WN3LZrZk3zhl9aoiLYFw==}
    engines: {node: '>=20.19.4'}

  metro@0.83.3:
    resolution: {integrity: sha512-+rP+/GieOzkt97hSJ0MrPOuAH/jpaS21ZDvL9DJ35QYRDlQcwzcvUlGUf79AnQxq/2NPiS/AULhhM4TKutIt8Q==}
    engines: {node: '>=20.19.4'}
    hasBin: true

  metro@0.83.7:
    resolution: {integrity: sha512-SPaPEyvTsTmd0LpT7RaZciQyDw2i/JB7+iY9L5VfBo72+psescFxBqpI1TL9dnL+pmnfkU+l/J1mEEGLeF65EQ==}
    engines: {node: '>=20.19.4'}
    hasBin: true

  micromatch@4.0.8:
    resolution: {integrity: sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==}
    engines: {node: '>=8.6'}

  mime-db@1.52.0:
    resolution: {integrity: sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==}
    engines: {node: '>= 0.6'}

  mime-db@1.54.0:
    resolution: {integrity: sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==}
    engines: {node: '>= 0.6'}

  mime-types@2.1.35:
    resolution: {integrity: sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==}
    engines: {node: '>= 0.6'}

  mime-types@3.0.2:
    resolution: {integrity: sha512-Lbgzdk0h4juoQ9fCKXW4by0UJqj+nOOrI9MJ1sSj4nI8aI2eo1qmvQEie4VD1glsS250n15LsWsYtCugiStS5A==}
    engines: {node: '>=18'}

  mime@1.6.0:
    resolution: {integrity: sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==}
    engines: {node: '>=4'}
    hasBin: true

  mimic-fn@1.2.0:
    resolution: {integrity: sha512-jf84uxzwiuiIVKiOLpfYk7N46TSy8ubTonmneY9vrpHNAnp0QBt2BxWV9dO3/j+BoVAb+a5G6YDPW3M5HOdMWQ==}
    engines: {node: '>=4'}

  mimic-response@1.0.1:
    resolution: {integrity: sha512-j5EctnkH7amfV/q5Hgmoal1g2QHFJRraOtmx0JpIqkxhBhI/lJSl1nMpQ45hVarwNETOoWEimndZ4QK0RHxuxQ==}
    engines: {node: '>=4'}

  mimic-response@3.1.0:
    resolution: {integrity: sha512-z0yWI+4FDrrweS8Zmt4Ej5HdJmky15+L2e6Wgn3+iK5fWzb6T3fhNFq2+MeTRb064c6Wr4N/wv0DzQTjNzHNGQ==}
    engines: {node: '>=10'}

  minimatch@10.2.5:
    resolution: {integrity: sha512-MULkVLfKGYDFYejP07QOurDLLQpcjk7Fw+7jXS2R2czRQzR56yHRveU5NDJEOviH+hETZKSkIk5c+T23GjFUMg==}
    engines: {node: 18 || 20 || >=22}

  minimatch@3.1.5:
    resolution: {integrity: sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==}

  minimatch@9.0.9:
    resolution: {integrity: sha512-OBwBN9AL4dqmETlpS2zasx+vTeWclWzkblfZk7KTA5j3jeOONz/tRCnZomUyvNg83wL5Zv9Ss6HMJXAgL8R2Yg==}
    engines: {node: '>=16 || 14 >=14.17'}

  minimist@1.2.8:
    resolution: {integrity: sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==}

  minipass@7.1.3:
    resolution: {integrity: sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A==}
    engines: {node: '>=16 || 14 >=14.17'}

  minizlib@3.1.0:
    resolution: {integrity: sha512-KZxYo1BUkWD2TVFLr0MQoM8vUUigWD3LlD83a/75BqC+4qE0Hb1Vo5v1FgcfaNXvfXzr+5EhQ6ing/CaBijTlw==}
    engines: {node: '>= 18'}

  mkdirp@1.0.4:
    resolution: {integrity: sha512-vVqVZQyf3WLx2Shd0qJ9xuvqgAyKPLAiqITEtqW0oIUjzo3PePDd6fW9iFz30ef7Ysp/oiWqbhszeGWW2T6Gzw==}
    engines: {node: '>=10'}
    hasBin: true

  modern-screenshot@4.7.0:
    resolution: {integrity: sha512-9YxN+ddPSMMlhylOv25VHzXrl9u67QRxoh7+SEewGtgUw7t6hHTrjptSDJUSne9oG4Xk/h2cwG15nIt4Hc9ujg==}

  motion-dom@12.38.0:
    resolution: {integrity: sha512-pdkHLD8QYRp8VfiNLb8xIBJis1byQ9gPT3Jnh2jqfFtAsWUA3dEepDlsWe/xMpO8McV+VdpKVcp+E+TGJEtOoA==}

  motion-utils@12.36.0:
    resolution: {integrity: sha512-eHWisygbiwVvf6PZ1vhaHCLamvkSbPIeAYxWUuL3a2PD/TROgE7FvfHWTIH4vMl798QLfMw15nRqIaRDXTlYRg==}

  ms@2.0.0:
    resolution: {integrity: sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==}

  ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}

  mz@2.7.0:
    resolution: {integrity: sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==}

  nanoid@3.3.12:
    resolution: {integrity: sha512-ZB9RH/39qpq5Vu6Y+NmUaFhQR6pp+M2Xt76XBnEwDaGcVAqhlvxrl3B2bKS5D3NH3QR76v3aSrKaF/Kiy7lEtQ==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true

  negotiator@0.6.3:
    resolution: {integrity: sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==}
    engines: {node: '>= 0.6'}

  negotiator@0.6.4:
    resolution: {integrity: sha512-myRT3DiWPHqho5PrJaIRyaMv2kgYf0mUVgBNOYMuCH5Ki1yEiQaf/ZJuQ62nvpc44wL5WDbTX7yGJi1Neevw8w==}
    engines: {node: '>= 0.6'}

  negotiator@1.0.0:
    resolution: {integrity: sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==}
    engines: {node: '>= 0.6'}

  nested-error-stacks@2.0.1:
    resolution: {integrity: sha512-SrQrok4CATudVzBS7coSz26QRSmlK9TzzoFbeKfcPBUFPjcQM9Rqvr/DlJkOrwI/0KcgvMub1n1g5Jt9EgRn4A==}

  next-themes@0.4.6:
    resolution: {integrity: sha512-pZvgD5L0IEvX5/9GWyHMf3m8BKiVQwsCMHfoFosXtXBMnaS0ZnIJ9ST4b4NqLVKDEm8QBxoNNGNaBv2JNF6XNA==}
    peerDependencies:
      react: ^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc
      react-dom: ^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc

  node-fetch@2.7.0:
    resolution: {integrity: sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==}
    engines: {node: 4.x || >=6.0.0}
    peerDependencies:
      encoding: ^0.1.0
    peerDependenciesMeta:
      encoding:
        optional: true

  node-forge@1.4.0:
    resolution: {integrity: sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==}
    engines: {node: '>= 6.13.0'}

  node-int64@0.4.0:
    resolution: {integrity: sha512-O5lz91xSOeoXP6DulyHfllpq+Eg00MWitZIbtPfoSEvqIHdl5gfcY6hYzDWnj0qD5tz52PI08u9qUvSVeUBeHw==}

  node-releases@2.0.38:
    resolution: {integrity: sha512-3qT/88Y3FbH/Kx4szpQQ4HzUbVrHPKTLVpVocKiLfoYvw9XSGOX2FmD2d6DrXbVYyAQTF2HeF6My8jmzx7/CRw==}

  normalize-path@3.0.0:
    resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
    engines: {node: '>=0.10.0'}

  normalize-url@6.1.0:
    resolution: {integrity: sha512-DlL+XwOy3NxAQ8xuC0okPgK46iuVNAK01YN7RueYBqqFeGsBjV9XmCAzAdgt+667bCl5kPh9EqKKDwnaPG1I7A==}
    engines: {node: '>=10'}

  npm-package-arg@11.0.3:
    resolution: {integrity: sha512-sHGJy8sOC1YraBywpzQlIKBE4pBbGbiF95U6Auspzyem956E0+FtDtsx1ZxlOJkQCZ1AFXAY/yuvtFYrOxF+Bw==}
    engines: {node: ^16.14.0 || >=18.0.0}

  npm-run-path@6.0.0:
    resolution: {integrity: sha512-9qny7Z9DsQU8Ou39ERsPU4OZQlSTP47ShQzuKZ6PRXpYLtIFgl/DEBYEXKlvcEa+9tHVcK8CF81Y2V72qaZhWA==}
    engines: {node: '>=18'}

  nth-check@2.1.1:
    resolution: {integrity: sha512-lqjrjmaOoAnWfMmBPL+XNnynZh2+swxiX3WUE0s4yEHI6m+AwrK2UZOimIRl3X/4QctVqS8AiZjFqyOGrMXb/w==}

  nullthrows@1.1.1:
    resolution: {integrity: sha512-2vPPEi+Z7WqML2jZYddDIfy5Dqb0r2fze2zTxNNknZaFpVHU3mFB3R+DWeJWGVx0ecvttSGlJTI+WG+8Z4cDWw==}

  ob1@0.83.3:
    resolution: {integrity: sha512-egUxXCDwoWG06NGCS5s5AdcpnumHKJlfd3HH06P3m9TEMwwScfcY35wpQxbm9oHof+dM/lVH9Rfyu1elTVelSA==}
    engines: {node: '>=20.19.4'}

  ob1@0.83.7:
    resolution: {integrity: sha512-9M5kpuOLyTPogMtZiQUIxdAZxl7Dxs6tVBbJErSumsqGMuhVSoUbkfeZ3XNPpLpwBBtqY5QDUzGwggLHX3slQg==}
    engines: {node: '>=20.19.4'}

  object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}

  object-inspect@1.13.4:
    resolution: {integrity: sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==}
    engines: {node: '>= 0.4'}

  on-exit-leak-free@2.1.2:
    resolution: {integrity: sha512-0eJJY6hXLGf1udHwfNftBqH+g73EU4B504nZeKpz1sYRKafAghwxEJunB2O7rDZkL4PGfsMVnTXZ2EjibbqcsA==}
    engines: {node: '>=14.0.0'}

  on-finished@2.3.0:
    resolution: {integrity: sha512-ikqdkGAAyf/X/gPhXGvfgAytDZtDbr+bkNUJ0N9h5MI/dmdgCs3l6hoHrcUv41sRKew3jIwrp4qQDXiK99Utww==}
    engines: {node: '>= 0.8'}

  on-finished@2.4.1:
    resolution: {integrity: sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==}
    engines: {node: '>= 0.8'}

  on-headers@1.1.0:
    resolution: {integrity: sha512-737ZY3yNnXy37FHkQxPzt4UZ2UWPWiCZWLvFZ4fu5cueciegX0zGPnrlY6bwRg4FdQOe9YU8MkmJwGhoMybl8A==}
    engines: {node: '>= 0.8'}

  once@1.4.0:
    resolution: {integrity: sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==}

  onetime@2.0.1:
    resolution: {integrity: sha512-oyyPpiMaKARvvcgip+JV+7zci5L8D1W9RZIz2l1o08AM3pfspitVWnPt3mzHcBPp12oYMTy0pqrFs/C+m3EwsQ==}
    engines: {node: '>=4'}

  open@7.4.2:
    resolution: {integrity: sha512-MVHddDVweXZF3awtlAS+6pgKLlm/JgxZ90+/NBurBoQctVOOB/zDdVjcyPzQ+0laDGbsWgrRkflI65sQeOgT9Q==}
    engines: {node: '>=8'}

  open@8.4.2:
    resolution: {integrity: sha512-7x81NCL719oNbsq/3mh+hVrAWmFuEYUqrq/Iw3kUzH8ReypT9QQ0BLoJS7/G9k6N81XjW4qHWtjWwe/9eLy1EQ==}
    engines: {node: '>=12'}

  openai@6.38.0:
    resolution: {integrity: sha512-AoMplt2UalrpgUDMh3L09QWjNRlgJPipclQvA6sYAaeF6nHNBMgmikAZGmcYLn8on4d9sQY9Q8bOLfrBS7Lc8g==}
    hasBin: true
    peerDependencies:
      ws: ^8.18.0
      zod: ^3.25 || ^4.0
    peerDependenciesMeta:
      ws:
        optional: true
      zod:
        optional: true

  ora@3.4.0:
    resolution: {integrity: sha512-eNwHudNbO1folBP3JsZ19v9azXWtQZjICdr3Q0TDPIaeBQ3mXLrh54wM+er0+hSp+dWKf+Z8KM58CYzEyIYxYg==}
    engines: {node: '>=6'}

  orval@8.9.1:
    resolution: {integrity: sha512-o9hgALCr3mCXOWxfct4IrsmlNtURt1iwDx9TecbPT5pwoXZMRpdT6W8/ED78NY0ZNnKs6L00QRNLN1SOArnU+w==}
    engines: {node: '>=22.18.0'}
    hasBin: true
    peerDependencies:
      prettier: '>=3.0.0'
    peerDependenciesMeta:
      prettier:
        optional: true

  p-cancelable@2.1.1:
    resolution: {integrity: sha512-BZOr3nRQHOntUjTrH8+Lh54smKHoHyur8We1V8DSMVrl5A2malOOwuJRnKRDjSnkoeBh4at6BwEnb5I7Jl31wg==}
    engines: {node: '>=8'}

  p-limit@2.3.0:
    resolution: {integrity: sha512-//88mFWSJx8lxCzwdAABTJL2MyWB12+eIY7MDL2SqLmAkeKU9qxRvWuSyTjm3FUmpBEMuFfckAIqEaVGUDxb6w==}
    engines: {node: '>=6'}

  p-limit@3.1.0:
    resolution: {integrity: sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==}
    engines: {node: '>=10'}

  p-limit@4.0.0:
    resolution: {integrity: sha512-5b0R4txpzjPWVw/cXXUResoD4hb6U/x9BH08L7nw+GN1sezDzPdxeRvpc9c433fZhBan/wusjbCsqwqm4EIBIQ==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}

  p-limit@7.3.0:
    resolution: {integrity: sha512-7cIXg/Z0M5WZRblrsOla88S4wAK+zOQQWeBYfV3qJuJXMr+LnbYjaadrFaS0JILfEDPVqHyKnZ1Z/1d6J9VVUw==}
    engines: {node: '>=20'}

  p-locate@4.1.0:
    resolution: {integrity: sha512-R79ZZ/0wAxKGu3oYMlz8jy/kbhsNrS7SKZ7PxEHBgJ5+F2mtFW2fK2cOtBh1cHYkQsbzFV7I+EoRKe6Yt0oK7A==}
    engines: {node: '>=8'}

  p-locate@6.0.0:
    resolution: {integrity: sha512-wPrq66Llhl7/4AGC6I+cqxT07LhXvWL08LNXz1fENOw0Ap4sRZZ/gZpTTJ5jpurzzzfS2W/Ge9BY3LgLjCShcw==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}

  p-retry@7.1.1:
    resolution: {integrity: sha512-J5ApzjyRkkf601HpEeykoiCvzHQjWxPAHhyjFcEUP2SWq0+35NKh8TLhpLw+Dkq5TZBFvUM6UigdE9hIVYTl5w==}
    engines: {node: '>=20'}

  p-try@2.2.0:
    resolution: {integrity: sha512-R4nPAVTAU0B9D35/Gk3uJf/7XYbQcyohSKdvAxIRSNghFl4e71hVoGnBNQz9cWaXxO2I10KTC+3jMdvvoKw6dQ==}
    engines: {node: '>=6'}

  parse-ms@4.0.0:
    resolution: {integrity: sha512-TXfryirbmq34y8QBwgqCVLi+8oA3oWx2eAnSn62ITyEhEYaWRlVZ2DvMM9eZbMs/RfxPu/PK/aBLyGj4IrqMHw==}
    engines: {node: '>=18'}

  parse-png@2.1.0:
    resolution: {integrity: sha512-Nt/a5SfCLiTnQAjx3fHlqp8hRgTL3z7kTQZzvIMS9uCAepnCyjpdEc6M/sz69WqMBdaDBw9sF1F1UaHROYzGkQ==}
    engines: {node: '>=10'}

  parseurl@1.3.3:
    resolution: {integrity: sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==}
    engines: {node: '>= 0.8'}

  path-exists@4.0.0:
    resolution: {integrity: sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==}
    engines: {node: '>=8'}

  path-is-absolute@1.0.1:
    resolution: {integrity: sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==}
    engines: {node: '>=0.10.0'}

  path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}

  path-key@4.0.0:
    resolution: {integrity: sha512-haREypq7xkM7ErfgIyA0z+Bj4AGKlMSdlQE2jvJo6huWD1EdkKYV+G/T4nq0YEF2vgTT8kqMFKo1uHn950r4SQ==}
    engines: {node: '>=12'}

  path-parse@1.0.7:
    resolution: {integrity: sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==}

  path-scurry@2.0.2:
    resolution: {integrity: sha512-3O/iVVsJAPsOnpwWIeD+d6z/7PmqApyQePUtCndjatj/9I5LylHvt5qluFaBT3I5h3r1ejfR056c+FCv+NnNXg==}
    engines: {node: 18 || 20 || >=22}

  path-to-regexp@8.4.2:
    resolution: {integrity: sha512-qRcuIdP69NPm4qbACK+aDogI5CBDMi1jKe0ry5rSQJz8JVLsC7jV8XpiJjGRLLol3N+R5ihGYcrPLTno6pAdBA==}

  pathe@2.0.3:
    resolution: {integrity: sha512-WUjGcAqP1gQacoQe+OBJsFA7Ld4DyXuUIjZ5cc75cLHvJ7dtNsTugphxIADwspS+AraAUePCKrSVtPLFj/F88w==}

  pg-cloudflare@1.3.0:
    resolution: {integrity: sha512-6lswVVSztmHiRtD6I8hw4qP/nDm1EJbKMRhf3HCYaqud7frGysPv7FYJ5noZQdhQtN2xJnimfMtvQq21pdbzyQ==}

  pg-connection-string@2.12.0:
    resolution: {integrity: sha512-U7qg+bpswf3Cs5xLzRqbXbQl85ng0mfSV/J0nnA31MCLgvEaAo7CIhmeyrmJpOr7o+zm0rXK+hNnT5l9RHkCkQ==}

  pg-int8@1.0.1:
    resolution: {integrity: sha512-WCtabS6t3c8SkpDBUlb1kjOs7l66xsGdKpIPZsg4wR+B3+u9UAum2odSsF9tnvxg80h4ZxLWMy4pRjOsFIqQpw==}
    engines: {node: '>=4.0.0'}

  pg-pool@3.13.0:
    resolution: {integrity: sha512-gB+R+Xud1gLFuRD/QgOIgGOBE2KCQPaPwkzBBGC9oG69pHTkhQeIuejVIk3/cnDyX39av2AxomQiyPT13WKHQA==}
    peerDependencies:
      pg: '>=8.0'

  pg-protocol@1.13.0:
    resolution: {integrity: sha512-zzdvXfS6v89r6v7OcFCHfHlyG/wvry1ALxZo4LqgUoy7W9xhBDMaqOuMiF3qEV45VqsN6rdlcehHrfDtlCPc8w==}

  pg-types@2.2.0:
    resolution: {integrity: sha512-qTAAlrEsl8s4OiEQY69wDvcMIdQN6wdz5ojQiOy6YRMuynxenON0O5oCpJI6lshc6scgAY8qvJ2On/p+CXY0GA==}
    engines: {node: '>=4'}

  pg@8.20.0:
    resolution: {integrity: sha512-ldhMxz2r8fl/6QkXnBD3CR9/xg694oT6DZQ2s6c/RI28OjtSOpxnPrUCGOBJ46RCUxcWdx3p6kw/xnDHjKvaRA==}
    engines: {node: '>= 16.0.0'}
    peerDependencies:
      pg-native: '>=3.0.1'
    peerDependenciesMeta:
      pg-native:
        optional: true

  pgpass@1.0.5:
    resolution: {integrity: sha512-FdW9r/jQZhSeohs1Z3sI1yxFQNFvMcnmfuj4WBMUTxOrAyLMaTcE1aAMBiTlbMNaXvBCQuVi0R7hd8udDSP7ug==}

  picocolors@1.1.1:
    resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}

  picomatch@2.3.2:
    resolution: {integrity: sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==}
    engines: {node: '>=8.6'}

  picomatch@3.0.2:
    resolution: {integrity: sha512-cfDHL6LStTEKlNilboNtobT/kEa30PtAf2Q1OgszfrG/rpVl1xaFWT9ktfkS306GmHgmnad1Sw4wabhlvFtsTw==}
    engines: {node: '>=10'}

  picomatch@4.0.4:
    resolution: {integrity: sha512-QP88BAKvMam/3NxH6vj2o21R6MjxZUAd6nlwAS/pnGvN9IVLocLHxGYIzFhg6fUQ+5th6P4dv4eW9jX3DSIj7A==}
    engines: {node: '>=12'}

  pino-abstract-transport@2.0.0:
    resolution: {integrity: sha512-F63x5tizV6WCh4R6RHyi2Ml+M70DNRXt/+HANowMflpgGFMAym/VKm6G7ZOQRjqN7XbGxK1Lg9t6ZrtzOaivMw==}

  pino-abstract-transport@3.0.0:
    resolution: {integrity: sha512-wlfUczU+n7Hy/Ha5j9a/gZNy7We5+cXp8YL+X+PG8S0KXxw7n/JXA3c46Y0zQznIJ83URJiwy7Lh56WLokNuxg==}

  pino-http@10.5.0:
    resolution: {integrity: sha512-hD91XjgaKkSsdn8P7LaebrNzhGTdB086W3pyPihX0EzGPjq5uBJBXo4N5guqNaK6mUjg9aubMF7wDViYek9dRA==}

  pino-pretty@13.1.3:
    resolution: {integrity: sha512-ttXRkkOz6WWC95KeY9+xxWL6AtImwbyMHrL1mSwqwW9u+vLp/WIElvHvCSDg0xO/Dzrggz1zv3rN5ovTRVowKg==}
    hasBin: true

  pino-std-serializers@7.1.0:
    resolution: {integrity: sha512-BndPH67/JxGExRgiX1dX0w1FvZck5Wa4aal9198SrRhZjH3GxKQUKIBnYJTdj2HDN3UQAS06HlfcSbQj2OHmaw==}

  pino@9.14.0:
    resolution: {integrity: sha512-8OEwKp5juEvb/MjpIc4hjqfgCNysrS94RIOMXYvpYCdm/jglrKEiAYmiumbmGhCvs+IcInsphYDFwqrjr7398w==}
    hasBin: true

  pirates@4.0.7:
    resolution: {integrity: sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA==}
    engines: {node: '>= 6'}

  plist@3.1.1:
    resolution: {integrity: sha512-ZIfcLJC+7E7FBFnDxm9MPmt7D+DidyQ26lewieO75AdhA2ayMtsJSES0iWzqJQbcVRSrTufQoy0DR94xHue0oA==}
    engines: {node: '>=10.4.0'}

  pngjs@3.4.0:
    resolution: {integrity: sha512-NCrCHhWmnQklfH4MtJMRjZ2a8c80qXeMlQMv2uVp9ISJMTt562SbGd6n2oq0PaPgKm7Z6pL9E2UlLIhC+SHL3w==}
    engines: {node: '>=4.0.0'}

  postcss-value-parser@4.2.0:
    resolution: {integrity: sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==}

  postcss@8.4.49:
    resolution: {integrity: sha512-OCVPnIObs4N29kxTjzLfUryOkvZEq+pf8jTF0lg8E7uETuWHA+v7j3c/xJmiqpX450191LlmZfUKkXxkTry7nA==}
    engines: {node: ^10 || ^12 || >=14}

  postcss@8.5.14:
    resolution: {integrity: sha512-SoSL4+OSEtR99LHFZQiJLkT59C5B1amGO1NzTwj7TT1qCUgUO6hxOvzkOYxD+vMrXBM3XJIKzokoERdqQq/Zmg==}
    engines: {node: ^10 || ^12 || >=14}

  postgres-array@2.0.0:
    resolution: {integrity: sha512-VpZrUqU5A69eQyW2c5CA1jtLecCsN2U/bD6VilrFDWq5+5UIEVO7nazS3TEcHf1zuPYO/sqGvUvW62g86RXZuA==}
    engines: {node: '>=4'}

  postgres-bytea@1.0.1:
    resolution: {integrity: sha512-5+5HqXnsZPE65IJZSMkZtURARZelel2oXUEO8rH83VS/hxH5vv1uHquPg5wZs8yMAfdv971IU+kcPUczi7NVBQ==}
    engines: {node: '>=0.10.0'}

  postgres-date@1.0.7:
    resolution: {integrity: sha512-suDmjLVQg78nMK2UZ454hAG+OAW+HQPZ6n++TNDUX+L0+uUlLywnoxJKDou51Zm+zTCjrCl0Nq6J9C5hP9vK/Q==}
    engines: {node: '>=0.10.0'}

  postgres-interval@1.2.0:
    resolution: {integrity: sha512-9ZhXKM/rw350N1ovuWHbGxnGh/SNJ4cnxHiM0rxE4VN41wsg8P8zWn9hv/buK00RP4WvlOyr/RBDiptyxVbkZQ==}
    engines: {node: '>=0.10.0'}

  prettier@3.8.3:
    resolution: {integrity: sha512-7igPTM53cGHMW8xWuVTydi2KO233VFiTNyF5hLJqpilHfmn8C8gPf+PS7dUT64YcXFbiMGZxS9pCSxL/Dxm/Jw==}
    engines: {node: '>=14'}
    hasBin: true

  pretty-bytes@5.6.0:
    resolution: {integrity: sha512-FFw039TmrBqFK8ma/7OL3sDz/VytdtJr044/QUJtH0wK9lb9jLq9tJyIxUwtQJHwar2BqtiA4iCWSwo9JLkzFg==}
    engines: {node: '>=6'}

  pretty-format@29.7.0:
    resolution: {integrity: sha512-Pdlw/oPxN+aXdmM9R00JVC9WVFoCLTKJvDVLgmJ+qAffBMxsV85l/Lu7sNx4zSzPyoL2euImuEwHhOXdEgNFZQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  pretty-ms@9.3.0:
    resolution: {integrity: sha512-gjVS5hOP+M3wMm5nmNOucbIrqudzs9v/57bWRHQWLYklXqoXKrVfYW2W9+glfGsqtPgpiz5WwyEEB+ksXIx3gQ==}
    engines: {node: '>=18'}

  proc-log@4.2.0:
    resolution: {integrity: sha512-g8+OnU/L2v+wyiVK+D5fA34J7EH8jZ8DDlvwhRCMxmMj7UCBvxiO1mGeN+36JXIKF4zevU4kRBd8lVgG9vLelA==}
    engines: {node: ^14.17.0 || ^16.13.0 || >=18.0.0}

  process-warning@5.0.0:
    resolution: {integrity: sha512-a39t9ApHNx2L4+HBnQKqxxHNs1r7KF+Intd8Q/g1bUh6q0WIp9voPXJ/x0j+ZL45KF1pJd9+q2jLIRMfvEshkA==}

  progress@2.0.3:
    resolution: {integrity: sha512-7PiHtLll5LdnKIMw100I+8xJXR5gW2QwWYkT6iJva0bXitZKa/XMrSbdmg3r2Xnaidz9Qumd0VPaMrZlF9V9sA==}
    engines: {node: '>=0.4.0'}

  promise@7.3.1:
    resolution: {integrity: sha512-nolQXZ/4L+bP/UGlkfaIujX9BKxGwmQ9OT4mOt5yvy8iK1h3wqTEJCijzGANTCCl9nWjY41juyAn2K3Q1hLLTg==}

  promise@8.3.0:
    resolution: {integrity: sha512-rZPNPKTOYVNEEKFaq1HqTgOwZD+4/YHS5ukLzQCypkj+OkYx7iv0mA91lJlpPPZ8vMau3IIGj5Qlwrx+8iiSmg==}

  prompts@2.4.2:
    resolution: {integrity: sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==}
    engines: {node: '>= 6'}

  prop-types@15.8.1:
    resolution: {integrity: sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==}

  proxy-addr@2.0.7:
    resolution: {integrity: sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==}
    engines: {node: '>= 0.10'}

  pump@3.0.4:
    resolution: {integrity: sha512-VS7sjc6KR7e1ukRFhQSY5LM2uBWAUPiOPa/A3mkKmiMwSmRFUITt0xuj+/lesgnCv+dPIEYlkzrcyXgquIHMcA==}

  punycode.js@2.3.1:
    resolution: {integrity: sha512-uxFIHU0YlHYhDQtV4R9J6a52SLx28BCjT+4ieh7IGbgwVJWO+km431c4yRlREUAsAmt/uMjQUyQHNEPf0M39CA==}
    engines: {node: '>=6'}

  punycode@2.3.1:
    resolution: {integrity: sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==}
    engines: {node: '>=6'}

  qrcode-terminal@0.11.0:
    resolution: {integrity: sha512-Uu7ii+FQy4Qf82G4xu7ShHhjhGahEpCWc3x8UavY3CTcWV+ufmmCtwkr7ZKsX42jdL0kr1B5FKUeqJvAn51jzQ==}
    hasBin: true

  qs@6.15.1:
    resolution: {integrity: sha512-6YHEFRL9mfgcAvql/XhwTvf5jKcOiiupt2FiJxHkiX1z4j7WL8J/jRHYLluORvc1XxB5rV20KoeK00gVJamspg==}
    engines: {node: '>=0.6'}

  query-string@7.1.3:
    resolution: {integrity: sha512-hh2WYhq4fi8+b+/2Kg9CEge4fDPvHS534aOOvOZeQ3+Vf2mCFsaFBYj0i+iXcAq6I9Vzp5fjMFBlONvayDC1qg==}
    engines: {node: '>=6'}

  queue-microtask@1.2.3:
    resolution: {integrity: sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==}

  queue@6.0.2:
    resolution: {integrity: sha512-iHZWu+q3IdFZFX36ro/lKBkSvfkztY5Y7HMiPlOUjhupPcG2JMfst2KKEpu5XndviX/3UhFbRngUPNKtgvtZiA==}

  quick-format-unescaped@4.0.4:
    resolution: {integrity: sha512-tYC1Q1hgyRuHgloV/YXs2w15unPVh8qfu/qCTfhTYamaw7fyhumKa2yGpdSo87vY32rIclj+4fWYQXUMs9EHvg==}

  quick-lru@5.1.1:
    resolution: {integrity: sha512-WuyALRjWPDGtt/wzJiadO5AXY+8hZ80hVpe6MyivgraREW751X3SbhRvG3eLKOYN+8VEvqLcf3wdnt44Z4S4SA==}
    engines: {node: '>=10'}

  range-parser@1.2.1:
    resolution: {integrity: sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==}
    engines: {node: '>= 0.6'}

  raw-body@3.0.2:
    resolution: {integrity: sha512-K5zQjDllxWkf7Z5xJdV0/B0WTNqx6vxG70zJE4N0kBs4LovmEYWJzQGxC9bS9RAKu3bgM40lrd5zoLJ12MQ5BA==}
    engines: {node: '>= 0.10'}

  rc@1.2.8:
    resolution: {integrity: sha512-y3bGgqKj3QBdxLbLkomlohkvsA8gdAiUQlSBJnBhfn+BPxg4bc62d8TcBW15wavDfgexCgccckhcZvywyQYPOw==}
    hasBin: true

  react-day-picker@9.14.0:
    resolution: {integrity: sha512-tBaoDWjPwe0M5pGrum4H0SR6Lyk+BO9oHnp9JbKpGKW2mlraNPgP9BMfsg5pWpwrssARmeqk7YBl2oXutZTaHA==}
    engines: {node: '>=18'}
    peerDependencies:
      react: '>=16.8.0'

  react-devtools-core@6.1.5:
    resolution: {integrity: sha512-ePrwPfxAnB+7hgnEr8vpKxL9cmnp7F322t8oqcPshbIQQhDKgFDW4tjhF2wjVbdXF9O/nyuy3sQWd9JGpiLPvA==}

  react-dom@19.1.0:
    resolution: {integrity: sha512-Xs1hdnE+DyKgeHJeJznQmYMIBG3TKIHJJT95Q58nHLSrElKlGQqDTR2HQ9fx5CN/Gk6Vh/kupBTDLU11/nDk/g==}
    peerDependencies:
      react: ^19.1.0

  react-fast-compare@3.2.2:
    resolution: {integrity: sha512-nsO+KSNgo1SbJqJEYRE9ERzo7YtYbou/OqjSQKxV7jcKox7+usiUVZOAC+XnDOABXggQTno0Y1CpVnuWEc1boQ==}

  react-freeze@1.0.4:
    resolution: {integrity: sha512-r4F0Sec0BLxWicc7HEyo2x3/2icUTrRmDjaaRyzzn+7aDyFZliszMDOgLVwSnQnYENOlL1o569Ze2HZefk8clA==}
    engines: {node: '>=10'}
    peerDependencies:
      react: '>=17.0.0'

  react-hook-form@7.75.0:
    resolution: {integrity: sha512-Ovv94H+0p3sJ7B9B5QxPuCP1u8V/cHuVGyH55cSwodYDtoJwK+fqk3vjfIgSX59I2U/bU4z0nRJ9HMLpNiWEmw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^16.8.0 || ^17 || ^18 || ^19

  react-is@16.13.1:
    resolution: {integrity: sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==}

  react-is@18.3.1:
    resolution: {integrity: sha512-/LLMVyas0ljjAtoYiPqYiL8VWXzUUdThrmU5+n20DZv+a+ClRoevUzw5JxU+Ieh5/c87ytoTBV9G1FiKfNJdmg==}

  react-is@19.2.6:
    resolution: {integrity: sha512-XjBR15BhXuylgWGuslhDKqlSayuqvqBX91BP8pauG8kd1zY8kotkNWbXksTCNRarse4kuGbe2kIY05ARtwNIvw==}

  react-native-gesture-handler@2.28.0:
    resolution: {integrity: sha512-0msfJ1vRxXKVgTgvL+1ZOoYw3/0z1R+Ked0+udoJhyplC2jbVKIJ8Z1bzWdpQRCV3QcQ87Op0zJVE5DhKK2A0A==}
    peerDependencies:
      react: '*'
      react-native: '*'

  react-native-is-edge-to-edge@1.3.1:
    resolution: {integrity: sha512-NIXU/iT5+ORyCc7p0z2nnlkouYKX425vuU1OEm6bMMtWWR9yvb+Xg5AZmImTKoF9abxCPqrKC3rOZsKzUYgYZA==}
    peerDependencies:
      react: '*'
      react-native: '*'

  react-native-keyboard-controller@1.18.5:
    resolution: {integrity: sha512-wbYN6Tcu3G5a05dhRYBgjgd74KqoYWuUmroLpigRg9cXy5uYo7prTMIvMgvLtARQtUF7BOtFggUnzgoBOgk0TQ==}
    peerDependencies:
      react: '*'
      react-native: '*'
      react-native-reanimated: '>=3.0.0'

  react-native-reanimated@4.1.7:
    resolution: {integrity: sha512-Q4H6xA3Tn7QL0/E/KjI86I1KK4tcf+ErRE04LH34Etka2oVQhW6oXQ+Q8ZcDCVxiWp5vgbBH6XcH8BOo4w/Rhg==}
    peerDependencies:
      react: '*'
      react-native: 0.78 - 0.82
      react-native-worklets: 0.5 - 0.8

  react-native-safe-area-context@5.6.2:
    resolution: {integrity: sha512-4XGqMNj5qjUTYywJqpdWZ9IG8jgkS3h06sfVjfw5yZQZfWnRFXczi0GnYyFyCc2EBps/qFmoCH8fez//WumdVg==}
    peerDependencies:
      react: '*'
      react-native: '*'

  react-native-screens@4.16.0:
    resolution: {integrity: sha512-yIAyh7F/9uWkOzCi1/2FqvNvK6Wb9Y1+Kzn16SuGfN9YFJDTbwlzGRvePCNTOX0recpLQF3kc2FmvMUhyTCH1Q==}
    peerDependencies:
      react: '*'
      react-native: '*'

  react-native-svg@15.12.1:
    resolution: {integrity: sha512-vCuZJDf8a5aNC2dlMovEv4Z0jjEUET53lm/iILFnFewa15b4atjVxU6Wirm6O9y6dEsdjDZVD7Q3QM4T1wlI8g==}
    peerDependencies:
      react: '*'
      react-native: '*'

  react-native-web@0.21.2:
    resolution: {integrity: sha512-SO2t9/17zM4iEnFvlu2DA9jqNbzNhoUP+AItkoCOyFmDMOhUnBBznBDCYN92fGdfAkfQlWzPoez6+zLxFNsZEg==}
    peerDependencies:
      react: ^18.0.0 || ^19.0.0
      react-dom: ^18.0.0 || ^19.0.0

  react-native-worklets@0.5.1:
    resolution: {integrity: sha512-lJG6Uk9YuojjEX/tQrCbcbmpdLCSFxDK1rJlkDhgqkVi1KZzG7cdcBFQRqyNOOzR9Y0CXNuldmtWTGOyM0k0+w==}
    peerDependencies:
      '@babel/core': ^7.0.0-0
      react: '*'
      react-native: '*'

  react-native@0.81.5:
    resolution: {integrity: sha512-1w+/oSjEXZjMqsIvmkCRsOc8UBYv163bTWKTI8+1mxztvQPhCRYGTvZ/PL1w16xXHneIj/SLGfxWg2GWN2uexw==}
    engines: {node: '>= 20.19.4'}
    hasBin: true
    peerDependencies:
      '@types/react': ^19.1.0
      react: ^19.1.0
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-refresh@0.14.2:
    resolution: {integrity: sha512-jCvmsr+1IUSMUyzOkRcvnVbX3ZYC6g9TDrDbFuFmRDq7PD4yaGbLKNQL6k2jnArV8hjYxh7hVhAZB6s9HDGpZA==}
    engines: {node: '>=0.10.0'}

  react-refresh@0.18.0:
    resolution: {integrity: sha512-QgT5//D3jfjJb6Gsjxv0Slpj23ip+HtOpnNgnb2S5zU3CB26G/IDPGoy4RJB42wzFE46DRsstbW6tKHoKbhAxw==}
    engines: {node: '>=0.10.0'}

  react-remove-scroll-bar@2.3.8:
    resolution: {integrity: sha512-9r+yi9+mgU33AKcj6IbT9oRCO78WriSj6t/cF8DWBZJ9aOGPOTEDvdUDz1FwKim7QXWwmHqtdHnRJfhAxEG46Q==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-remove-scroll@2.7.2:
    resolution: {integrity: sha512-Iqb9NjCCTt6Hf+vOdNIZGdTiH1QSqr27H/Ek9sv/a97gfueI/5h1s3yRi1nngzMUaOOToin5dI1dXKdXiF+u0Q==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-resizable-panels@2.1.9:
    resolution: {integrity: sha512-z77+X08YDIrgAes4jl8xhnUu1LNIRp4+E7cv4xHmLOxxUPO/ML7PSrE813b90vj7xvQ1lcf7g2uA9GeMZonjhQ==}
    peerDependencies:
      react: ^16.14.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^16.14.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  react-smooth@4.0.4:
    resolution: {integrity: sha512-gnGKTpYwqL0Iii09gHobNolvX4Kiq4PKx6eWBCYYix+8cdw+cGo3do906l1NBPKkSWx1DghC1dlWG9L2uGd61Q==}
    peerDependencies:
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
      react-dom: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  react-style-singleton@2.2.3:
    resolution: {integrity: sha512-b6jSvxvVnyptAiLjbkWLE/lOnR4lfTtDAl+eUC7RZy+QQWc6wRzIV2CE6xBuMmDxc2qIihtDCZD5NPOFl7fRBQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-transition-group@4.4.5:
    resolution: {integrity: sha512-pZcd1MCJoiKiBR2NRxeCRg13uCXbydPnmB4EOeRrY7480qNWO8IIgQG6zlDkm6uRMsURXPuKq0GWtiM59a5Q6g==}
    peerDependencies:
      react: '>=16.6.0'
      react-dom: '>=16.6.0'

  react@19.1.0:
    resolution: {integrity: sha512-FS+XFBNvn3GTAWq26joslQgWNoFu08F4kl0J4CgdNKADkdSGXQyTCnKteIAJy96Br6YbpEU1LSzV5dYtjMkMDg==}
    engines: {node: '>=0.10.0'}

  readdirp@4.1.2:
    resolution: {integrity: sha512-GDhwkLfywWL2s6vEjyhri+eXmfH6j1L7JE27WhqLeYzoh/A3DBaYGEj2H/HFZCn/kMfim73FXxEJTw06WtxQwg==}
    engines: {node: '>= 14.18.0'}

  readdirp@5.0.0:
    resolution: {integrity: sha512-9u/XQ1pvrQtYyMpZe7DXKv2p5CNvyVwzUB6uhLAnQwHMSgKMBR62lc7AHljaeteeHXn11XTAaLLUVZYVZyuRBQ==}
    engines: {node: '>= 20.19.0'}

  real-require@0.2.0:
    resolution: {integrity: sha512-57frrGM/OCTLqLOAh0mhVA9VBMHd+9U7Zb2THMGdBUoZVOtGbJzjxsYGDJ3A9AYYCP4hn6y1TVbaOfzWtm5GFg==}
    engines: {node: '>= 12.13.0'}

  recharts-scale@0.4.5:
    resolution: {integrity: sha512-kivNFO+0OcUNu7jQquLXAxz1FIwZj8nrj+YkOKc5694NbjCvcT6aSZiIzNzd2Kul4o4rTto8QVR9lMNtxD4G1w==}

  recharts@2.15.4:
    resolution: {integrity: sha512-UT/q6fwS3c1dHbXv2uFgYJ9BMFHu3fwnd7AYZaEQhXuYQ4hgsxLvsUXzGdKeZrW5xopzDCvuA2N41WJ88I7zIw==}
    engines: {node: '>=14'}
    peerDependencies:
      react: ^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
      react-dom: ^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  regenerate-unicode-properties@10.2.2:
    resolution: {integrity: sha512-m03P+zhBeQd1RGnYxrGyDAPpWX/epKirLrp8e3qevZdVkKtnCrjjWczIbYc8+xd6vcTStVlqfycTx1KR4LOr0g==}
    engines: {node: '>=4'}

  regenerate@1.4.2:
    resolution: {integrity: sha512-zrceR/XhGYU/d/opr2EKO7aRHUeiBI8qjtfHqADTwZd6Szfy16la6kqD0MIUs5z5hx6AaKa+PixpPrR289+I0A==}

  regenerator-runtime@0.13.11:
    resolution: {integrity: sha512-kY1AZVr2Ra+t+piVaJ4gxaFaReZVH40AKNo7UCX6W+dEwBo/2oZJzqfuN1qLq1oL45o56cPaTXELwrTh8Fpggg==}

  regexpu-core@6.4.0:
    resolution: {integrity: sha512-0ghuzq67LI9bLXpOX/ISfve/Mq33a4aFRzoQYhnnok1JOFpmE/A2TBGkNVenOGEeSBCjIiWcc6MVOG5HEQv0sA==}
    engines: {node: '>=4'}

  regjsgen@0.8.0:
    resolution: {integrity: sha512-RvwtGe3d7LvWiDQXeQw8p5asZUmfU1G/l6WbUXeHta7Y2PEIvBTwH6E2EfmYUK8pxcxEdEmaomqyp0vZZ7C+3Q==}

  regjsparser@0.13.1:
    resolution: {integrity: sha512-dLsljMd9sqwRkby8zhO1gSg3PnJIBFid8f4CQj/sXx+7cKx+E7u0PKhZ+U4wmhx7EfmtvnA318oVaIkAB1lRJw==}
    hasBin: true

  remeda@2.34.0:
    resolution: {integrity: sha512-zL4cEPkLHxwmlDRPyvJZjojpG5M5HXrDiABNKof+dq7kkuyQttP6NrF2uJB0DKIU09K8cTq+sQDlbo2r7mdR5Q==}

  require-directory@2.1.1:
    resolution: {integrity: sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==}
    engines: {node: '>=0.10.0'}

  require-from-string@2.0.2:
    resolution: {integrity: sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==}
    engines: {node: '>=0.10.0'}

  requireg@0.2.2:
    resolution: {integrity: sha512-nYzyjnFcPNGR3lx9lwPPPnuQxv6JWEZd2Ci0u9opN7N5zUEPIhY/GbL3vMGOr2UXwEg9WwSyV9X9Y/kLFgPsOg==}
    engines: {node: '>= 4.0.0'}

  resolve-alpn@1.2.1:
    resolution: {integrity: sha512-0a1F4l73/ZFZOakJnQ3FvkJ2+gSTQWz/r2KE5OdDY0TxPm5h4GkqkWWfM47T7HsbnOtcJVEF4epCVy6u7Q3K+g==}

  resolve-from@5.0.0:
    resolution: {integrity: sha512-qYg9KP24dD5qka9J47d0aVky0N+b4fTU89LN9iDnjB5waksiC49rvMB0PrUJQGoTmH50XPiqOvAjDfaijGxYZw==}
    engines: {node: '>=8'}

  resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}

  resolve-workspace-root@2.0.1:
    resolution: {integrity: sha512-nR23LHAvaI6aHtMg6RWoaHpdR4D881Nydkzi2CixINyg9T00KgaJdJI6Vwty+Ps8WLxZHuxsS0BseWjxSA4C+w==}

  resolve.exports@2.0.3:
    resolution: {integrity: sha512-OcXjMsGdhL4XnbShKpAcSqPMzQoYkYyhbEaeSko47MjRP9NfEQMhZkXL1DoFlt9LWQn4YttrdnV6X2OiyzBi+A==}
    engines: {node: '>=10'}

  resolve@1.22.12:
    resolution: {integrity: sha512-TyeJ1zif53BPfHootBGwPRYT1RUt6oGWsaQr8UyZW/eAm9bKoijtvruSDEmZHm92CwS9nj7/fWttqPCgzep8CA==}
    engines: {node: '>= 0.4'}
    hasBin: true

  resolve@1.7.1:
    resolution: {integrity: sha512-c7rwLofp8g1U+h1KNyHL/jicrKg1Ek4q+Lr33AL65uZTinUZHe30D5HlyN5V9NW0JX1D5dXQ4jqW5l7Sy/kGfw==}

  responselike@2.0.1:
    resolution: {integrity: sha512-4gl03wn3hj1HP3yzgdI7d3lCkF95F21Pz4BPGvKHinyQzALR5CapwC8yIi0Rh58DEMQ/SguC03wFj2k0M/mHhw==}

  restore-cursor@2.0.0:
    resolution: {integrity: sha512-6IzJLuGi4+R14vwagDHX+JrXmPVtPpn4mffDJ1UdR7/Edm87fl6yi8mMBIVvFtJaNTUvjughmW4hwLhRG7gC1Q==}
    engines: {node: '>=4'}

  reusify@1.1.0:
    resolution: {integrity: sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}

  rimraf@3.0.2:
    resolution: {integrity: sha512-JZkJMZkAGFFPP2YqXZXPbMlMBgsxzE8ILs4lMIX/2o0L9UBw9O/Y3o6wFw/i9YLapcUJWwqbi3kdxIPdC62TIA==}
    deprecated: Rimraf versions prior to v4 are no longer supported
    hasBin: true

  rollup@4.60.3:
    resolution: {integrity: sha512-pAQK9HalE84QSm4Po3EmWIZPd3FnjkShVkiMlz1iligWYkWQ7wHYd1PF/T7QZ5TVSD6uSTon5gBVMSM4JfBV+A==}
    engines: {node: '>=18.0.0', npm: '>=8.0.0'}
    hasBin: true

  router@2.2.0:
    resolution: {integrity: sha512-nLTrUKm2UyiL7rlhapu/Zl45FwNgkZGaCpZbIHajDYgwlJCOzLSk+cIPAnsEqV955GjILJnKbdQC1nVPz+gAYQ==}
    engines: {node: '>= 18'}

  run-parallel@1.2.0:
    resolution: {integrity: sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==}

  safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}

  safe-stable-stringify@2.5.0:
    resolution: {integrity: sha512-b3rppTKm9T+PsVCBEOUR46GWI7fdOs00VKZ1+9c1EWDaDMvjQc6tUwuFyIprgGgTcWoVHSKrU8H31ZHA2e0RHA==}
    engines: {node: '>=10'}

  safer-buffer@2.1.2:
    resolution: {integrity: sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==}

  sax@1.6.0:
    resolution: {integrity: sha512-6R3J5M4AcbtLUdZmRv2SygeVaM7IhrLXu9BmnOGmmACak8fiUtOsYNWUS4uK7upbmHIBbLBeFeI//477BKLBzA==}
    engines: {node: '>=11.0.0'}

  scheduler@0.26.0:
    resolution: {integrity: sha512-NlHwttCI/l5gCPR3D1nNXtWABUmBwvZpEQiD4IXSbIDq8BzLIK/7Ir5gTFSGZDUu37K5cMNp0hFtzO38sC7gWA==}

  secure-json-parse@4.1.0:
    resolution: {integrity: sha512-l4KnYfEyqYJxDwlNVyRfO2E4NTHfMKAWdUuA8J0yve2Dz/E/PdBepY03RvyJpssIpRFwJoCD55wA+mEDs6ByWA==}

  semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true

  semver@7.6.3:
    resolution: {integrity: sha512-oVekP1cKtI+CTDvHWYFUcMtsK/00wmAEfyqKfNdARm8u1wNVhSgaX7A8d4UuIlUI5e84iEwOhs7ZPYRmzU9U6A==}
    engines: {node: '>=10'}
    hasBin: true

  semver@7.7.2:
    resolution: {integrity: sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==}
    engines: {node: '>=10'}
    hasBin: true

  semver@7.8.0:
    resolution: {integrity: sha512-AcM7dV/5ul4EekoQ29Agm5vri8JNqRyj39o0qpX6vDF2GZrtutZl5RwgD1XnZjiTAfncsJhMI48QQH3sN87YNA==}
    engines: {node: '>=10'}
    hasBin: true

  send@0.19.2:
    resolution: {integrity: sha512-VMbMxbDeehAxpOtWJXlcUS5E8iXh6QmN+BkRX1GARS3wRaXEEgzCcB10gTQazO42tpNIya8xIyNx8fll1OFPrg==}
    engines: {node: '>= 0.8.0'}

  send@1.2.1:
    resolution: {integrity: sha512-1gnZf7DFcoIcajTjTwjwuDjzuz4PPcY2StKPlsGAQ1+YH20IRVrBaXSWmdjowTJ6u8Rc01PoYOGHXfP1mYcZNQ==}
    engines: {node: '>= 18'}

  serialize-error@2.1.0:
    resolution: {integrity: sha512-ghgmKt5o4Tly5yEG/UJp8qTd0AN7Xalw4XBtDEKP655B699qMEtra1WlXeE6WIvdEG481JvRxULKsInq/iNysw==}
    engines: {node: '>=0.10.0'}

  serve-static@1.16.3:
    resolution: {integrity: sha512-x0RTqQel6g5SY7Lg6ZreMmsOzncHFU7nhnRWkKgWuMTu5NN0DR5oruckMqRvacAN9d5w6ARnRBXl9xhDCgfMeA==}
    engines: {node: '>= 0.8.0'}

  serve-static@2.2.1:
    resolution: {integrity: sha512-xRXBn0pPqQTVQiC8wyQrKs2MOlX24zQ0POGaj0kultvoOCstBQM5yvOhAVSUwOMjQtTvsPWoNCHfPGwaaQJhTw==}
    engines: {node: '>= 18'}

  server-only@0.0.1:
    resolution: {integrity: sha512-qepMx2JxAa5jjfzxG79yPPq+8BuFToHd1hm7kI+Z4zAq1ftQiP7HcxMhDDItrbtwVeLg/cY2JnKnrcFkmiswNA==}

  setimmediate@1.0.5:
    resolution: {integrity: sha512-MATJdZp8sLqDl/68LfQmbP8zKPLQNV6BIZoIgrscFDQ+RsvK/BxeDQOgyxKKoh0y/8h3BqVFnCqQ/gd+reiIXA==}

  setprototypeof@1.2.0:
    resolution: {integrity: sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==}

  sf-symbols-typescript@2.2.0:
    resolution: {integrity: sha512-TPbeg0b7ylrswdGCji8FRGFAKuqbpQlLbL8SOle3j1iHSs5Ob5mhvMAxWN2UItOjgALAB5Zp3fmMfj8mbWvXKw==}
    engines: {node: '>=10'}

  shallowequal@1.1.0:
    resolution: {integrity: sha512-y0m1JoUZSlPAjXVtPPW70aZWfIL/dSP7AFkRnniLCrK/8MDKog3TySTBmckD+RObVxH0v4Tox67+F14PdED2oQ==}

  shebang-command@2.0.0:
    resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
    engines: {node: '>=8'}

  shebang-regex@3.0.0:
    resolution: {integrity: sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==}
    engines: {node: '>=8'}

  shell-quote@1.8.3:
    resolution: {integrity: sha512-ObmnIF4hXNg1BqhnHmgbDETF8dLPCggZWBjkQfhZpbszZnYur5DUljTcCHii5LC3J5E0yeO/1LIMyH+UvHQgyw==}
    engines: {node: '>= 0.4'}

  side-channel-list@1.0.1:
    resolution: {integrity: sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==}
    engines: {node: '>= 0.4'}

  side-channel-map@1.0.1:
    resolution: {integrity: sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==}
    engines: {node: '>= 0.4'}

  side-channel-weakmap@1.0.2:
    resolution: {integrity: sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==}
    engines: {node: '>= 0.4'}

  side-channel@1.1.0:
    resolution: {integrity: sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==}
    engines: {node: '>= 0.4'}

  signal-exit@3.0.7:
    resolution: {integrity: sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==}

  signal-exit@4.1.0:
    resolution: {integrity: sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==}
    engines: {node: '>=14'}

  simple-plist@1.3.1:
    resolution: {integrity: sha512-iMSw5i0XseMnrhtIzRb7XpQEXepa9xhWxGUojHBL43SIpQuDQkh3Wpy67ZbDzZVr6EKxvwVChnVpdl8hEVLDiw==}

  simple-swizzle@0.2.4:
    resolution: {integrity: sha512-nAu1WFPQSMNr2Zn9PGSZK9AGn4t/y97lEm+MXTtUDwfP0ksAIX4nO+6ruD9Jwut4C49SB1Ws+fbXsm/yScWOHw==}

  sisteransi@1.0.5:
    resolution: {integrity: sha512-bLGGlR1QxBcynn2d5YmDX4MGjlZvy2MRBDRNHLJ8VI6l6+9FUiyTFNJ0IveOSP0bcXgVDPRcfGqA0pjaqUpfVg==}

  slash@3.0.0:
    resolution: {integrity: sha512-g9Q1haeby36OSStwb4ntCGGGaKsaVSjQ68fBxoQcutl5fS1vuY18H3wSt3jFyFtrkx+Kz0V1G85A4MyAdDMi2Q==}
    engines: {node: '>=8'}

  slash@5.1.0:
    resolution: {integrity: sha512-ZA6oR3T/pEyuqwMgAKT0/hAv8oAXckzbkmR0UkUosQ+Mc4RxGoJkRmwHgHufaenlyAgE1Mxgpdcrf75y6XcnDg==}
    engines: {node: '>=14.16'}

  slugify@1.6.9:
    resolution: {integrity: sha512-vZ7rfeehZui7wQs438JXBckYLkIIdfHOXsaVEUMyS5fHo1483l1bMdo0EDSWYclY0yZKFOipDy4KHuKs6ssvdg==}
    engines: {node: '>=8.0.0'}

  sonic-boom@4.2.1:
    resolution: {integrity: sha512-w6AxtubXa2wTXAUsZMMWERrsIRAdrK0Sc+FUytWvYAhBJLyuI4llrMIC1DtlNSdI99EI86KZum2MMq3EAZlF9Q==}

  sonner@2.0.7:
    resolution: {integrity: sha512-W6ZN4p58k8aDKA4XPcx2hpIQXBRAgyiWVkYhT7CvK6D3iAu7xjvVyhQHg2/iaKJZ1XVJ4r7XuwGL+WGEK37i9w==}
    peerDependencies:
      react: ^18.0.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  source-map-js@1.2.1:
    resolution: {integrity: sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==}
    engines: {node: '>=0.10.0'}

  source-map-support@0.5.21:
    resolution: {integrity: sha512-uBHU3L3czsIyYXKX88fdrGovxdSCoTGDRZ6SYXtSRxLZUzHg5P/66Ht6uoUlHu9EZod+inXhKo3qQgwXUT/y1w==}

  source-map@0.5.7:
    resolution: {integrity: sha512-LbrmJOMUSdEVxIKvdcJzQC+nQhe8FUZQTXQy6+I75skNgn3OoQ0DZA8YnFa7gp8tqtL3KPf1kmo0R5DoApeSGQ==}
    engines: {node: '>=0.10.0'}

  source-map@0.6.1:
    resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
    engines: {node: '>=0.10.0'}

  split-on-first@1.1.0:
    resolution: {integrity: sha512-43ZssAJaMusuKWL8sKUBQXHWOpq8d6CfN/u1p4gUzfJkM05C8rxTmYrkIPTXapZpORA6LkkzcUulJ8FqA7Uudw==}
    engines: {node: '>=6'}

  split2@4.2.0:
    resolution: {integrity: sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==}
    engines: {node: '>= 10.x'}

  sprintf-js@1.0.3:
    resolution: {integrity: sha512-D9cPgkvLlV3t3IzL0D0YLvGA9Ahk4PcvVwUbN0dSGr1aP0Nrt4AEnTUbuGvquEC0mA64Gqt1fzirlRs5ibXx8g==}

  stack-utils@2.0.6:
    resolution: {integrity: sha512-XlkWvfIm6RmsWtNJx+uqtKLS8eqFbxUg0ZzLXqY0caEy9l7hruX8IpiDnjsLavoBgqCCR71TqWO8MaXYheJ3RQ==}
    engines: {node: '>=10'}

  stackframe@1.3.4:
    resolution: {integrity: sha512-oeVtt7eWQS+Na6F//S4kJ2K2VbRlS9D43mAlMyVpVWovy9o+jfgH8O9agzANzaiLjclA0oYzUXEM4PurhSUChw==}

  stacktrace-parser@0.1.11:
    resolution: {integrity: sha512-WjlahMgHmCJpqzU8bIBy4qtsZdU9lRlcZE3Lvyej6t4tuOuv1vk57OW3MBrj6hXBFx/nNoC9MPMTcr5YA7NQbg==}
    engines: {node: '>=6'}

  statuses@1.5.0:
    resolution: {integrity: sha512-OpZ3zP+jT1PI7I8nemJX4AKmAX070ZkYPVWV/AaKTJl+tXCTGyVdC1a4SL8RUQYEwk/f34ZX8UTykN68FwrqAA==}
    engines: {node: '>= 0.6'}

  statuses@2.0.2:
    resolution: {integrity: sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==}
    engines: {node: '>= 0.8'}

  stream-buffers@2.2.0:
    resolution: {integrity: sha512-uyQK/mx5QjHun80FLJTfaWE7JtwfRMKBLkMne6udYOmvH0CawotVa7TfgYHzAnpphn4+TweIx1QKMnRIbipmUg==}
    engines: {node: '>= 0.10.0'}

  strict-uri-encode@2.0.0:
    resolution: {integrity: sha512-QwiXZgpRcKkhTj2Scnn++4PKtWsH0kpzZ62L2R6c/LUVYv7hVnZqcg2+sMuT6R7Jusu1vviK/MFsu6kNJfWlEQ==}
    engines: {node: '>=4'}

  string-argv@0.3.2:
    resolution: {integrity: sha512-aqD2Q0144Z+/RqG52NeHEkZauTAUWJO8c6yTftGJKO3Tja5tUgIfmIl6kExvhtxSDP7fXB6DvzkfMpCd/F3G+Q==}
    engines: {node: '>=0.6.19'}

  string-width@4.2.3:
    resolution: {integrity: sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==}
    engines: {node: '>=8'}

  strip-ansi@5.2.0:
    resolution: {integrity: sha512-DuRs1gKbBqsMKIZlrffwlug8MHkcnpjs5VPmL1PAh+mA30U0DTotfDZ0d2UUsXpPmPmMMJ6W773MaA3J+lbiWA==}
    engines: {node: '>=6'}

  strip-ansi@6.0.1:
    resolution: {integrity: sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==}
    engines: {node: '>=8'}

  strip-final-newline@4.0.0:
    resolution: {integrity: sha512-aulFJcD6YK8V1G7iRB5tigAP4TsHBZZrOV8pjV++zdUwmeV8uzbY7yn6h9MswN62adStNZFuCIx4haBnRuMDaw==}
    engines: {node: '>=18'}

  strip-json-comments@2.0.1:
    resolution: {integrity: sha512-4gB8na07fecVVkOI6Rs4e7T6NOTki5EmL7TUduTs6bu3EdnSycntVJ4re8kgZA+wx9IueI2Y11bfbgwtzuE0KQ==}
    engines: {node: '>=0.10.0'}

  strip-json-comments@5.0.3:
    resolution: {integrity: sha512-1tB5mhVo7U+ETBKNf92xT4hrQa3pm0MZ0PQvuDnWgAAGHDsfp4lPSpiS6psrSiet87wyGPh9ft6wmhOMQ0hDiw==}
    engines: {node: '>=14.16'}

  structured-headers@0.4.1:
    resolution: {integrity: sha512-0MP/Cxx5SzeeZ10p/bZI0S6MpgD+yxAhi1BOQ34jgnMXsCq3j1t6tQnZu+KdlL7dvJTLT3g9xN8tl10TqgFMcg==}

  styleq@0.1.3:
    resolution: {integrity: sha512-3ZUifmCDCQanjeej1f6kyl/BeP/Vae5EYkQ9iJfUm/QwZvlgnZzyflqAsAWYURdtea8Vkvswu2GrC57h3qffcA==}

  sucrase@3.35.1:
    resolution: {integrity: sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw==}
    engines: {node: '>=16 || 14 >=14.17'}
    hasBin: true

  supports-color@5.5.0:
    resolution: {integrity: sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==}
    engines: {node: '>=4'}

  supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}

  supports-color@8.1.1:
    resolution: {integrity: sha512-MpUEN2OodtUzxvKQl72cUF7RQ5EiHsGvSsVG0ia9c5RbWGL2CI4C7EpPS8UTBIplnlzZiNuV56w+FuNxy3ty2Q==}
    engines: {node: '>=10'}

  supports-hyperlinks@2.3.0:
    resolution: {integrity: sha512-RpsAZlpWcDwOPQA22aCH4J0t7L8JmAvsCxfOSEwm7cQs3LshN36QaTkwd70DnBOXDWGssw2eUoc8CaRWT0XunA==}
    engines: {node: '>=8'}

  supports-preserve-symlinks-flag@1.0.0:
    resolution: {integrity: sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==}
    engines: {node: '>= 0.4'}

  tailwind-merge@3.5.0:
    resolution: {integrity: sha512-I8K9wewnVDkL1NTGoqWmVEIlUcB9gFriAEkXkfCjX5ib8ezGxtR3xD7iZIxrfArjEsH7F1CHD4RFUtxefdqV/A==}

  tailwindcss-animate@1.0.7:
    resolution: {integrity: sha512-bl6mpH3T7I3UFxuvDEXLxy/VuFxBk5bbzplh7tXI68mwMokNYd1t9qPBHlnyTwfa4JGC4zP516I1hYYtQ/vspA==}
    peerDependencies:
      tailwindcss: '>=3.0.0 || insiders'

  tailwindcss@4.3.0:
    resolution: {integrity: sha512-y6nxMGB1nMW9R6k96e5gdIFzcfL/gTJRNaqGes1YvkLnPVXzWgbqFF2yLC0T8G774n24cx3Pe8XrKoniCOAH+Q==}

  tapable@2.3.3:
    resolution: {integrity: sha512-uxc/zpqFg6x7C8vOE7lh6Lbda8eEL9zmVm/PLeTPBRhh1xCgdWaQ+J1CUieGpIfm2HdtsUpRv+HshiasBMcc6A==}
    engines: {node: '>=6'}

  tar@7.5.15:
    resolution: {integrity: sha512-dzGK0boVlC4W5QFuQN1EFSl3bIDYsk7Tj40U6eIBnK2k/8ml7TZ5agbI5j5+qnoVcAA+rNtBml8SEiLxZpNqRQ==}
    engines: {node: '>=18'}

  terminal-link@2.1.1:
    resolution: {integrity: sha512-un0FmiRUQNr5PJqy9kP7c40F5BOfpGlYTrxonDChEZB7pzZxRNp/bt+ymiy9/npwXya9KH99nJ/GXFIiUkYGFQ==}
    engines: {node: '>=8'}

  terser@5.47.1:
    resolution: {integrity: sha512-tPbLXTI6ohPASb/1YViL428oEHu6/qv1OxqYnfaonVCFHqx4+wCd95pHrQWsL5X4pl90CTyW9piSAsS2L0VoMw==}
    engines: {node: '>=10'}
    hasBin: true

  test-exclude@6.0.0:
    resolution: {integrity: sha512-cAGWPIyOHU6zlmg88jwm7VRyXnMN7iV68OGAbYDk/Mh/xC/pzVPlQtY6ngoIH/5/tciuhGfvESU8GrHrcxD56w==}
    engines: {node: '>=8'}

  thenify-all@1.6.0:
    resolution: {integrity: sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==}
    engines: {node: '>=0.8'}

  thenify@3.3.1:
    resolution: {integrity: sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==}

  thread-stream@3.1.0:
    resolution: {integrity: sha512-OqyPZ9u96VohAyMfJykzmivOrY2wfMSf3C5TtFJVgN+Hm6aj+voFhlK+kZEIv2FBh1X6Xp3DlnCOfEQ3B2J86A==}

  throat@5.0.0:
    resolution: {integrity: sha512-fcwX4mndzpLQKBS1DVYhGAcYaYt7vsHNIvQV+WXMvnow5cgjPphq5CaayLaGsjRdSCKZFNGt7/GYAuXaNOiYCA==}

  tiny-invariant@1.3.3:
    resolution: {integrity: sha512-+FbBPE1o9QAYvviau/qC5SE3caw21q3xkvWKBtja5vgqOWIHHJ3ioaq1VPfn/Szqctz2bU/oYeKd9/z5BL+PVg==}

  tinyglobby@0.2.16:
    resolution: {integrity: sha512-pn99VhoACYR8nFHhxqix+uvsbXineAasWm5ojXoN8xEwK5Kd3/TrhNn1wByuD52UxWRLy8pu+kRMniEi6Eq9Zg==}
    engines: {node: '>=12.0.0'}

  tmpl@1.0.5:
    resolution: {integrity: sha512-3f0uOEAQwIqGuWW2MVzYg8fV/QNnc/IpuJNG837rLuczAaLVHslWHZQj4IGiEl5Hs3kkbhwL9Ab7Hrsmuj+Smw==}

  to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}

  toidentifier@1.0.1:
    resolution: {integrity: sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==}
    engines: {node: '>=0.6'}

  tr46@0.0.3:
    resolution: {integrity: sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==}

  ts-interface-checker@0.1.13:
    resolution: {integrity: sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==}

  tsconfck@3.1.6:
    resolution: {integrity: sha512-ks6Vjr/jEw0P1gmOVwutM3B7fWxoWBL2KRDb1JfqGVawBmO5UsvmWOQFGHBPl5yxYz4eERr19E6L7NMv+Fej4w==}
    engines: {node: ^18 || >=20}
    hasBin: true
    peerDependencies:
      typescript: ^5.0.0
    peerDependenciesMeta:
      typescript:
        optional: true

  tslib@2.8.1:
    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}

  tsx@4.21.0:
    resolution: {integrity: sha512-5C1sg4USs1lfG0GFb2RLXsdpXqBSEhAaA/0kPL01wxzpMqLILNxIxIOKiILz+cdg/pLnOUxFYOR5yhHU666wbw==}
    engines: {node: '>=18.0.0'}
    hasBin: true

  tw-animate-css@1.4.0:
    resolution: {integrity: sha512-7bziOlRqH0hJx80h/3mbicLW7o8qLsH5+RaLR2t+OHM3D0JlWGODQKQ4cxbK7WlvmUxpcj6Kgu6EKqjrGFe3QQ==}

  type-detect@4.0.8:
    resolution: {integrity: sha512-0fr/mIH1dlO+x7TlcMy+bIDqKPsw/70tVyeHW787goQjhmqaZe10uwLujubK9q9Lg6Fiho1KUKDYz0Z7k7g5/g==}
    engines: {node: '>=4'}

  type-fest@0.21.3:
    resolution: {integrity: sha512-t0rzBq87m3fVcduHDUFhKmyyX+9eo6WQjZvf51Ea/M0Q7+T374Jp1aUiyUl0GKxp8M/OETVHSDvmkyPgvX+X2w==}
    engines: {node: '>=10'}

  type-fest@0.7.1:
    resolution: {integrity: sha512-Ne2YiiGN8bmrmJJEuTWTLJR32nh/JdL1+PSicowtNb0WFpn59GK8/lfD61bVtzguz7b3PBt74nxpv/Pw5po5Rg==}
    engines: {node: '>=8'}

  type-is@2.0.1:
    resolution: {integrity: sha512-OZs6gsjF4vMp32qrCbiVSkrFmXtG/AZhY3t0iAMrMBiAZyV9oALtXO8hsrHbMXF9x6L3grlFuwW2oAz7cav+Gw==}
    engines: {node: '>= 0.6'}

  typedoc-plugin-coverage@4.0.3:
    resolution: {integrity: sha512-baim3wyMkqpX7rBzL/6iZ7wzKJuSr9ffP16RHOsdTUNoHUZeXLIZHSUBtUhXmNHaUNRgfqdmKLBwyggbJjGdeQ==}
    engines: {node: '>= 18'}
    peerDependencies:
      typedoc: 0.28.x

  typedoc-plugin-markdown@4.11.0:
    resolution: {integrity: sha512-2iunh2ALyfyh204OF7h2u0kuQ84xB3jFZtFyUr01nThJkLvR8oGGSSDlyt2gyO4kXhvUxDcVbO0y43+qX+wFbw==}
    engines: {node: '>= 18'}
    peerDependencies:
      typedoc: 0.28.x

  typedoc@0.28.19:
    resolution: {integrity: sha512-wKh+lhdmMFivMlc6vRRcMGXeGEHGU2g8a2CkPTJjJlwRf1iXbimWIPcFolCqe4E0d/FRtGszpIrsp3WLpDB8Pw==}
    engines: {node: '>= 18', pnpm: '>= 10'}
    hasBin: true
    peerDependencies:
      typescript: 5.0.x || 5.1.x || 5.2.x || 5.3.x || 5.4.x || 5.5.x || 5.6.x || 5.7.x || 5.8.x || 5.9.x || 6.0.x

  typescript@5.9.3:
    resolution: {integrity: sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==}
    engines: {node: '>=14.17'}
    hasBin: true

  ua-parser-js@1.0.41:
    resolution: {integrity: sha512-LbBDqdIC5s8iROCUjMbW1f5dJQTEFB1+KO9ogbvlb3nm9n4YHa5p4KTvFPWvh2Hs8gZMBuiB1/8+pdfe/tDPug==}
    hasBin: true

  uc.micro@2.1.0:
    resolution: {integrity: sha512-ARDJmphmdvUk6Glw7y9DQ2bFkKBHwQHLi2lsaH6PPmz/Ka9sFOBsBluozhDltWmnv9u/cF6Rt87znRTPV+yp/A==}

  undici-types@7.19.2:
    resolution: {integrity: sha512-qYVnV5OEm2AW8cJMCpdV20CDyaN3g0AjDlOGf1OW4iaDEx8MwdtChUp4zu4H0VP3nDRF/8RKWH+IPp9uW0YGZg==}

  undici@6.25.0:
    resolution: {integrity: sha512-ZgpWDC5gmNiuY9CnLVXEH8rl50xhRCuLNA97fAUnKi8RRuV4E6KG31pDTsLVUKnohJE0I3XDrTeEydAXRw47xg==}
    engines: {node: '>=18.17'}

  unicode-canonical-property-names-ecmascript@2.0.1:
    resolution: {integrity: sha512-dA8WbNeb2a6oQzAQ55YlT5vQAWGV9WXOsi3SskE3bcCdM0P4SDd+24zS/OCacdRq5BkdsRj9q3Pg6YyQoxIGqg==}
    engines: {node: '>=4'}

  unicode-match-property-ecmascript@2.0.0:
    resolution: {integrity: sha512-5kaZCrbp5mmbz5ulBkDkbY0SsPOjKqVS35VpL9ulMPfSl0J0Xsm+9Evphv9CoIZFwre7aJoa94AY6seMKGVN5Q==}
    engines: {node: '>=4'}

  unicode-match-property-value-ecmascript@2.2.1:
    resolution: {integrity: sha512-JQ84qTuMg4nVkx8ga4A16a1epI9H6uTXAknqxkGF/aFfRLw1xC/Bp24HNLaZhHSkWd3+84t8iXnp1J0kYcZHhg==}
    engines: {node: '>=4'}

  unicode-property-aliases-ecmascript@2.2.0:
    resolution: {integrity: sha512-hpbDzxUY9BFwX+UeBnxv3Sh1q7HFxj48DTmXchNgRa46lO8uj3/1iEn3MiNUYTg1g9ctIqXCCERn8gYZhHC5lQ==}
    engines: {node: '>=4'}

  unicorn-magic@0.3.0:
    resolution: {integrity: sha512-+QBBXBCvifc56fsbuxZQ6Sic3wqqc3WWaqxs58gvJrcOuN83HGTCwz3oS5phzU9LthRNE9VrJCFCLUgHeeFnfA==}
    engines: {node: '>=18'}

  unicorn-magic@0.4.0:
    resolution: {integrity: sha512-wH590V9VNgYH9g3lH9wWjTrUoKsjLF6sGLjhR4sH1LWpLmCOH0Zf7PukhDA8BiS7KHe4oPNkcTHqYkj7SOGUOw==}
    engines: {node: '>=20'}

  universalify@2.0.1:
    resolution: {integrity: sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==}
    engines: {node: '>= 10.0.0'}

  unpipe@1.0.0:
    resolution: {integrity: sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==}
    engines: {node: '>= 0.8'}

  update-browserslist-db@1.2.3:
    resolution: {integrity: sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'

  use-callback-ref@1.3.3:
    resolution: {integrity: sha512-jQL3lRnocaFtu3V00JToYz/4QkNWswxijDaCVNZRiRTO3HQDLsdu1ZtmIUvV4yPp+rvWm5j0y0TG/S61cuijTg==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  use-latest-callback@0.2.6:
    resolution: {integrity: sha512-FvRG9i1HSo0wagmX63Vrm8SnlUU3LMM3WyZkQ76RnslpBrX694AdG4A0zQBx2B3ZifFA0yv/BaEHGBnEax5rZg==}
    peerDependencies:
      react: '>=16.8'

  use-sidecar@1.1.3:
    resolution: {integrity: sha512-Fedw0aZvkhynoPYlA5WXrMCAMm+nSWdZt6lzJQ7Ok8S6Q+VsHmHpRWndVRJ8Be0ZbkfPc5LRYH+5XrzXcEeLRQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  use-sync-external-store@1.6.0:
    resolution: {integrity: sha512-Pp6GSwGP/NrPIrxVFAIkOQeyw8lFenOHijQWkUTrDvrF4ALqylP2C/KCkeS9dpUM3KvYRQhna5vt7IL95+ZQ9w==}
    peerDependencies:
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  utils-merge@1.0.1:
    resolution: {integrity: sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==}
    engines: {node: '>= 0.4.0'}

  uuid@3.4.0:
    resolution: {integrity: sha512-HjSDRw6gZE5JMggctHBcjVak08+KEVhSIiDzFnT9S9aegmp85S/bReBVTb4QTFaRNptJ9kuYaNhnbNEOkbKb/A==}
    deprecated: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
    hasBin: true

  uuid@7.0.3:
    resolution: {integrity: sha512-DPSke0pXhTZgoF/d+WSt2QaKMCFSfx7QegxEWT+JOuHF5aWrKEn0G+ztjuJg/gG8/ItK+rbPCD/yNv8yyih6Cg==}
    deprecated: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
    hasBin: true

  validate-npm-package-name@5.0.1:
    resolution: {integrity: sha512-OljLrQ9SQdOUqTaQxqL5dEfZWrXExyyWsozYlAWFawPVNuD83igl7uJD2RTkNMbniIYgt8l81eCJGIdQF7avLQ==}
    engines: {node: ^14.17.0 || ^16.13.0 || >=18.0.0}

  vary@1.1.2:
    resolution: {integrity: sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==}
    engines: {node: '>= 0.8'}

  vaul@1.1.2:
    resolution: {integrity: sha512-ZFkClGpWyI2WUQjdLJ/BaGuV6AVQiJ3uELGk3OYtP+B6yCO7Cmn9vPFXVJkRaGkOJu3m8bQMgtyzNHixULceQA==}
    peerDependencies:
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc

  victory-vendor@36.9.2:
    resolution: {integrity: sha512-PnpQQMuxlwYdocC8fIJqVXvkeViHYzotI+NJrCuav0ZYFoq912ZHBk3mCeuj+5/VpodOjPe1z0Fk2ihgzlXqjQ==}

  vite@7.3.3:
    resolution: {integrity: sha512-/4XH147Ui7OGTjg3HbdWe5arnZQSbfuRzdr9Ec7TQi5I7R+ir0Rlc9GIvD4v0XZurELqA035KVXJXpR61xhiTA==}
    engines: {node: ^20.19.0 || >=22.12.0}
    hasBin: true
    peerDependencies:
      '@types/node': ^20.19.0 || >=22.12.0
      jiti: '>=1.21.0'
      less: ^4.0.0
      lightningcss: ^1.21.0
      sass: ^1.70.0
      sass-embedded: ^1.70.0
      stylus: '>=0.54.8'
      sugarss: ^5.0.0
      terser: ^5.16.0
      tsx: ^4.8.1
      yaml: ^2.4.2
    peerDependenciesMeta:
      '@types/node':
        optional: true
      jiti:
        optional: true
      less:
        optional: true
      lightningcss:
        optional: true
      sass:
        optional: true
      sass-embedded:
        optional: true
      stylus:
        optional: true
      sugarss:
        optional: true
      terser:
        optional: true
      tsx:
        optional: true
      yaml:
        optional: true

  vlq@1.0.1:
    resolution: {integrity: sha512-gQpnTgkubC6hQgdIcRdYGDSDc+SaujOdyesZQMv6JlfQee/9Mp0Qhnys6WxDWvQnL5WZdT7o2Ul187aSt0Rq+w==}

  walker@1.0.8:
    resolution: {integrity: sha512-ts/8E8l5b7kY0vlWLewOkDXMmPdLcVV4GmOQLyxuSswIJsweeFZtAsMF7k1Nszz+TYBQrlYRmzOnr398y1JemQ==}

  warn-once@0.1.1:
    resolution: {integrity: sha512-VkQZJbO8zVImzYFteBXvBOZEl1qL175WH8VmZcxF2fZAoudNhNDvHi+doCaAEdU2l2vtcIwa2zn0QK5+I1HQ3Q==}

  wcwidth@1.0.1:
    resolution: {integrity: sha512-XHPEwS0q6TaxcvG85+8EYkbiCux2XtWG2mkc47Ng2A77BQu9+DqIOJldST4HgPkuea7dvKSj5VgX3P1d4rW8Tg==}

  webidl-conversions@3.0.1:
    resolution: {integrity: sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==}

  webidl-conversions@5.0.0:
    resolution: {integrity: sha512-VlZwKPCkYKxQgeSbH5EyngOmRp7Ww7I9rQLERETtf5ofd9pGeswWiOtogpEO850jziPRarreGxn5QIiTqpb2wA==}
    engines: {node: '>=8'}

  whatwg-fetch@3.6.20:
    resolution: {integrity: sha512-EqhiFU6daOA8kpjOWTL0olhVOF3i7OrFzSYiGsEMB8GcXS+RrzauAERX65xMeNWVqxA6HXH2m69Z9LaKKdisfg==}

  whatwg-url-without-unicode@8.0.0-3:
    resolution: {integrity: sha512-HoKuzZrUlgpz35YO27XgD28uh/WJH4B0+3ttFqRo//lmq+9T/mIOJ6kqmINI9HpUpz1imRC/nR/lxKpJiv0uig==}
    engines: {node: '>=10'}

  whatwg-url@5.0.0:
    resolution: {integrity: sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==}

  which@2.0.2:
    resolution: {integrity: sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==}
    engines: {node: '>= 8'}
    hasBin: true

  wonka@6.3.6:
    resolution: {integrity: sha512-MXH+6mDHAZ2GuMpgKS055FR6v0xVP3XwquxIMYXgiW+FejHQlMGlvVRZT4qMCxR+bEo/FCtIdKxwej9WV3YQag==}

  wrap-ansi@7.0.0:
    resolution: {integrity: sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==}
    engines: {node: '>=10'}

  wrappy@1.0.2:
    resolution: {integrity: sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==}

  write-file-atomic@4.0.2:
    resolution: {integrity: sha512-7KxauUdBmSdWnmpaGFg+ppNjKF8uNLry8LyzjauQDOVONfFLNKrKvQOxZ/VuTIcS/gge/YNahf5RIIQWTSarlg==}
    engines: {node: ^12.13.0 || ^14.15.0 || >=16.0.0}

  ws@6.2.3:
    resolution: {integrity: sha512-jmTjYU0j60B+vHey6TfR3Z7RD61z/hmxBS3VMSGIrroOWXQEneK1zNuotOUrGyBHQj0yrpsLHPWtigEFd13ndA==}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: ^5.0.2
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true

  ws@7.5.10:
    resolution: {integrity: sha512-+dbF1tHwZpXcbOJdVOkzLDxZP1ailvSxM6ZweXTegylPny803bFhA+vqBYw4s31NSAk4S2Qz+AKXK9a4wkdjcQ==}
    engines: {node: '>=8.3.0'}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: ^5.0.2
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true

  ws@8.20.1:
    resolution: {integrity: sha512-It4dO0K5v//JtTXuPkfEOaI3uUN87iYPnqo/ZzqCoG3g8uhA66QUMs/SrM0YK7/NAu+r4LMh/9dq2A7k+rHs+w==}
    engines: {node: '>=10.0.0'}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: '>=5.0.2'
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true

  xcode@3.0.1:
    resolution: {integrity: sha512-kCz5k7J7XbJtjABOvkc5lJmkiDh8VhjVCGNiqdKCscmVpdVUpEAyXv1xmCLkQJ5dsHqx3IPO4XW+NTDhU/fatA==}
    engines: {node: '>=10.0.0'}

  xml2js@0.6.0:
    resolution: {integrity: sha512-eLTh0kA8uHceqesPqSE+VvO1CDDJWMwlQfB6LuN6T8w6MaDJ8Txm8P7s5cHD0miF0V+GGTZrDQfxPZQVsur33w==}
    engines: {node: '>=4.0.0'}

  xmlbuilder@11.0.1:
    resolution: {integrity: sha512-fDlsI/kFEx7gLvbecc0/ohLG50fugQp8ryHzMTuW9vSa1GJ0XYWKnhsUx7oie3G98+r56aTQIUB4kht42R3JvA==}
    engines: {node: '>=4.0'}

  xmlbuilder@15.1.1:
    resolution: {integrity: sha512-yMqGBqtXyeN1e3TGYvgNgDVZ3j84W4cwkOXQswghol6APgZWaff9lnbvN7MHYJOiXsvGPXtjTYJEiC9J2wv9Eg==}
    engines: {node: '>=8.0'}

  xtend@4.0.2:
    resolution: {integrity: sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==}
    engines: {node: '>=0.4'}

  y18n@5.0.8:
    resolution: {integrity: sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==}
    engines: {node: '>=10'}

  yallist@3.1.1:
    resolution: {integrity: sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==}

  yallist@5.0.0:
    resolution: {integrity: sha512-YgvUTfwqyc7UXVMrB+SImsVYSmTS8X/tSrtdNZMImM+n7+QTriRXyXim0mBrTXNeqzVF0KWGgHPeiyViFFrNDw==}
    engines: {node: '>=18'}

  yaml@1.10.3:
    resolution: {integrity: sha512-vIYeF1u3CjlhAFekPPAk2h/Kv4T3mAkMox5OymRiJQB0spDP10LHvt+K7G9Ny6NuuMAb25/6n1qyUjAcGNf/AA==}
    engines: {node: '>= 6'}

  yaml@2.8.4:
    resolution: {integrity: sha512-ml/JPOj9fOQK8RNnWojA67GbZ0ApXAUlN2UQclwv2eVgTgn7O9gg9o7paZWKMp4g0H3nTLtS9LVzhkpOFIKzog==}
    engines: {node: '>= 14.6'}
    hasBin: true

  yargs-parser@21.1.1:
    resolution: {integrity: sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==}
    engines: {node: '>=12'}

  yargs@17.7.2:
    resolution: {integrity: sha512-7dSzzRQ++CKnNI/krKnYRV7JKKPUXMEh61soaHKg9mrWEhzFWhFnxPxGl+69cD1Ou63C13NUPCnmIcrvqCuM6w==}
    engines: {node: '>=12'}

  yocto-queue@0.1.0:
    resolution: {integrity: sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==}
    engines: {node: '>=10'}

  yocto-queue@1.2.2:
    resolution: {integrity: sha512-4LCcse/U2MHZ63HAJVE+v71o7yOdIe4cZ70Wpf8D/IyjDKYQLV5GD46B+hSTjJsvV5PztjvHoU580EftxjDZFQ==}
    engines: {node: '>=12.20'}

  yoctocolors@2.1.2:
    resolution: {integrity: sha512-CzhO+pFNo8ajLM2d2IW/R93ipy99LWjtwblvC1RsoSUMZgyLbYFr221TnSNT7GjGdYui6P459mw9JH/g/zW2ug==}
    engines: {node: '>=18'}

  zod-validation-error@3.5.4:
    resolution: {integrity: sha512-+hEiRIiPobgyuFlEojnqjJnhFvg4r/i3cqgcm67eehZf/WBaK3g6cD02YU9mtdVxZjv8CzCA9n/Rhrs3yAAvAw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      zod: ^3.24.4

  zod@3.25.76:
    resolution: {integrity: sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==}

snapshots:

  '@0no-co/graphql.web@1.2.0': {}

  '@babel/code-frame@7.10.4':
    dependencies:
      '@babel/highlight': 7.25.9

  '@babel/code-frame@7.29.0':
    dependencies:
      '@babel/helper-validator-identifier': 7.28.5
      js-tokens: 4.0.0
      picocolors: 1.1.1

  '@babel/compat-data@7.29.3': {}

  '@babel/core@7.29.0':
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/helper-compilation-targets': 7.28.6
      '@babel/helper-module-transforms': 7.28.6(@babel/core@7.29.0)
      '@babel/helpers': 7.29.2
      '@babel/parser': 7.29.3
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
      '@jridgewell/remapping': 2.3.5
      convert-source-map: 2.0.0
      debug: 4.4.3
      gensync: 1.0.0-beta.2
      json5: 2.2.3
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  '@babel/generator@7.29.1':
    dependencies:
      '@babel/parser': 7.29.3
      '@babel/types': 7.29.0
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31
      jsesc: 3.1.0

  '@babel/helper-annotate-as-pure@7.27.3':
    dependencies:
      '@babel/types': 7.29.0

  '@babel/helper-compilation-targets@7.28.6':
    dependencies:
      '@babel/compat-data': 7.29.3
      '@babel/helper-validator-option': 7.27.1
      browserslist: 4.28.2
      lru-cache: 5.1.1
      semver: 6.3.1

  '@babel/helper-create-class-features-plugin@7.29.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-member-expression-to-functions': 7.28.5
      '@babel/helper-optimise-call-expression': 7.27.1
      '@babel/helper-replace-supers': 7.28.6(@babel/core@7.29.0)
      '@babel/helper-skip-transparent-expression-wrappers': 7.27.1
      '@babel/traverse': 7.29.0
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-create-regexp-features-plugin@7.28.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      regexpu-core: 6.4.0
      semver: 6.3.1

  '@babel/helper-define-polyfill-provider@0.6.8(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-compilation-targets': 7.28.6
      '@babel/helper-plugin-utils': 7.28.6
      debug: 4.4.3
      lodash.debounce: 4.0.8
      resolve: 1.22.12
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-globals@7.28.0': {}

  '@babel/helper-member-expression-to-functions@7.28.5':
    dependencies:
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-module-imports@7.28.6':
    dependencies:
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-module-transforms@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-module-imports': 7.28.6
      '@babel/helper-validator-identifier': 7.28.5
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-optimise-call-expression@7.27.1':
    dependencies:
      '@babel/types': 7.29.0

  '@babel/helper-plugin-utils@7.28.6': {}

  '@babel/helper-remap-async-to-generator@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-wrap-function': 7.28.6
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-replace-supers@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-member-expression-to-functions': 7.28.5
      '@babel/helper-optimise-call-expression': 7.27.1
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-skip-transparent-expression-wrappers@7.27.1':
    dependencies:
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-string-parser@7.27.1': {}

  '@babel/helper-validator-identifier@7.28.5': {}

  '@babel/helper-validator-option@7.27.1': {}

  '@babel/helper-wrap-function@7.28.6':
    dependencies:
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/helpers@7.29.2':
    dependencies:
      '@babel/template': 7.28.6
      '@babel/types': 7.29.0

  '@babel/highlight@7.25.9':
    dependencies:
      '@babel/helper-validator-identifier': 7.28.5
      chalk: 2.4.2
      js-tokens: 4.0.0
      picocolors: 1.1.1

  '@babel/parser@7.29.3':
    dependencies:
      '@babel/types': 7.29.0

  '@babel/plugin-proposal-decorators@7.29.0(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-create-class-features-plugin': 7.29.3(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/plugin-syntax-decorators': 7.28.6(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-proposal-export-default-from@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-async-generators@7.8.4(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-bigint@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-class-properties@7.12.13(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-class-static-block@7.14.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-decorators@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-dynamic-import@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-export-default-from@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-flow@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-import-attributes@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-import-meta@7.10.4(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-json-strings@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-jsx@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-logical-assignment-operators@7.10.4(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-nullish-coalescing-operator@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-numeric-separator@7.10.4(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-object-rest-spread@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-optional-catch-binding@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-optional-chaining@7.8.3(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-private-property-in-object@7.14.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-top-level-await@7.14.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-syntax-typescript@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-arrow-functions@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-async-generator-functions@7.29.0(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-remap-async-to-generator': 7.27.1(@babel/core@7.29.0)
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-async-to-generator@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-module-imports': 7.28.6
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-remap-async-to-generator': 7.27.1(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-block-scoping@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-class-properties@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-create-class-features-plugin': 7.29.3(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-class-static-block@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-create-class-features-plugin': 7.29.3(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-classes@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-compilation-targets': 7.28.6
      '@babel/helper-globals': 7.28.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-replace-supers': 7.28.6(@babel/core@7.29.0)
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-computed-properties@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/template': 7.28.6

  '@babel/plugin-transform-destructuring@7.28.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-export-namespace-from@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-flow-strip-types@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/plugin-syntax-flow': 7.28.6(@babel/core@7.29.0)

  '@babel/plugin-transform-for-of@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-skip-transparent-expression-wrappers': 7.27.1
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-function-name@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-compilation-targets': 7.28.6
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-literals@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-logical-assignment-operators@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-modules-commonjs@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-module-transforms': 7.28.6(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-named-capturing-groups-regex@7.29.0(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-create-regexp-features-plugin': 7.28.5(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-nullish-coalescing-operator@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-numeric-separator@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-object-rest-spread@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-compilation-targets': 7.28.6
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/plugin-transform-destructuring': 7.28.5(@babel/core@7.29.0)
      '@babel/plugin-transform-parameters': 7.27.7(@babel/core@7.29.0)
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-optional-catch-binding@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-optional-chaining@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-skip-transparent-expression-wrappers': 7.27.1
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-parameters@7.27.7(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-private-methods@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-create-class-features-plugin': 7.29.3(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-private-property-in-object@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-create-class-features-plugin': 7.29.3(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-react-display-name@7.28.0(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-react-jsx-development@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/plugin-transform-react-jsx': 7.28.6(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-react-jsx-self@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-react-jsx-source@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-react-jsx@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-module-imports': 7.28.6
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/plugin-syntax-jsx': 7.28.6(@babel/core@7.29.0)
      '@babel/types': 7.29.0
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-react-pure-annotations@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-regenerator@7.29.0(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-runtime@7.29.0(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-module-imports': 7.28.6
      '@babel/helper-plugin-utils': 7.28.6
      babel-plugin-polyfill-corejs2: 0.4.17(@babel/core@7.29.0)
      babel-plugin-polyfill-corejs3: 0.13.0(@babel/core@7.29.0)
      babel-plugin-polyfill-regenerator: 0.6.8(@babel/core@7.29.0)
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-shorthand-properties@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-spread@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-skip-transparent-expression-wrappers': 7.27.1
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-sticky-regex@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-template-literals@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/plugin-transform-typescript@7.28.6(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-annotate-as-pure': 7.27.3
      '@babel/helper-create-class-features-plugin': 7.29.3(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-skip-transparent-expression-wrappers': 7.27.1
      '@babel/plugin-syntax-typescript': 7.28.6(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  '@babel/plugin-transform-unicode-regex@7.27.1(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-create-regexp-features-plugin': 7.28.5(@babel/core@7.29.0)
      '@babel/helper-plugin-utils': 7.28.6

  '@babel/preset-react@7.28.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-validator-option': 7.27.1
      '@babel/plugin-transform-react-display-name': 7.28.0(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx-development': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-react-pure-annotations': 7.27.1(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  '@babel/preset-typescript@7.28.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
      '@babel/helper-validator-option': 7.27.1
      '@babel/plugin-syntax-jsx': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-modules-commonjs': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-typescript': 7.28.6(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  '@babel/runtime@7.29.2': {}

  '@babel/template@7.28.6':
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/parser': 7.29.3
      '@babel/types': 7.29.0

  '@babel/traverse@7.29.0':
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/helper-globals': 7.28.0
      '@babel/parser': 7.29.3
      '@babel/template': 7.28.6
      '@babel/types': 7.29.0
      debug: 4.4.3
    transitivePeerDependencies:
      - supports-color

  '@babel/types@7.29.0':
    dependencies:
      '@babel/helper-string-parser': 7.27.1
      '@babel/helper-validator-identifier': 7.28.5

  '@commander-js/extra-typings@14.0.0(commander@14.0.3)':
    dependencies:
      commander: 14.0.3

  '@date-fns/tz@1.4.1': {}

  '@drizzle-team/brocli@0.10.2': {}

  '@egjs/hammerjs@2.0.17':
    dependencies:
      '@types/hammerjs': 2.0.46

  '@esbuild/linux-x64@0.27.3':
    optional: true

  '@expo-google-fonts/inter@0.4.2': {}

  '@expo/cli@54.0.23(expo-router@6.0.23)(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(typescript@5.9.3)':
    dependencies:
      '@0no-co/graphql.web': 1.2.0
      '@expo/code-signing-certificates': 0.0.6
      '@expo/config': 12.0.13
      '@expo/config-plugins': 54.0.4
      '@expo/devcert': 1.2.1
      '@expo/env': 2.0.11
      '@expo/image-utils': 0.8.14(typescript@5.9.3)
      '@expo/json-file': 10.0.14
      '@expo/metro': 54.2.0
      '@expo/metro-config': 54.0.15(expo@54.0.34)
      '@expo/osascript': 2.4.3
      '@expo/package-manager': 1.10.5
      '@expo/plist': 0.4.8
      '@expo/prebuild-config': 54.0.8(expo@54.0.34)(typescript@5.9.3)
      '@expo/schema-utils': 0.1.8
      '@expo/spawn-async': 1.8.0
      '@expo/ws-tunnel': 1.0.6
      '@expo/xcpretty': 4.4.4
      '@react-native/dev-middleware': 0.81.5
      '@urql/core': 5.2.0
      '@urql/exchange-retry': 1.3.2
      accepts: 1.3.8
      arg: 5.0.2
      better-opn: 3.0.2
      bplist-creator: 0.1.0
      bplist-parser: 0.3.2
      chalk: 4.1.2
      ci-info: 3.9.0
      compression: 1.8.1
      connect: 3.7.0
      debug: 4.4.3
      env-editor: 0.4.2
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-server: 1.0.6
      freeport-async: 2.0.0
      getenv: 2.0.0
      glob: 13.0.6
      lan-network: 0.1.7
      minimatch: 9.0.9
      node-forge: 1.4.0
      npm-package-arg: 11.0.3
      ora: 3.4.0
      picomatch: 3.0.2
      pretty-bytes: 5.6.0
      pretty-format: 29.7.0
      progress: 2.0.3
      prompts: 2.4.2
      qrcode-terminal: 0.11.0
      require-from-string: 2.0.2
      requireg: 0.2.2
      resolve: 1.22.12
      resolve-from: 5.0.0
      resolve.exports: 2.0.3
      semver: 7.8.0
      send: 0.19.2
      slugify: 1.6.9
      source-map-support: 0.5.21
      stacktrace-parser: 0.1.11
      structured-headers: 0.4.1
      tar: 7.5.15
      terminal-link: 2.1.1
      undici: 6.25.0
      wrap-ansi: 7.0.0
      ws: 8.20.1
    optionalDependencies:
      expo-router: 6.0.23(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(expo-constants@18.0.13)(expo-linking@8.0.12)(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native-gesture-handler@2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    transitivePeerDependencies:
      - bufferutil
      - graphql
      - supports-color
      - typescript
      - utf-8-validate

  '@expo/cli@54.0.24(expo-router@6.0.23)(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(typescript@5.9.3)':
    dependencies:
      '@0no-co/graphql.web': 1.2.0
      '@expo/code-signing-certificates': 0.0.6
      '@expo/config': 12.0.13
      '@expo/config-plugins': 54.0.4
      '@expo/devcert': 1.2.1
      '@expo/env': 2.0.11
      '@expo/image-utils': 0.8.14(typescript@5.9.3)
      '@expo/json-file': 10.0.14
      '@expo/metro': 54.2.0
      '@expo/metro-config': 54.0.15(expo@54.0.34)
      '@expo/osascript': 2.4.3
      '@expo/package-manager': 1.10.5
      '@expo/plist': 0.4.8
      '@expo/prebuild-config': 54.0.8(expo@54.0.34)(typescript@5.9.3)
      '@expo/schema-utils': 0.1.8
      '@expo/spawn-async': 1.8.0
      '@expo/ws-tunnel': 1.0.6
      '@expo/xcpretty': 4.4.4
      '@react-native/dev-middleware': 0.81.5
      '@urql/core': 5.2.0
      '@urql/exchange-retry': 1.3.2
      accepts: 1.3.8
      arg: 5.0.2
      better-opn: 3.0.2
      bplist-creator: 0.1.0
      bplist-parser: 0.3.2
      chalk: 4.1.2
      ci-info: 3.9.0
      compression: 1.8.1
      connect: 3.7.0
      debug: 4.4.3
      env-editor: 0.4.2
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-server: 1.0.6
      freeport-async: 2.0.0
      getenv: 2.0.0
      glob: 13.0.6
      lan-network: 0.2.1
      minimatch: 9.0.9
      node-forge: 1.4.0
      npm-package-arg: 11.0.3
      ora: 3.4.0
      picomatch: 4.0.4
      pretty-bytes: 5.6.0
      pretty-format: 29.7.0
      progress: 2.0.3
      prompts: 2.4.2
      qrcode-terminal: 0.11.0
      require-from-string: 2.0.2
      requireg: 0.2.2
      resolve: 1.22.12
      resolve-from: 5.0.0
      resolve.exports: 2.0.3
      semver: 7.8.0
      send: 0.19.2
      slugify: 1.6.9
      source-map-support: 0.5.21
      stacktrace-parser: 0.1.11
      structured-headers: 0.4.1
      tar: 7.5.15
      terminal-link: 2.1.1
      undici: 6.25.0
      wrap-ansi: 7.0.0
      ws: 8.20.1
    optionalDependencies:
      expo-router: 6.0.23(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(expo-constants@18.0.13)(expo-linking@8.0.12)(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native-gesture-handler@2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    transitivePeerDependencies:
      - bufferutil
      - graphql
      - supports-color
      - typescript
      - utf-8-validate

  '@expo/code-signing-certificates@0.0.6':
    dependencies:
      node-forge: 1.4.0

  '@expo/config-plugins@54.0.4':
    dependencies:
      '@expo/config-types': 54.0.10
      '@expo/json-file': 10.0.14
      '@expo/plist': 0.4.8
      '@expo/sdk-runtime-versions': 1.0.0
      chalk: 4.1.2
      debug: 4.4.3
      getenv: 2.0.0
      glob: 13.0.6
      resolve-from: 5.0.0
      semver: 7.8.0
      slash: 3.0.0
      slugify: 1.6.9
      xcode: 3.0.1
      xml2js: 0.6.0
    transitivePeerDependencies:
      - supports-color

  '@expo/config-types@54.0.10': {}

  '@expo/config@12.0.13':
    dependencies:
      '@babel/code-frame': 7.10.4
      '@expo/config-plugins': 54.0.4
      '@expo/config-types': 54.0.10
      '@expo/json-file': 10.0.14
      deepmerge: 4.3.1
      getenv: 2.0.0
      glob: 13.0.6
      require-from-string: 2.0.2
      resolve-from: 5.0.0
      resolve-workspace-root: 2.0.1
      semver: 7.8.0
      slugify: 1.6.9
      sucrase: 3.35.1
    transitivePeerDependencies:
      - supports-color

  '@expo/devcert@1.2.1':
    dependencies:
      '@expo/sudo-prompt': 9.3.2
      debug: 3.2.7
    transitivePeerDependencies:
      - supports-color

  '@expo/devtools@0.1.8(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      chalk: 4.1.2
    optionalDependencies:
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  '@expo/env@2.0.11':
    dependencies:
      chalk: 4.1.2
      debug: 4.4.3
      dotenv: 16.4.7
      dotenv-expand: 11.0.7
      getenv: 2.0.0
    transitivePeerDependencies:
      - supports-color

  '@expo/fingerprint@0.15.5':
    dependencies:
      '@expo/spawn-async': 1.8.0
      arg: 5.0.2
      chalk: 4.1.2
      debug: 4.4.3
      getenv: 2.0.0
      glob: 13.0.6
      ignore: 5.3.2
      minimatch: 10.2.5
      p-limit: 3.1.0
      resolve-from: 5.0.0
      semver: 7.8.0
    transitivePeerDependencies:
      - supports-color

  '@expo/image-utils@0.8.14(typescript@5.9.3)':
    dependencies:
      '@expo/require-utils': 55.0.5(typescript@5.9.3)
      '@expo/spawn-async': 1.8.0
      chalk: 4.1.2
      getenv: 2.0.0
      jimp-compact: 0.16.1
      parse-png: 2.1.0
      semver: 7.8.0
    transitivePeerDependencies:
      - supports-color
      - typescript

  '@expo/json-file@10.0.14':
    dependencies:
      '@babel/code-frame': 7.29.0
      json5: 2.2.3

  '@expo/metro-config@54.0.15(expo@54.0.34)':
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@expo/config': 12.0.13
      '@expo/env': 2.0.11
      '@expo/json-file': 10.0.14
      '@expo/metro': 54.2.0
      '@expo/spawn-async': 1.8.0
      browserslist: 4.28.2
      chalk: 4.1.2
      debug: 4.4.3
      dotenv: 16.4.7
      dotenv-expand: 11.0.7
      getenv: 2.0.0
      glob: 13.0.6
      hermes-parser: 0.29.1
      jsc-safe-url: 0.2.4
      lightningcss: 1.32.0
      picomatch: 4.0.4
      postcss: 8.4.49
      resolve-from: 5.0.0
    optionalDependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  '@expo/metro-runtime@6.1.2(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      anser: 1.4.10
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      pretty-format: 29.7.0
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      stacktrace-parser: 0.1.11
      whatwg-fetch: 3.6.20
    optionalDependencies:
      react-dom: 19.1.0(react@19.1.0)

  '@expo/metro@54.2.0':
    dependencies:
      metro: 0.83.3
      metro-babel-transformer: 0.83.3
      metro-cache: 0.83.3
      metro-cache-key: 0.83.3
      metro-config: 0.83.3
      metro-core: 0.83.3
      metro-file-map: 0.83.3
      metro-minify-terser: 0.83.3
      metro-resolver: 0.83.3
      metro-runtime: 0.83.3
      metro-source-map: 0.83.3
      metro-symbolicate: 0.83.3
      metro-transform-plugins: 0.83.3
      metro-transform-worker: 0.83.3
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  '@expo/ngrok-bin-linux-x64@2.3.41':
    optional: true

  '@expo/ngrok-bin@2.3.42':
    optionalDependencies:
      '@expo/ngrok-bin-linux-x64': 2.3.41

  '@expo/ngrok@4.1.3':
    dependencies:
      '@expo/ngrok-bin': 2.3.42
      got: 11.8.6
      uuid: 3.4.0
      yaml: 1.10.3

  '@expo/osascript@2.4.3':
    dependencies:
      '@expo/spawn-async': 1.8.0

  '@expo/package-manager@1.10.5':
    dependencies:
      '@expo/json-file': 10.0.14
      '@expo/spawn-async': 1.8.0
      chalk: 4.1.2
      npm-package-arg: 11.0.3
      ora: 3.4.0
      resolve-workspace-root: 2.0.1

  '@expo/plist@0.4.8':
    dependencies:
      '@xmldom/xmldom': 0.8.13
      base64-js: 1.5.1
      xmlbuilder: 15.1.1

  '@expo/prebuild-config@54.0.8(expo@54.0.34)(typescript@5.9.3)':
    dependencies:
      '@expo/config': 12.0.13
      '@expo/config-plugins': 54.0.4
      '@expo/config-types': 54.0.10
      '@expo/image-utils': 0.8.14(typescript@5.9.3)
      '@expo/json-file': 10.0.14
      '@react-native/normalize-colors': 0.81.5
      debug: 4.4.3
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      resolve-from: 5.0.0
      semver: 7.8.0
      xml2js: 0.6.0
    transitivePeerDependencies:
      - supports-color
      - typescript

  '@expo/require-utils@55.0.5(typescript@5.9.3)':
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/core': 7.29.0
      '@babel/plugin-transform-modules-commonjs': 7.28.6(@babel/core@7.29.0)
    optionalDependencies:
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color

  '@expo/schema-utils@0.1.8': {}

  '@expo/sdk-runtime-versions@1.0.0': {}

  '@expo/spawn-async@1.8.0':
    dependencies:
      cross-spawn: 7.0.6

  '@expo/sudo-prompt@9.3.2': {}

  '@expo/vector-icons@15.1.1(expo-font@14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      expo-font: 14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  '@expo/ws-tunnel@1.0.6': {}

  '@expo/xcpretty@4.4.4':
    dependencies:
      '@babel/code-frame': 7.29.0
      chalk: 4.1.2
      js-yaml: 4.1.1

  '@floating-ui/core@1.7.5':
    dependencies:
      '@floating-ui/utils': 0.2.11

  '@floating-ui/dom@1.7.6':
    dependencies:
      '@floating-ui/core': 1.7.5
      '@floating-ui/utils': 0.2.11

  '@floating-ui/react-dom@2.1.8(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@floating-ui/dom': 1.7.6
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  '@floating-ui/utils@0.2.11': {}

  '@gerrit0/mini-shiki@3.23.0':
    dependencies:
      '@shikijs/engine-oniguruma': 3.23.0
      '@shikijs/langs': 3.23.0
      '@shikijs/themes': 3.23.0
      '@shikijs/types': 3.23.0
      '@shikijs/vscode-textmate': 10.0.2

  '@hookform/resolvers@3.10.0(react-hook-form@7.75.0(react@19.1.0))':
    dependencies:
      react-hook-form: 7.75.0(react@19.1.0)

  '@isaacs/fs-minipass@4.0.1':
    dependencies:
      minipass: 7.1.3

  '@isaacs/ttlcache@1.4.1': {}

  '@istanbuljs/load-nyc-config@1.1.0':
    dependencies:
      camelcase: 5.3.1
      find-up: 4.1.0
      get-package-type: 0.1.0
      js-yaml: 3.14.2
      resolve-from: 5.0.0

  '@istanbuljs/schema@0.1.6': {}

  '@jest/create-cache-key-function@29.7.0':
    dependencies:
      '@jest/types': 29.6.3

  '@jest/environment@29.7.0':
    dependencies:
      '@jest/fake-timers': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 25.6.2
      jest-mock: 29.7.0

  '@jest/fake-timers@29.7.0':
    dependencies:
      '@jest/types': 29.6.3
      '@sinonjs/fake-timers': 10.3.0
      '@types/node': 25.6.2
      jest-message-util: 29.7.0
      jest-mock: 29.7.0
      jest-util: 29.7.0

  '@jest/schemas@29.6.3':
    dependencies:
      '@sinclair/typebox': 0.27.10

  '@jest/transform@29.7.0':
    dependencies:
      '@babel/core': 7.29.0
      '@jest/types': 29.6.3
      '@jridgewell/trace-mapping': 0.3.31
      babel-plugin-istanbul: 6.1.1
      chalk: 4.1.2
      convert-source-map: 2.0.0
      fast-json-stable-stringify: 2.1.0
      graceful-fs: 4.2.11
      jest-haste-map: 29.7.0
      jest-regex-util: 29.6.3
      jest-util: 29.7.0
      micromatch: 4.0.8
      pirates: 4.0.7
      slash: 3.0.0
      write-file-atomic: 4.0.2
    transitivePeerDependencies:
      - supports-color

  '@jest/types@29.6.3':
    dependencies:
      '@jest/schemas': 29.6.3
      '@types/istanbul-lib-coverage': 2.0.6
      '@types/istanbul-reports': 3.0.4
      '@types/node': 25.6.2
      '@types/yargs': 17.0.35
      chalk: 4.1.2

  '@jridgewell/gen-mapping@0.3.13':
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.5
      '@jridgewell/trace-mapping': 0.3.31

  '@jridgewell/remapping@2.3.5':
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31

  '@jridgewell/resolve-uri@3.1.2': {}

  '@jridgewell/source-map@0.3.11':
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31

  '@jridgewell/sourcemap-codec@1.5.5': {}

  '@jridgewell/trace-mapping@0.3.31':
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.5

  '@nodelib/fs.scandir@2.1.5':
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      run-parallel: 1.2.0

  '@nodelib/fs.stat@2.0.5': {}

  '@nodelib/fs.walk@1.2.8':
    dependencies:
      '@nodelib/fs.scandir': 2.1.5
      fastq: 1.20.1

  '@orval/angular@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/axios@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/core@8.9.1(typescript@5.9.3)':
    dependencies:
      '@scalar/openapi-types': 0.8.0
      acorn: 8.16.0
      compare-versions: 6.1.1
      debug: 4.4.3
      esbuild: 0.27.3
      esutils: 2.0.3
      fs-extra: 11.3.5
      globby: 16.1.0
      jiti: 2.7.0
      remeda: 2.34.0
      typedoc: 0.28.19(typescript@5.9.3)
    transitivePeerDependencies:
      - supports-color
      - typescript

  '@orval/fetch@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@scalar/openapi-types': 0.8.0
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/hono@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@orval/zod': 8.9.1(typescript@5.9.3)
      fs-extra: 11.3.5
      remeda: 2.34.0
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/mcp@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@orval/fetch': 8.9.1(typescript@5.9.3)
      '@orval/zod': 8.9.1(typescript@5.9.3)
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/mock@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      remeda: 2.34.0
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/query@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@orval/fetch': 8.9.1(typescript@5.9.3)
      remeda: 2.34.0
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/solid-start@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@scalar/openapi-types': 0.8.0
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/swr@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@orval/fetch': 8.9.1(typescript@5.9.3)
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@orval/zod@8.9.1(typescript@5.9.3)':
    dependencies:
      '@orval/core': 8.9.1(typescript@5.9.3)
      remeda: 2.34.0
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  '@pinojs/redact@0.4.0': {}

  '@radix-ui/number@1.1.1': {}

  '@radix-ui/primitive@1.1.3': {}

  '@radix-ui/react-accordion@1.2.12(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collapsible': 1.1.12(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-alert-dialog@1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-arrow@1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-aspect-ratio@1.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-avatar@1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-context': 1.1.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-is-hydrated': 0.1.0(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-checkbox@1.3.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-collapsible@1.1.12(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-collection@1.1.7(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-collection@1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-compose-refs@1.1.2(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-compose-refs@1.1.2(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-context-menu@2.2.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-menu': 2.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-context@1.1.2(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-context@1.1.2(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-context@1.1.3(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-dialog@1.1.15(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.1.17)(react@19.1.0)
      aria-hidden: 1.2.6
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-remove-scroll: 2.7.2(@types/react@19.1.17)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-dialog@1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      aria-hidden: 1.2.6
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-remove-scroll: 2.7.2(@types/react@19.2.14)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-direction@1.1.1(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-direction@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-dismissable-layer@1.1.11(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-use-escape-keydown': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-dismissable-layer@1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-escape-keydown': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-dropdown-menu@2.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-menu': 2.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-focus-guards@1.1.3(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-focus-guards@1.1.3(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-focus-scope@1.1.7(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-focus-scope@1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-hover-card@1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-id@1.1.1(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-id@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-label@2.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-menu@2.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      aria-hidden: 1.2.6
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-remove-scroll: 2.7.2(@types/react@19.2.14)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-menubar@1.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-menu': 2.1.16(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-navigation-menu@1.2.14(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-popover@1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      aria-hidden: 1.2.6
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-remove-scroll: 2.7.2(@types/react@19.2.14)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-popper@1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@floating-ui/react-dom': 2.1.8(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-arrow': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-rect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/rect': 1.1.1
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-portal@1.1.9(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-portal@1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-presence@1.1.5(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-presence@1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-primitive@2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-slot': 1.2.3(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-primitive@2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-primitive@2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-slot': 1.2.4(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-progress@1.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-context': 1.1.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-radio-group@1.3.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-roving-focus@1.1.11(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-roving-focus@1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-scroll-area@1.2.10(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/number': 1.1.1
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-select@2.2.6(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/number': 1.1.1
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-focus-guards': 1.1.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-focus-scope': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      aria-hidden: 1.2.6
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-remove-scroll: 2.7.2(@types/react@19.2.14)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-separator@1.1.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-slider@1.3.6(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/number': 1.1.1
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-slot@1.2.0(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-slot@1.2.3(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-slot@1.2.3(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-slot@1.2.4(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-switch@1.2.6(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-previous': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-size': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-tabs@1.1.13(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17
      '@types/react-dom': 19.1.11(@types/react@19.1.17)

  '@radix-ui/react-tabs@1.1.13(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-toast@1.2.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-collection': 1.1.7(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-toggle-group@1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-direction': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-roving-focus': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-toggle': 1.1.10(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-toggle@1.1.10(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-tooltip@1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/primitive': 1.1.3
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-context': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dismissable-layer': 1.1.11(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-popper': 1.2.8(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-portal': 1.1.9(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-presence': 1.1.5(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-slot': 1.2.3(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-controllable-state': 1.2.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-visually-hidden': 1.2.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/react-use-callback-ref@1.1.1(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-use-callback-ref@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-controllable-state@1.2.2(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-effect-event': 0.0.2(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-use-controllable-state@1.2.2(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-effect-event': 0.0.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-effect-event@0.0.2(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-use-effect-event@0.0.2(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-escape-keydown@1.1.1(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.1.17)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-use-escape-keydown@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-is-hydrated@0.1.0(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
      use-sync-external-store: 1.6.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-layout-effect@1.1.1(@types/react@19.1.17)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.1.17

  '@radix-ui/react-use-layout-effect@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-previous@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-rect@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/rect': 1.1.1
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-use-size@1.1.1(@types/react@19.2.14)(react@19.1.0)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      react: 19.1.0
    optionalDependencies:
      '@types/react': 19.2.14

  '@radix-ui/react-visually-hidden@1.2.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@radix-ui/react-primitive': 2.1.3(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14
      '@types/react-dom': 19.2.3(@types/react@19.2.14)

  '@radix-ui/rect@1.1.1': {}

  '@react-native-async-storage/async-storage@2.2.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))':
    dependencies:
      merge-options: 3.0.4
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  '@react-native/assets-registry@0.81.5': {}

  '@react-native/babel-plugin-codegen@0.81.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/traverse': 7.29.0
      '@react-native/codegen': 0.81.5(@babel/core@7.29.0)
    transitivePeerDependencies:
      - '@babel/core'
      - supports-color

  '@react-native/babel-preset@0.81.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/plugin-proposal-export-default-from': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-syntax-dynamic-import': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-export-default-from': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-syntax-nullish-coalescing-operator': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-optional-chaining': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-transform-arrow-functions': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-async-generator-functions': 7.29.0(@babel/core@7.29.0)
      '@babel/plugin-transform-async-to-generator': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-block-scoping': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-class-properties': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-classes': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-computed-properties': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-destructuring': 7.28.5(@babel/core@7.29.0)
      '@babel/plugin-transform-flow-strip-types': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-for-of': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-function-name': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-literals': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-logical-assignment-operators': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-modules-commonjs': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-named-capturing-groups-regex': 7.29.0(@babel/core@7.29.0)
      '@babel/plugin-transform-nullish-coalescing-operator': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-numeric-separator': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-object-rest-spread': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-optional-catch-binding': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-optional-chaining': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-parameters': 7.27.7(@babel/core@7.29.0)
      '@babel/plugin-transform-private-methods': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-private-property-in-object': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-react-display-name': 7.28.0(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx-self': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx-source': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-regenerator': 7.29.0(@babel/core@7.29.0)
      '@babel/plugin-transform-runtime': 7.29.0(@babel/core@7.29.0)
      '@babel/plugin-transform-shorthand-properties': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-spread': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-sticky-regex': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-typescript': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-unicode-regex': 7.27.1(@babel/core@7.29.0)
      '@babel/template': 7.28.6
      '@react-native/babel-plugin-codegen': 0.81.5(@babel/core@7.29.0)
      babel-plugin-syntax-hermes-parser: 0.29.1
      babel-plugin-transform-flow-enums: 0.0.2(@babel/core@7.29.0)
      react-refresh: 0.14.2
    transitivePeerDependencies:
      - supports-color

  '@react-native/codegen@0.81.5(@babel/core@7.29.0)':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/parser': 7.29.3
      glob: 7.2.3
      hermes-parser: 0.29.1
      invariant: 2.2.4
      nullthrows: 1.1.1
      yargs: 17.7.2

  '@react-native/community-cli-plugin@0.81.5':
    dependencies:
      '@react-native/dev-middleware': 0.81.5
      debug: 4.4.3
      invariant: 2.2.4
      metro: 0.83.7
      metro-config: 0.83.7
      metro-core: 0.83.7
      semver: 7.8.0
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  '@react-native/debugger-frontend@0.81.5': {}

  '@react-native/dev-middleware@0.81.5':
    dependencies:
      '@isaacs/ttlcache': 1.4.1
      '@react-native/debugger-frontend': 0.81.5
      chrome-launcher: 0.15.2
      chromium-edge-launcher: 0.2.0
      connect: 3.7.0
      debug: 4.4.3
      invariant: 2.2.4
      nullthrows: 1.1.1
      open: 7.4.2
      serve-static: 1.16.3
      ws: 6.2.3
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  '@react-native/gradle-plugin@0.81.5': {}

  '@react-native/js-polyfills@0.81.5': {}

  '@react-native/normalize-colors@0.74.89': {}

  '@react-native/normalize-colors@0.81.5': {}

  '@react-native/virtualized-lists@0.81.5(@types/react@19.1.17)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      invariant: 2.2.4
      nullthrows: 1.1.1
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17

  '@react-navigation/bottom-tabs@7.16.1(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@react-navigation/elements': 2.9.18(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@react-navigation/native': 7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      color: 4.2.3
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-safe-area-context: 5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-screens: 4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      sf-symbols-typescript: 2.2.0
    transitivePeerDependencies:
      - '@react-native-masked-view/masked-view'

  '@react-navigation/core@7.17.4(react@19.1.0)':
    dependencies:
      '@react-navigation/routers': 7.5.5
      escape-string-regexp: 4.0.0
      fast-deep-equal: 3.1.3
      nanoid: 3.3.12
      query-string: 7.1.3
      react: 19.1.0
      react-is: 19.2.6
      use-latest-callback: 0.2.6(react@19.1.0)
      use-sync-external-store: 1.6.0(react@19.1.0)

  '@react-navigation/elements@2.9.18(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@react-navigation/native': 7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      color: 4.2.3
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-safe-area-context: 5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      use-latest-callback: 0.2.6(react@19.1.0)
      use-sync-external-store: 1.6.0(react@19.1.0)

  '@react-navigation/native-stack@7.15.1(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@react-navigation/elements': 2.9.18(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@react-navigation/native': 7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      color: 4.2.3
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-safe-area-context: 5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-screens: 4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      sf-symbols-typescript: 2.2.0
      warn-once: 0.1.1
    transitivePeerDependencies:
      - '@react-native-masked-view/masked-view'

  '@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)':
    dependencies:
      '@react-navigation/core': 7.17.4(react@19.1.0)
      escape-string-regexp: 4.0.0
      fast-deep-equal: 3.1.3
      nanoid: 3.3.12
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      use-latest-callback: 0.2.6(react@19.1.0)

  '@react-navigation/routers@7.5.5':
    dependencies:
      nanoid: 3.3.12

  '@replit/vite-plugin-cartographer@0.5.5':
    dependencies:
      '@babel/parser': 7.29.3
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
      magic-string: 0.30.21
      modern-screenshot: 4.7.0
    transitivePeerDependencies:
      - supports-color

  '@replit/vite-plugin-runtime-error-modal@0.0.6':
    dependencies:
      '@jridgewell/trace-mapping': 0.3.31

  '@rolldown/pluginutils@1.0.0-rc.3': {}

  '@rollup/rollup-linux-x64-gnu@4.60.3':
    optional: true

  '@scalar/helpers@0.5.2': {}

  '@scalar/helpers@0.6.0': {}

  '@scalar/json-magic@0.12.12':
    dependencies:
      '@scalar/helpers': 0.6.0
      pathe: 2.0.3
      yaml: 2.8.4

  '@scalar/json-magic@0.12.8':
    dependencies:
      '@scalar/helpers': 0.5.2
      pathe: 2.0.3
      yaml: 2.8.4

  '@scalar/openapi-parser@0.25.12':
    dependencies:
      '@scalar/helpers': 0.5.2
      '@scalar/json-magic': 0.12.8
      '@scalar/openapi-types': 0.8.0
      '@scalar/openapi-upgrader': 0.2.6
      ajv: 8.20.0
      ajv-draft-04: 1.0.0(ajv@8.20.0)
      ajv-formats: 3.0.1
      jsonpointer: 5.0.1
      leven: 4.1.0
      yaml: 2.8.4

  '@scalar/openapi-types@0.8.0': {}

  '@scalar/openapi-upgrader@0.2.6':
    dependencies:
      '@scalar/openapi-types': 0.8.0

  '@sec-ant/readable-stream@0.4.1': {}

  '@shikijs/engine-oniguruma@3.23.0':
    dependencies:
      '@shikijs/types': 3.23.0
      '@shikijs/vscode-textmate': 10.0.2

  '@shikijs/langs@3.23.0':
    dependencies:
      '@shikijs/types': 3.23.0

  '@shikijs/themes@3.23.0':
    dependencies:
      '@shikijs/types': 3.23.0

  '@shikijs/types@3.23.0':
    dependencies:
      '@shikijs/vscode-textmate': 10.0.2
      '@types/hast': 3.0.4

  '@shikijs/vscode-textmate@10.0.2': {}

  '@sinclair/typebox@0.27.10': {}

  '@sindresorhus/is@4.6.0': {}

  '@sindresorhus/merge-streams@4.0.0': {}

  '@sinonjs/commons@3.0.1':
    dependencies:
      type-detect: 4.0.8

  '@sinonjs/fake-timers@10.3.0':
    dependencies:
      '@sinonjs/commons': 3.0.1

  '@stardazed/streams-text-encoding@1.0.2': {}

  '@szmarczak/http-timer@4.0.6':
    dependencies:
      defer-to-connect: 2.0.1

  '@tabby_ai/hijri-converter@1.0.5': {}

  '@tailwindcss/node@4.3.0':
    dependencies:
      '@jridgewell/remapping': 2.3.5
      enhanced-resolve: 5.21.2
      jiti: 2.7.0
      lightningcss: 1.32.0
      magic-string: 0.30.21
      source-map-js: 1.2.1
      tailwindcss: 4.3.0

  '@tailwindcss/oxide-linux-x64-gnu@4.3.0':
    optional: true

  '@tailwindcss/oxide-wasm32-wasi@4.3.0':
    optional: true

  '@tailwindcss/oxide@4.3.0':
    optionalDependencies:
      '@tailwindcss/oxide-linux-x64-gnu': 4.3.0
      '@tailwindcss/oxide-wasm32-wasi': 4.3.0

  '@tailwindcss/vite@4.3.0(vite@7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4))':
    dependencies:
      '@tailwindcss/node': 4.3.0
      '@tailwindcss/oxide': 4.3.0
      tailwindcss: 4.3.0
      vite: 7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4)

  '@tanstack/query-core@5.100.9': {}

  '@tanstack/react-query@5.100.9(react@19.1.0)':
    dependencies:
      '@tanstack/query-core': 5.100.9
      react: 19.1.0

  '@types/babel__core@7.20.5':
    dependencies:
      '@babel/parser': 7.29.3
      '@babel/types': 7.29.0
      '@types/babel__generator': 7.27.0
      '@types/babel__template': 7.4.4
      '@types/babel__traverse': 7.28.0

  '@types/babel__generator@7.27.0':
    dependencies:
      '@babel/types': 7.29.0

  '@types/babel__template@7.4.4':
    dependencies:
      '@babel/parser': 7.29.3
      '@babel/types': 7.29.0

  '@types/babel__traverse@7.28.0':
    dependencies:
      '@babel/types': 7.29.0

  '@types/body-parser@1.19.6':
    dependencies:
      '@types/connect': 3.4.38
      '@types/node': 25.6.2

  '@types/cacheable-request@6.0.3':
    dependencies:
      '@types/http-cache-semantics': 4.2.0
      '@types/keyv': 3.1.4
      '@types/node': 25.6.2
      '@types/responselike': 1.0.3

  '@types/connect@3.4.38':
    dependencies:
      '@types/node': 25.6.2

  '@types/cookie-parser@1.4.10(@types/express@5.0.6)':
    dependencies:
      '@types/express': 5.0.6

  '@types/cors@2.8.19':
    dependencies:
      '@types/node': 25.6.2

  '@types/d3-array@3.2.2': {}

  '@types/d3-color@3.1.3': {}

  '@types/d3-ease@3.0.2': {}

  '@types/d3-interpolate@3.0.4':
    dependencies:
      '@types/d3-color': 3.1.3

  '@types/d3-path@3.1.1': {}

  '@types/d3-scale@4.0.9':
    dependencies:
      '@types/d3-time': 3.0.4

  '@types/d3-shape@3.1.8':
    dependencies:
      '@types/d3-path': 3.1.1

  '@types/d3-time@3.0.4': {}

  '@types/d3-timer@3.0.2': {}

  '@types/estree@1.0.8': {}

  '@types/express-serve-static-core@5.1.1':
    dependencies:
      '@types/node': 25.6.2
      '@types/qs': 6.15.1
      '@types/range-parser': 1.2.7
      '@types/send': 1.2.1

  '@types/express@5.0.6':
    dependencies:
      '@types/body-parser': 1.19.6
      '@types/express-serve-static-core': 5.1.1
      '@types/serve-static': 2.2.0

  '@types/graceful-fs@4.1.9':
    dependencies:
      '@types/node': 25.6.2

  '@types/hammerjs@2.0.46': {}

  '@types/hast@3.0.4':
    dependencies:
      '@types/unist': 3.0.3

  '@types/http-cache-semantics@4.2.0': {}

  '@types/http-errors@2.0.5': {}

  '@types/istanbul-lib-coverage@2.0.6': {}

  '@types/istanbul-lib-report@3.0.3':
    dependencies:
      '@types/istanbul-lib-coverage': 2.0.6

  '@types/istanbul-reports@3.0.4':
    dependencies:
      '@types/istanbul-lib-report': 3.0.3

  '@types/keyv@3.1.4':
    dependencies:
      '@types/node': 25.6.2

  '@types/node@25.6.2':
    dependencies:
      undici-types: 7.19.2

  '@types/pg@8.20.0':
    dependencies:
      '@types/node': 25.6.2
      pg-protocol: 1.13.0
      pg-types: 2.2.0

  '@types/qs@6.15.1': {}

  '@types/range-parser@1.2.7': {}

  '@types/react-dom@19.1.11(@types/react@19.1.17)':
    dependencies:
      '@types/react': 19.1.17

  '@types/react-dom@19.2.3(@types/react@19.2.14)':
    dependencies:
      '@types/react': 19.2.14

  '@types/react@19.1.17':
    dependencies:
      csstype: 3.2.3

  '@types/react@19.2.14':
    dependencies:
      csstype: 3.2.3

  '@types/responselike@1.0.3':
    dependencies:
      '@types/node': 25.6.2

  '@types/send@1.2.1':
    dependencies:
      '@types/node': 25.6.2

  '@types/serve-static@2.2.0':
    dependencies:
      '@types/http-errors': 2.0.5
      '@types/node': 25.6.2

  '@types/stack-utils@2.0.3': {}

  '@types/unist@3.0.3': {}

  '@types/yargs-parser@21.0.3': {}

  '@types/yargs@17.0.35':
    dependencies:
      '@types/yargs-parser': 21.0.3

  '@ungap/structured-clone@1.3.1': {}

  '@urql/core@5.2.0':
    dependencies:
      '@0no-co/graphql.web': 1.2.0
      wonka: 6.3.6
    transitivePeerDependencies:
      - graphql

  '@urql/exchange-retry@1.3.2':
    dependencies:
      '@urql/core': 5.2.0
      wonka: 6.3.6
    transitivePeerDependencies:
      - graphql

  '@vitejs/plugin-react@5.2.0(vite@7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4))':
    dependencies:
      '@babel/core': 7.29.0
      '@babel/plugin-transform-react-jsx-self': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx-source': 7.27.1(@babel/core@7.29.0)
      '@rolldown/pluginutils': 1.0.0-rc.3
      '@types/babel__core': 7.20.5
      react-refresh: 0.18.0
      vite: 7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4)
    transitivePeerDependencies:
      - supports-color

  '@xmldom/xmldom@0.8.13': {}

  '@xmldom/xmldom@0.9.10': {}

  abort-controller@3.0.0:
    dependencies:
      event-target-shim: 5.0.1

  accepts@1.3.8:
    dependencies:
      mime-types: 2.1.35
      negotiator: 0.6.3

  accepts@2.0.0:
    dependencies:
      mime-types: 3.0.2
      negotiator: 1.0.0

  acorn@8.16.0: {}

  agent-base@7.1.4: {}

  ajv-draft-04@1.0.0(ajv@8.20.0):
    optionalDependencies:
      ajv: 8.20.0

  ajv-formats@3.0.1:
    dependencies:
      ajv: 8.20.0

  ajv@8.20.0:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-uri: 3.1.2
      json-schema-traverse: 1.0.0
      require-from-string: 2.0.2

  anser@1.4.10: {}

  ansi-colors@4.1.3: {}

  ansi-escapes@4.3.2:
    dependencies:
      type-fest: 0.21.3

  ansi-regex@4.1.1: {}

  ansi-regex@5.0.1: {}

  ansi-styles@3.2.1:
    dependencies:
      color-convert: 1.9.3

  ansi-styles@4.3.0:
    dependencies:
      color-convert: 2.0.1

  ansi-styles@5.2.0: {}

  any-promise@1.3.0: {}

  anymatch@3.1.3:
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.2

  arg@5.0.2: {}

  argparse@1.0.10:
    dependencies:
      sprintf-js: 1.0.3

  argparse@2.0.1: {}

  aria-hidden@1.2.6:
    dependencies:
      tslib: 2.8.1

  asap@2.0.6: {}

  async-limiter@1.0.1: {}

  atomic-sleep@1.0.0: {}

  babel-jest@29.7.0(@babel/core@7.29.0):
    dependencies:
      '@babel/core': 7.29.0
      '@jest/transform': 29.7.0
      '@types/babel__core': 7.20.5
      babel-plugin-istanbul: 6.1.1
      babel-preset-jest: 29.6.3(@babel/core@7.29.0)
      chalk: 4.1.2
      graceful-fs: 4.2.11
      slash: 3.0.0
    transitivePeerDependencies:
      - supports-color

  babel-plugin-istanbul@6.1.1:
    dependencies:
      '@babel/helper-plugin-utils': 7.28.6
      '@istanbuljs/load-nyc-config': 1.1.0
      '@istanbuljs/schema': 0.1.6
      istanbul-lib-instrument: 5.2.1
      test-exclude: 6.0.0
    transitivePeerDependencies:
      - supports-color

  babel-plugin-jest-hoist@29.6.3:
    dependencies:
      '@babel/template': 7.28.6
      '@babel/types': 7.29.0
      '@types/babel__core': 7.20.5
      '@types/babel__traverse': 7.28.0

  babel-plugin-polyfill-corejs2@0.4.17(@babel/core@7.29.0):
    dependencies:
      '@babel/compat-data': 7.29.3
      '@babel/core': 7.29.0
      '@babel/helper-define-polyfill-provider': 0.6.8(@babel/core@7.29.0)
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  babel-plugin-polyfill-corejs3@0.13.0(@babel/core@7.29.0):
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-define-polyfill-provider': 0.6.8(@babel/core@7.29.0)
      core-js-compat: 3.49.0
    transitivePeerDependencies:
      - supports-color

  babel-plugin-polyfill-regenerator@0.6.8(@babel/core@7.29.0):
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-define-polyfill-provider': 0.6.8(@babel/core@7.29.0)
    transitivePeerDependencies:
      - supports-color

  babel-plugin-react-compiler@1.0.0:
    dependencies:
      '@babel/types': 7.29.0

  babel-plugin-react-compiler@19.0.0-beta-ebf51a3-20250411:
    dependencies:
      '@babel/types': 7.29.0

  babel-plugin-react-native-web@0.21.2: {}

  babel-plugin-syntax-hermes-parser@0.29.1:
    dependencies:
      hermes-parser: 0.29.1

  babel-plugin-transform-flow-enums@0.0.2(@babel/core@7.29.0):
    dependencies:
      '@babel/plugin-syntax-flow': 7.28.6(@babel/core@7.29.0)
    transitivePeerDependencies:
      - '@babel/core'

  babel-preset-current-node-syntax@1.2.0(@babel/core@7.29.0):
    dependencies:
      '@babel/core': 7.29.0
      '@babel/plugin-syntax-async-generators': 7.8.4(@babel/core@7.29.0)
      '@babel/plugin-syntax-bigint': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-class-properties': 7.12.13(@babel/core@7.29.0)
      '@babel/plugin-syntax-class-static-block': 7.14.5(@babel/core@7.29.0)
      '@babel/plugin-syntax-import-attributes': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-syntax-import-meta': 7.10.4(@babel/core@7.29.0)
      '@babel/plugin-syntax-json-strings': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-logical-assignment-operators': 7.10.4(@babel/core@7.29.0)
      '@babel/plugin-syntax-nullish-coalescing-operator': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-numeric-separator': 7.10.4(@babel/core@7.29.0)
      '@babel/plugin-syntax-object-rest-spread': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-optional-catch-binding': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-optional-chaining': 7.8.3(@babel/core@7.29.0)
      '@babel/plugin-syntax-private-property-in-object': 7.14.5(@babel/core@7.29.0)
      '@babel/plugin-syntax-top-level-await': 7.14.5(@babel/core@7.29.0)

  babel-preset-expo@54.0.10(@babel/core@7.29.0)(@babel/runtime@7.29.2)(expo@54.0.34)(react-refresh@0.14.2):
    dependencies:
      '@babel/helper-module-imports': 7.28.6
      '@babel/plugin-proposal-decorators': 7.29.0(@babel/core@7.29.0)
      '@babel/plugin-proposal-export-default-from': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-syntax-export-default-from': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-class-static-block': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-export-namespace-from': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-flow-strip-types': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-modules-commonjs': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-object-rest-spread': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-parameters': 7.27.7(@babel/core@7.29.0)
      '@babel/plugin-transform-private-methods': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-private-property-in-object': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-runtime': 7.29.0(@babel/core@7.29.0)
      '@babel/preset-react': 7.28.5(@babel/core@7.29.0)
      '@babel/preset-typescript': 7.28.5(@babel/core@7.29.0)
      '@react-native/babel-preset': 0.81.5(@babel/core@7.29.0)
      babel-plugin-react-compiler: 1.0.0
      babel-plugin-react-native-web: 0.21.2
      babel-plugin-syntax-hermes-parser: 0.29.1
      babel-plugin-transform-flow-enums: 0.0.2(@babel/core@7.29.0)
      debug: 4.4.3
      react-refresh: 0.14.2
      resolve-from: 5.0.0
    optionalDependencies:
      '@babel/runtime': 7.29.2
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
    transitivePeerDependencies:
      - '@babel/core'
      - supports-color

  babel-preset-jest@29.6.3(@babel/core@7.29.0):
    dependencies:
      '@babel/core': 7.29.0
      babel-plugin-jest-hoist: 29.6.3
      babel-preset-current-node-syntax: 1.2.0(@babel/core@7.29.0)

  balanced-match@1.0.2: {}

  balanced-match@4.0.4: {}

  base64-js@1.5.1: {}

  baseline-browser-mapping@2.10.28: {}

  better-opn@3.0.2:
    dependencies:
      open: 8.4.2

  big-integer@1.6.52: {}

  body-parser@2.2.2:
    dependencies:
      bytes: 3.1.2
      content-type: 1.0.5
      debug: 4.4.3
      http-errors: 2.0.1
      iconv-lite: 0.7.2
      on-finished: 2.4.1
      qs: 6.15.1
      raw-body: 3.0.2
      type-is: 2.0.1
    transitivePeerDependencies:
      - supports-color

  boolbase@1.0.0: {}

  bplist-creator@0.1.0:
    dependencies:
      stream-buffers: 2.2.0

  bplist-parser@0.3.1:
    dependencies:
      big-integer: 1.6.52

  bplist-parser@0.3.2:
    dependencies:
      big-integer: 1.6.52

  brace-expansion@1.1.14:
    dependencies:
      balanced-match: 1.0.2
      concat-map: 0.0.1

  brace-expansion@2.1.0:
    dependencies:
      balanced-match: 1.0.2

  brace-expansion@5.0.6:
    dependencies:
      balanced-match: 4.0.4

  braces@3.0.3:
    dependencies:
      fill-range: 7.1.1

  browserslist@4.28.2:
    dependencies:
      baseline-browser-mapping: 2.10.28
      caniuse-lite: 1.0.30001792
      electron-to-chromium: 1.5.353
      node-releases: 2.0.38
      update-browserslist-db: 1.2.3(browserslist@4.28.2)

  bser@2.1.1:
    dependencies:
      node-int64: 0.4.0

  buffer-from@1.1.2: {}

  buffer@5.7.1:
    dependencies:
      base64-js: 1.5.1
      ieee754: 1.2.1

  bytes@3.1.2: {}

  cacheable-lookup@5.0.4: {}

  cacheable-request@7.0.4:
    dependencies:
      clone-response: 1.0.3
      get-stream: 5.2.0
      http-cache-semantics: 4.2.0
      keyv: 4.5.4
      lowercase-keys: 2.0.0
      normalize-url: 6.1.0
      responselike: 2.0.1

  call-bind-apply-helpers@1.0.2:
    dependencies:
      es-errors: 1.3.0
      function-bind: 1.1.2

  call-bound@1.0.4:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      get-intrinsic: 1.3.0

  camelcase@5.3.1: {}

  camelcase@6.3.0: {}

  caniuse-lite@1.0.30001792: {}

  chalk@2.4.2:
    dependencies:
      ansi-styles: 3.2.1
      escape-string-regexp: 1.0.5
      supports-color: 5.5.0

  chalk@4.1.2:
    dependencies:
      ansi-styles: 4.3.0
      supports-color: 7.2.0

  chokidar@4.0.3:
    dependencies:
      readdirp: 4.1.2

  chokidar@5.0.0:
    dependencies:
      readdirp: 5.0.0

  chownr@3.0.0: {}

  chrome-launcher@0.15.2:
    dependencies:
      '@types/node': 25.6.2
      escape-string-regexp: 4.0.0
      is-wsl: 2.2.0
      lighthouse-logger: 1.4.2
    transitivePeerDependencies:
      - supports-color

  chromium-edge-launcher@0.2.0:
    dependencies:
      '@types/node': 25.6.2
      escape-string-regexp: 4.0.0
      is-wsl: 2.2.0
      lighthouse-logger: 1.4.2
      mkdirp: 1.0.4
      rimraf: 3.0.2
    transitivePeerDependencies:
      - supports-color

  ci-info@2.0.0: {}

  ci-info@3.9.0: {}

  class-variance-authority@0.7.1:
    dependencies:
      clsx: 2.1.1

  cli-cursor@2.1.0:
    dependencies:
      restore-cursor: 2.0.0

  cli-spinners@2.9.2: {}

  client-only@0.0.1: {}

  cliui@8.0.1:
    dependencies:
      string-width: 4.2.3
      strip-ansi: 6.0.1
      wrap-ansi: 7.0.0

  clone-response@1.0.3:
    dependencies:
      mimic-response: 1.0.1

  clone@1.0.4: {}

  clsx@2.1.1: {}

  cmdk@1.1.1(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.2(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@radix-ui/react-id': 1.1.1(@types/react@19.2.14)(react@19.1.0)
      '@radix-ui/react-primitive': 2.1.4(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    transitivePeerDependencies:
      - '@types/react'
      - '@types/react-dom'

  color-convert@1.9.3:
    dependencies:
      color-name: 1.1.3

  color-convert@2.0.1:
    dependencies:
      color-name: 1.1.4

  color-name@1.1.3: {}

  color-name@1.1.4: {}

  color-string@1.9.1:
    dependencies:
      color-name: 1.1.4
      simple-swizzle: 0.2.4

  color@4.2.3:
    dependencies:
      color-convert: 2.0.1
      color-string: 1.9.1

  colorette@2.0.20: {}

  commander@12.1.0: {}

  commander@14.0.3: {}

  commander@2.20.3: {}

  commander@4.1.1: {}

  commander@7.2.0: {}

  compare-versions@6.1.1: {}

  compressible@2.0.18:
    dependencies:
      mime-db: 1.54.0

  compression@1.8.1:
    dependencies:
      bytes: 3.1.2
      compressible: 2.0.18
      debug: 2.6.9
      negotiator: 0.6.4
      on-headers: 1.1.0
      safe-buffer: 5.2.1
      vary: 1.1.2
    transitivePeerDependencies:
      - supports-color

  concat-map@0.0.1: {}

  connect@3.7.0:
    dependencies:
      debug: 2.6.9
      finalhandler: 1.1.2
      parseurl: 1.3.3
      utils-merge: 1.0.1
    transitivePeerDependencies:
      - supports-color

  content-disposition@1.1.0: {}

  content-type@1.0.5: {}

  convert-source-map@2.0.0: {}

  cookie-parser@1.4.7:
    dependencies:
      cookie: 0.7.2
      cookie-signature: 1.0.6

  cookie-signature@1.0.6: {}

  cookie-signature@1.2.2: {}

  cookie@0.7.2: {}

  core-js-compat@3.49.0:
    dependencies:
      browserslist: 4.28.2

  cors@2.8.6:
    dependencies:
      object-assign: 4.1.1
      vary: 1.1.2

  cross-fetch@3.2.0:
    dependencies:
      node-fetch: 2.7.0
    transitivePeerDependencies:
      - encoding

  cross-spawn@7.0.6:
    dependencies:
      path-key: 3.1.1
      shebang-command: 2.0.0
      which: 2.0.2

  css-in-js-utils@3.1.0:
    dependencies:
      hyphenate-style-name: 1.1.0

  css-select@5.2.2:
    dependencies:
      boolbase: 1.0.0
      css-what: 6.2.2
      domhandler: 5.0.3
      domutils: 3.2.2
      nth-check: 2.1.1

  css-tree@1.1.3:
    dependencies:
      mdn-data: 2.0.14
      source-map: 0.6.1

  css-what@6.2.2: {}

  csstype@3.2.3: {}

  d3-array@3.2.4:
    dependencies:
      internmap: 2.0.3

  d3-color@3.1.0: {}

  d3-ease@3.0.1: {}

  d3-format@3.1.2: {}

  d3-interpolate@3.0.1:
    dependencies:
      d3-color: 3.1.0

  d3-path@3.1.0: {}

  d3-scale@4.0.2:
    dependencies:
      d3-array: 3.2.4
      d3-format: 3.1.2
      d3-interpolate: 3.0.1
      d3-time: 3.1.0
      d3-time-format: 4.1.0

  d3-shape@3.2.0:
    dependencies:
      d3-path: 3.1.0

  d3-time-format@4.1.0:
    dependencies:
      d3-time: 3.1.0

  d3-time@3.1.0:
    dependencies:
      d3-array: 3.2.4

  d3-timer@3.0.1: {}

  date-fns-jalali@4.1.0-0: {}

  date-fns@3.6.0: {}

  date-fns@4.1.0: {}

  dateformat@4.6.3: {}

  debug@2.6.9:
    dependencies:
      ms: 2.0.0

  debug@3.2.7:
    dependencies:
      ms: 2.1.3

  debug@4.4.3:
    dependencies:
      ms: 2.1.3

  decimal.js-light@2.5.1: {}

  decode-uri-component@0.2.2: {}

  decompress-response@6.0.0:
    dependencies:
      mimic-response: 3.1.0

  deep-extend@0.6.0: {}

  deepmerge@4.3.1: {}

  defaults@1.0.4:
    dependencies:
      clone: 1.0.4

  defer-to-connect@2.0.1: {}

  define-lazy-prop@2.0.0: {}

  depd@2.0.0: {}

  destroy@1.2.0: {}

  detect-libc@2.1.2: {}

  detect-node-es@1.1.0: {}

  dom-helpers@5.2.1:
    dependencies:
      '@babel/runtime': 7.29.2
      csstype: 3.2.3

  dom-serializer@2.0.0:
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      entities: 4.5.0

  domelementtype@2.3.0: {}

  domhandler@5.0.3:
    dependencies:
      domelementtype: 2.3.0

  domutils@3.2.2:
    dependencies:
      dom-serializer: 2.0.0
      domelementtype: 2.3.0
      domhandler: 5.0.3

  dotenv-expand@11.0.7:
    dependencies:
      dotenv: 16.4.7

  dotenv@16.4.7: {}

  drizzle-kit@0.31.10:
    dependencies:
      '@drizzle-team/brocli': 0.10.2
      '@esbuild-kit/esm-loader': tsx@4.21.0
      esbuild: 0.27.3
      tsx: 4.21.0

  drizzle-orm@0.45.2(@types/pg@8.20.0)(pg@8.20.0):
    optionalDependencies:
      '@types/pg': 8.20.0
      pg: 8.20.0

  drizzle-zod@0.8.3(drizzle-orm@0.45.2(@types/pg@8.20.0)(pg@8.20.0))(zod@3.25.76):
    dependencies:
      drizzle-orm: 0.45.2(@types/pg@8.20.0)(pg@8.20.0)
      zod: 3.25.76

  dunder-proto@1.0.1:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-errors: 1.3.0
      gopd: 1.2.0

  ee-first@1.1.1: {}

  electron-to-chromium@1.5.353: {}

  embla-carousel-react@8.6.0(react@19.1.0):
    dependencies:
      embla-carousel: 8.6.0
      embla-carousel-reactive-utils: 8.6.0(embla-carousel@8.6.0)
      react: 19.1.0

  embla-carousel-reactive-utils@8.6.0(embla-carousel@8.6.0):
    dependencies:
      embla-carousel: 8.6.0

  embla-carousel@8.6.0: {}

  emoji-regex@8.0.0: {}

  encodeurl@1.0.2: {}

  encodeurl@2.0.0: {}

  end-of-stream@1.4.5:
    dependencies:
      once: 1.4.0

  enhanced-resolve@5.21.2:
    dependencies:
      graceful-fs: 4.2.11
      tapable: 2.3.3

  enquirer@2.4.1:
    dependencies:
      ansi-colors: 4.1.3
      strip-ansi: 6.0.1

  entities@4.5.0: {}

  env-editor@0.4.2: {}

  error-stack-parser@2.1.4:
    dependencies:
      stackframe: 1.3.4

  es-define-property@1.0.1: {}

  es-errors@1.3.0: {}

  es-object-atoms@1.1.1:
    dependencies:
      es-errors: 1.3.0

  esbuild-plugin-pino@2.3.3(esbuild@0.27.3)(pino-pretty@13.1.3)(pino@9.14.0)(thread-stream@3.1.0):
    dependencies:
      esbuild: 0.27.3
      pino: 9.14.0
    optionalDependencies:
      pino-pretty: 13.1.3
      thread-stream: 3.1.0

  esbuild@0.27.3:
    optionalDependencies:
      '@esbuild/linux-x64': 0.27.3

  escalade@3.2.0: {}

  escape-html@1.0.3: {}

  escape-string-regexp@1.0.5: {}

  escape-string-regexp@2.0.0: {}

  escape-string-regexp@4.0.0: {}

  esprima@4.0.1: {}

  esutils@2.0.3: {}

  etag@1.8.1: {}

  event-target-shim@5.0.1: {}

  eventemitter3@4.0.7: {}

  execa@9.6.1:
    dependencies:
      '@sindresorhus/merge-streams': 4.0.0
      cross-spawn: 7.0.6
      figures: 6.1.0
      get-stream: 9.0.1
      human-signals: 8.0.1
      is-plain-obj: 4.1.0
      is-stream: 4.0.1
      npm-run-path: 6.0.0
      pretty-ms: 9.3.0
      signal-exit: 4.1.0
      strip-final-newline: 4.0.0
      yoctocolors: 2.1.2

  expo-asset@12.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3):
    dependencies:
      '@expo/image-utils': 0.8.14(typescript@5.9.3)
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-constants: 18.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    transitivePeerDependencies:
      - supports-color
      - typescript

  expo-blur@15.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-clipboard@8.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-constants@18.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)):
    dependencies:
      '@expo/config': 12.0.13
      '@expo/env': 2.0.11
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    transitivePeerDependencies:
      - supports-color

  expo-file-system@19.0.22(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-font@14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      fontfaceobserver: 2.3.0
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-glass-effect@0.1.10(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-haptics@15.0.8(expo@54.0.34):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)

  expo-image-loader@6.0.0(expo@54.0.34):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)

  expo-image-picker@17.0.11(expo@54.0.34):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-image-loader: 6.0.0(expo@54.0.34)

  expo-image@3.0.11(expo@54.0.34)(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    optionalDependencies:
      react-native-web: 0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0)

  expo-keep-awake@15.0.8(expo@54.0.34)(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react: 19.1.0

  expo-linear-gradient@15.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-linking@8.0.12(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      expo-constants: 18.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      invariant: 2.2.4
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    transitivePeerDependencies:
      - expo
      - supports-color

  expo-location@19.0.8(expo@54.0.34):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)

  expo-modules-autolinking@3.0.25:
    dependencies:
      '@expo/spawn-async': 1.8.0
      chalk: 4.1.2
      commander: 7.2.0
      require-from-string: 2.0.2
      resolve-from: 5.0.0

  expo-modules-core@3.0.30(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      invariant: 2.2.4
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo-router@6.0.23(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(expo-constants@18.0.13)(expo-linking@8.0.12)(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native-gesture-handler@2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      '@expo/metro-runtime': 6.1.2(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@expo/schema-utils': 0.1.8
      '@radix-ui/react-slot': 1.2.0(@types/react@19.1.17)(react@19.1.0)
      '@radix-ui/react-tabs': 1.1.13(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      '@react-navigation/bottom-tabs': 7.16.1(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@react-navigation/native': 7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@react-navigation/native-stack': 7.15.1(@react-navigation/native@7.2.4(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      client-only: 0.0.1
      debug: 4.4.3
      escape-string-regexp: 4.0.0
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-constants: 18.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      expo-linking: 8.0.12(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-server: 1.0.6
      fast-deep-equal: 3.1.3
      invariant: 2.2.4
      nanoid: 3.3.12
      query-string: 7.1.3
      react: 19.1.0
      react-fast-compare: 3.2.2
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-is-edge-to-edge: 1.3.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-safe-area-context: 5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-screens: 4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      semver: 7.6.3
      server-only: 0.0.1
      sf-symbols-typescript: 2.2.0
      shallowequal: 1.1.0
      use-latest-callback: 0.2.6(react@19.1.0)
      vaul: 1.1.2(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
    optionalDependencies:
      react-dom: 19.1.0(react@19.1.0)
      react-native-gesture-handler: 2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-reanimated: 4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-web: 0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
    transitivePeerDependencies:
      - '@react-native-masked-view/masked-view'
      - '@types/react'
      - '@types/react-dom'
      - supports-color

  expo-server@1.0.6: {}

  expo-splash-screen@31.0.13(expo@54.0.34)(typescript@5.9.3):
    dependencies:
      '@expo/prebuild-config': 54.0.8(expo@54.0.34)(typescript@5.9.3)
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
    transitivePeerDependencies:
      - supports-color
      - typescript

  expo-status-bar@3.0.9(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-is-edge-to-edge: 1.3.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)

  expo-symbols@1.0.8(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      sf-symbols-typescript: 2.2.0

  expo-system-ui@6.0.9(expo@54.0.34)(react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)):
    dependencies:
      '@react-native/normalize-colors': 0.81.5
      debug: 4.4.3
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
    optionalDependencies:
      react-native-web: 0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
    transitivePeerDependencies:
      - supports-color

  expo-web-browser@15.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)):
    dependencies:
      expo: 54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  expo@54.0.34(@babel/core@7.29.0)(@expo/metro-runtime@6.1.2)(expo-router@6.0.23)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3):
    dependencies:
      '@babel/runtime': 7.29.2
      '@expo/cli': 54.0.24(expo-router@6.0.23)(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(typescript@5.9.3)
      '@expo/config': 12.0.13
      '@expo/config-plugins': 54.0.4
      '@expo/devtools': 0.1.8(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@expo/fingerprint': 0.15.5
      '@expo/metro': 54.2.0
      '@expo/metro-config': 54.0.15(expo@54.0.34)
      '@expo/vector-icons': 15.1.1(expo-font@14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      '@ungap/structured-clone': 1.3.1
      babel-preset-expo: 54.0.10(@babel/core@7.29.0)(@babel/runtime@7.29.2)(expo@54.0.34)(react-refresh@0.14.2)
      expo-asset: 12.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)(typescript@5.9.3)
      expo-constants: 18.0.13(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      expo-file-system: 19.0.22(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))
      expo-font: 14.0.11(expo@54.0.34)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      expo-keep-awake: 15.0.8(expo@54.0.34)(react@19.1.0)
      expo-modules-autolinking: 3.0.25
      expo-modules-core: 3.0.30(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      pretty-format: 29.7.0
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-refresh: 0.14.2
      whatwg-url-without-unicode: 8.0.0-3
    optionalDependencies:
      '@expo/metro-runtime': 6.1.2(expo@54.0.34)(react-dom@19.1.0(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
    transitivePeerDependencies:
      - '@babel/core'
      - bufferutil
      - expo-router
      - graphql
      - supports-color
      - typescript
      - utf-8-validate

  exponential-backoff@3.1.3: {}

  express@5.2.1:
    dependencies:
      accepts: 2.0.0
      body-parser: 2.2.2
      content-disposition: 1.1.0
      content-type: 1.0.5
      cookie: 0.7.2
      cookie-signature: 1.2.2
      debug: 4.4.3
      depd: 2.0.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      finalhandler: 2.1.1
      fresh: 2.0.0
      http-errors: 2.0.1
      merge-descriptors: 2.0.0
      mime-types: 3.0.2
      on-finished: 2.4.1
      once: 1.4.0
      parseurl: 1.3.3
      proxy-addr: 2.0.7
      qs: 6.15.1
      range-parser: 1.2.1
      router: 2.2.0
      send: 1.2.1
      serve-static: 2.2.1
      statuses: 2.0.2
      type-is: 2.0.1
      vary: 1.1.2
    transitivePeerDependencies:
      - supports-color

  fast-copy@4.0.3: {}

  fast-deep-equal@3.1.3: {}

  fast-equals@5.4.0: {}

  fast-glob@3.3.3:
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8

  fast-json-stable-stringify@2.1.0: {}

  fast-safe-stringify@2.1.1: {}

  fast-uri@3.1.2: {}

  fastq@1.20.1:
    dependencies:
      reusify: 1.1.0

  fb-watchman@2.0.2:
    dependencies:
      bser: 2.1.1

  fbjs-css-vars@1.0.2: {}

  fbjs@3.0.5:
    dependencies:
      cross-fetch: 3.2.0
      fbjs-css-vars: 1.0.2
      loose-envify: 1.4.0
      object-assign: 4.1.1
      promise: 7.3.1
      setimmediate: 1.0.5
      ua-parser-js: 1.0.41
    transitivePeerDependencies:
      - encoding

  fdir@6.5.0(picomatch@4.0.4):
    optionalDependencies:
      picomatch: 4.0.4

  figures@6.1.0:
    dependencies:
      is-unicode-supported: 2.1.0

  fill-range@7.1.1:
    dependencies:
      to-regex-range: 5.0.1

  filter-obj@1.1.0: {}

  finalhandler@1.1.2:
    dependencies:
      debug: 2.6.9
      encodeurl: 1.0.2
      escape-html: 1.0.3
      on-finished: 2.3.0
      parseurl: 1.3.3
      statuses: 1.5.0
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color

  finalhandler@2.1.1:
    dependencies:
      debug: 4.4.3
      encodeurl: 2.0.0
      escape-html: 1.0.3
      on-finished: 2.4.1
      parseurl: 1.3.3
      statuses: 2.0.2
    transitivePeerDependencies:
      - supports-color

  find-up@4.1.0:
    dependencies:
      locate-path: 5.0.0
      path-exists: 4.0.0

  find-up@8.0.0:
    dependencies:
      locate-path: 8.0.0
      unicorn-magic: 0.3.0

  flow-enums-runtime@0.0.6: {}

  fontfaceobserver@2.3.0: {}

  forwarded@0.2.0: {}

  framer-motion@12.38.0(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      motion-dom: 12.38.0
      motion-utils: 12.36.0
      tslib: 2.8.1
    optionalDependencies:
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  freeport-async@2.0.0: {}

  fresh@0.5.2: {}

  fresh@2.0.0: {}

  fs-extra@11.3.5:
    dependencies:
      graceful-fs: 4.2.11
      jsonfile: 6.2.1
      universalify: 2.0.1

  fs.realpath@1.0.0: {}

  fsevents@2.3.3:
    optional: true

  function-bind@1.1.2: {}

  gensync@1.0.0-beta.2: {}

  get-caller-file@2.0.5: {}

  get-intrinsic@1.3.0:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      function-bind: 1.1.2
      get-proto: 1.0.1
      gopd: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.3
      math-intrinsics: 1.1.0

  get-nonce@1.0.1: {}

  get-package-type@0.1.0: {}

  get-proto@1.0.1:
    dependencies:
      dunder-proto: 1.0.1
      es-object-atoms: 1.1.1

  get-stream@5.2.0:
    dependencies:
      pump: 3.0.4

  get-stream@9.0.1:
    dependencies:
      '@sec-ant/readable-stream': 0.4.1
      is-stream: 4.0.1

  get-tsconfig@4.14.0:
    dependencies:
      resolve-pkg-maps: 1.0.0

  getenv@2.0.0: {}

  glob-parent@5.1.2:
    dependencies:
      is-glob: 4.0.3

  glob@13.0.6:
    dependencies:
      minimatch: 10.2.5
      minipass: 7.1.3
      path-scurry: 2.0.2

  glob@7.2.3:
    dependencies:
      fs.realpath: 1.0.0
      inflight: 1.0.6
      inherits: 2.0.4
      minimatch: 3.1.5
      once: 1.4.0
      path-is-absolute: 1.0.1

  globby@16.1.0:
    dependencies:
      '@sindresorhus/merge-streams': 4.0.0
      fast-glob: 3.3.3
      ignore: 7.0.5
      is-path-inside: 4.0.0
      slash: 5.1.0
      unicorn-magic: 0.4.0

  gopd@1.2.0: {}

  got@11.8.6:
    dependencies:
      '@sindresorhus/is': 4.6.0
      '@szmarczak/http-timer': 4.0.6
      '@types/cacheable-request': 6.0.3
      '@types/responselike': 1.0.3
      cacheable-lookup: 5.0.4
      cacheable-request: 7.0.4
      decompress-response: 6.0.0
      http2-wrapper: 1.0.3
      lowercase-keys: 2.0.0
      p-cancelable: 2.1.1
      responselike: 2.0.1

  graceful-fs@4.2.11: {}

  has-flag@3.0.0: {}

  has-flag@4.0.0: {}

  has-symbols@1.1.0: {}

  hasown@2.0.3:
    dependencies:
      function-bind: 1.1.2

  help-me@5.0.0: {}

  hermes-estree@0.29.1: {}

  hermes-estree@0.32.0: {}

  hermes-estree@0.35.0: {}

  hermes-parser@0.29.1:
    dependencies:
      hermes-estree: 0.29.1

  hermes-parser@0.32.0:
    dependencies:
      hermes-estree: 0.32.0

  hermes-parser@0.35.0:
    dependencies:
      hermes-estree: 0.35.0

  hoist-non-react-statics@3.3.2:
    dependencies:
      react-is: 16.13.1

  hosted-git-info@7.0.2:
    dependencies:
      lru-cache: 10.4.3

  http-cache-semantics@4.2.0: {}

  http-errors@2.0.1:
    dependencies:
      depd: 2.0.0
      inherits: 2.0.4
      setprototypeof: 1.2.0
      statuses: 2.0.2
      toidentifier: 1.0.1

  http2-wrapper@1.0.3:
    dependencies:
      quick-lru: 5.1.1
      resolve-alpn: 1.2.1

  https-proxy-agent@7.0.6:
    dependencies:
      agent-base: 7.1.4
      debug: 4.4.3
    transitivePeerDependencies:
      - supports-color

  human-signals@8.0.1: {}

  hyphenate-style-name@1.1.0: {}

  iconv-lite@0.7.2:
    dependencies:
      safer-buffer: 2.1.2

  ieee754@1.2.1: {}

  ignore@5.3.2: {}

  ignore@7.0.5: {}

  image-size@1.2.1:
    dependencies:
      queue: 6.0.2

  imurmurhash@0.1.4: {}

  inflight@1.0.6:
    dependencies:
      once: 1.4.0
      wrappy: 1.0.2

  inherits@2.0.4: {}

  ini@1.3.8: {}

  inline-style-prefixer@7.0.1:
    dependencies:
      css-in-js-utils: 3.1.0

  input-otp@1.4.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  internmap@2.0.3: {}

  invariant@2.2.4:
    dependencies:
      loose-envify: 1.4.0

  ipaddr.js@1.9.1: {}

  is-arrayish@0.3.4: {}

  is-core-module@2.16.2:
    dependencies:
      hasown: 2.0.3

  is-docker@2.2.1: {}

  is-extglob@2.1.1: {}

  is-fullwidth-code-point@3.0.0: {}

  is-glob@4.0.3:
    dependencies:
      is-extglob: 2.1.1

  is-network-error@1.3.2: {}

  is-number@7.0.0: {}

  is-path-inside@4.0.0: {}

  is-plain-obj@2.1.0: {}

  is-plain-obj@4.1.0: {}

  is-promise@4.0.0: {}

  is-stream@4.0.1: {}

  is-unicode-supported@2.1.0: {}

  is-wsl@2.2.0:
    dependencies:
      is-docker: 2.2.1

  isexe@2.0.0: {}

  istanbul-lib-coverage@3.2.2: {}

  istanbul-lib-instrument@5.2.1:
    dependencies:
      '@babel/core': 7.29.0
      '@babel/parser': 7.29.3
      '@istanbuljs/schema': 0.1.6
      istanbul-lib-coverage: 3.2.2
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  jest-environment-node@29.7.0:
    dependencies:
      '@jest/environment': 29.7.0
      '@jest/fake-timers': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 25.6.2
      jest-mock: 29.7.0
      jest-util: 29.7.0

  jest-get-type@29.6.3: {}

  jest-haste-map@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      '@types/graceful-fs': 4.1.9
      '@types/node': 25.6.2
      anymatch: 3.1.3
      fb-watchman: 2.0.2
      graceful-fs: 4.2.11
      jest-regex-util: 29.6.3
      jest-util: 29.7.0
      jest-worker: 29.7.0
      micromatch: 4.0.8
      walker: 1.0.8
    optionalDependencies:
      fsevents: 2.3.3

  jest-message-util@29.7.0:
    dependencies:
      '@babel/code-frame': 7.29.0
      '@jest/types': 29.6.3
      '@types/stack-utils': 2.0.3
      chalk: 4.1.2
      graceful-fs: 4.2.11
      micromatch: 4.0.8
      pretty-format: 29.7.0
      slash: 3.0.0
      stack-utils: 2.0.6

  jest-mock@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      '@types/node': 25.6.2
      jest-util: 29.7.0

  jest-regex-util@29.6.3: {}

  jest-util@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      '@types/node': 25.6.2
      chalk: 4.1.2
      ci-info: 3.9.0
      graceful-fs: 4.2.11
      picomatch: 2.3.2

  jest-validate@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      camelcase: 6.3.0
      chalk: 4.1.2
      jest-get-type: 29.6.3
      leven: 3.1.0
      pretty-format: 29.7.0

  jest-worker@29.7.0:
    dependencies:
      '@types/node': 25.6.2
      jest-util: 29.7.0
      merge-stream: 2.0.0
      supports-color: 8.1.1

  jimp-compact@0.16.1: {}

  jiti@2.7.0: {}

  joycon@3.1.1: {}

  js-tokens@4.0.0: {}

  js-yaml@3.14.2:
    dependencies:
      argparse: 1.0.10
      esprima: 4.0.1

  js-yaml@4.1.1:
    dependencies:
      argparse: 2.0.1

  jsc-safe-url@0.2.4: {}

  jsesc@3.1.0: {}

  json-buffer@3.0.1: {}

  json-schema-traverse@1.0.0: {}

  json5@2.2.3: {}

  jsonfile@6.2.1:
    dependencies:
      universalify: 2.0.1
    optionalDependencies:
      graceful-fs: 4.2.11

  jsonpointer@5.0.1: {}

  keyv@4.5.4:
    dependencies:
      json-buffer: 3.0.1

  kleur@3.0.3: {}

  lan-network@0.1.7: {}

  lan-network@0.2.1: {}

  leven@3.1.0: {}

  leven@4.1.0: {}

  lighthouse-logger@1.4.2:
    dependencies:
      debug: 2.6.9
      marky: 1.3.0
    transitivePeerDependencies:
      - supports-color

  lightningcss-linux-x64-gnu@1.32.0:
    optional: true

  lightningcss@1.32.0:
    dependencies:
      detect-libc: 2.1.2
    optionalDependencies:
      lightningcss-linux-x64-gnu: 1.32.0

  lines-and-columns@1.2.4: {}

  linkify-it@5.0.0:
    dependencies:
      uc.micro: 2.1.0

  locate-path@5.0.0:
    dependencies:
      p-locate: 4.1.0

  locate-path@8.0.0:
    dependencies:
      p-locate: 6.0.0

  lodash.debounce@4.0.8: {}

  lodash.throttle@4.1.1: {}

  lodash@4.18.1: {}

  log-symbols@2.2.0:
    dependencies:
      chalk: 2.4.2

  loose-envify@1.4.0:
    dependencies:
      js-tokens: 4.0.0

  lowercase-keys@2.0.0: {}

  lru-cache@10.4.3: {}

  lru-cache@11.5.0: {}

  lru-cache@5.1.1:
    dependencies:
      yallist: 3.1.1

  lucide-react@0.545.0(react@19.1.0):
    dependencies:
      react: 19.1.0

  lunr@2.3.9: {}

  magic-string@0.30.21:
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.5

  makeerror@1.0.12:
    dependencies:
      tmpl: 1.0.5

  markdown-it@14.1.1:
    dependencies:
      argparse: 2.0.1
      entities: 4.5.0
      linkify-it: 5.0.0
      mdurl: 2.0.0
      punycode.js: 2.3.1
      uc.micro: 2.1.0

  marky@1.3.0: {}

  math-intrinsics@1.1.0: {}

  mdn-data@2.0.14: {}

  mdurl@2.0.0: {}

  media-typer@1.1.0: {}

  memoize-one@5.2.1: {}

  memoize-one@6.0.0: {}

  merge-descriptors@2.0.0: {}

  merge-options@3.0.4:
    dependencies:
      is-plain-obj: 2.1.0

  merge-stream@2.0.0: {}

  merge2@1.4.1: {}

  metro-babel-transformer@0.83.3:
    dependencies:
      '@babel/core': 7.29.0
      flow-enums-runtime: 0.0.6
      hermes-parser: 0.32.0
      nullthrows: 1.1.1
    transitivePeerDependencies:
      - supports-color

  metro-babel-transformer@0.83.7:
    dependencies:
      '@babel/core': 7.29.0
      flow-enums-runtime: 0.0.6
      hermes-parser: 0.35.0
      metro-cache-key: 0.83.7
      nullthrows: 1.1.1
    transitivePeerDependencies:
      - supports-color

  metro-cache-key@0.83.3:
    dependencies:
      flow-enums-runtime: 0.0.6

  metro-cache-key@0.83.7:
    dependencies:
      flow-enums-runtime: 0.0.6

  metro-cache@0.83.3:
    dependencies:
      exponential-backoff: 3.1.3
      flow-enums-runtime: 0.0.6
      https-proxy-agent: 7.0.6
      metro-core: 0.83.3
    transitivePeerDependencies:
      - supports-color

  metro-cache@0.83.7:
    dependencies:
      exponential-backoff: 3.1.3
      flow-enums-runtime: 0.0.6
      https-proxy-agent: 7.0.6
      metro-core: 0.83.7
    transitivePeerDependencies:
      - supports-color

  metro-config@0.83.3:
    dependencies:
      connect: 3.7.0
      flow-enums-runtime: 0.0.6
      jest-validate: 29.7.0
      metro: 0.83.3
      metro-cache: 0.83.3
      metro-core: 0.83.3
      metro-runtime: 0.83.3
      yaml: 2.8.4
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  metro-config@0.83.7:
    dependencies:
      connect: 3.7.0
      flow-enums-runtime: 0.0.6
      jest-validate: 29.7.0
      metro: 0.83.7
      metro-cache: 0.83.7
      metro-core: 0.83.7
      metro-runtime: 0.83.7
      yaml: 2.8.4
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  metro-core@0.83.3:
    dependencies:
      flow-enums-runtime: 0.0.6
      lodash.throttle: 4.1.1
      metro-resolver: 0.83.3

  metro-core@0.83.7:
    dependencies:
      flow-enums-runtime: 0.0.6
      lodash.throttle: 4.1.1
      metro-resolver: 0.83.7

  metro-file-map@0.83.3:
    dependencies:
      debug: 4.4.3
      fb-watchman: 2.0.2
      flow-enums-runtime: 0.0.6
      graceful-fs: 4.2.11
      invariant: 2.2.4
      jest-worker: 29.7.0
      micromatch: 4.0.8
      nullthrows: 1.1.1
      walker: 1.0.8
    transitivePeerDependencies:
      - supports-color

  metro-file-map@0.83.7:
    dependencies:
      debug: 4.4.3
      fb-watchman: 2.0.2
      flow-enums-runtime: 0.0.6
      graceful-fs: 4.2.11
      invariant: 2.2.4
      jest-worker: 29.7.0
      micromatch: 4.0.8
      nullthrows: 1.1.1
      walker: 1.0.8
    transitivePeerDependencies:
      - supports-color

  metro-minify-terser@0.83.3:
    dependencies:
      flow-enums-runtime: 0.0.6
      terser: 5.47.1

  metro-minify-terser@0.83.7:
    dependencies:
      flow-enums-runtime: 0.0.6
      terser: 5.47.1

  metro-resolver@0.83.3:
    dependencies:
      flow-enums-runtime: 0.0.6

  metro-resolver@0.83.7:
    dependencies:
      flow-enums-runtime: 0.0.6

  metro-runtime@0.83.3:
    dependencies:
      '@babel/runtime': 7.29.2
      flow-enums-runtime: 0.0.6

  metro-runtime@0.83.7:
    dependencies:
      '@babel/runtime': 7.29.2
      flow-enums-runtime: 0.0.6

  metro-source-map@0.83.3:
    dependencies:
      '@babel/traverse': 7.29.0
      '@babel/traverse--for-generate-function-map': '@babel/traverse@7.29.0'
      '@babel/types': 7.29.0
      flow-enums-runtime: 0.0.6
      invariant: 2.2.4
      metro-symbolicate: 0.83.3
      nullthrows: 1.1.1
      ob1: 0.83.3
      source-map: 0.5.7
      vlq: 1.0.1
    transitivePeerDependencies:
      - supports-color

  metro-source-map@0.83.7:
    dependencies:
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
      flow-enums-runtime: 0.0.6
      invariant: 2.2.4
      metro-symbolicate: 0.83.7
      nullthrows: 1.1.1
      ob1: 0.83.7
      source-map: 0.5.7
      vlq: 1.0.1
    transitivePeerDependencies:
      - supports-color

  metro-symbolicate@0.83.3:
    dependencies:
      flow-enums-runtime: 0.0.6
      invariant: 2.2.4
      metro-source-map: 0.83.3
      nullthrows: 1.1.1
      source-map: 0.5.7
      vlq: 1.0.1
    transitivePeerDependencies:
      - supports-color

  metro-symbolicate@0.83.7:
    dependencies:
      flow-enums-runtime: 0.0.6
      invariant: 2.2.4
      metro-source-map: 0.83.7
      nullthrows: 1.1.1
      source-map: 0.5.7
      vlq: 1.0.1
    transitivePeerDependencies:
      - supports-color

  metro-transform-plugins@0.83.3:
    dependencies:
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      flow-enums-runtime: 0.0.6
      nullthrows: 1.1.1
    transitivePeerDependencies:
      - supports-color

  metro-transform-plugins@0.83.7:
    dependencies:
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      flow-enums-runtime: 0.0.6
      nullthrows: 1.1.1
    transitivePeerDependencies:
      - supports-color

  metro-transform-worker@0.83.3:
    dependencies:
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/parser': 7.29.3
      '@babel/types': 7.29.0
      flow-enums-runtime: 0.0.6
      metro: 0.83.3
      metro-babel-transformer: 0.83.3
      metro-cache: 0.83.3
      metro-cache-key: 0.83.3
      metro-minify-terser: 0.83.3
      metro-source-map: 0.83.3
      metro-transform-plugins: 0.83.3
      nullthrows: 1.1.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  metro-transform-worker@0.83.7:
    dependencies:
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/parser': 7.29.3
      '@babel/types': 7.29.0
      flow-enums-runtime: 0.0.6
      metro: 0.83.7
      metro-babel-transformer: 0.83.7
      metro-cache: 0.83.7
      metro-cache-key: 0.83.7
      metro-minify-terser: 0.83.7
      metro-source-map: 0.83.7
      metro-transform-plugins: 0.83.7
      nullthrows: 1.1.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  metro@0.83.3:
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/parser': 7.29.3
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
      accepts: 1.3.8
      chalk: 4.1.2
      ci-info: 2.0.0
      connect: 3.7.0
      debug: 4.4.3
      error-stack-parser: 2.1.4
      flow-enums-runtime: 0.0.6
      graceful-fs: 4.2.11
      hermes-parser: 0.32.0
      image-size: 1.2.1
      invariant: 2.2.4
      jest-worker: 29.7.0
      jsc-safe-url: 0.2.4
      lodash.throttle: 4.1.1
      metro-babel-transformer: 0.83.3
      metro-cache: 0.83.3
      metro-cache-key: 0.83.3
      metro-config: 0.83.3
      metro-core: 0.83.3
      metro-file-map: 0.83.3
      metro-resolver: 0.83.3
      metro-runtime: 0.83.3
      metro-source-map: 0.83.3
      metro-symbolicate: 0.83.3
      metro-transform-plugins: 0.83.3
      metro-transform-worker: 0.83.3
      mime-types: 2.1.35
      nullthrows: 1.1.1
      serialize-error: 2.1.0
      source-map: 0.5.7
      throat: 5.0.0
      ws: 7.5.10
      yargs: 17.7.2
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  metro@0.83.7:
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/core': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/parser': 7.29.3
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
      accepts: 2.0.0
      ci-info: 2.0.0
      connect: 3.7.0
      debug: 4.4.3
      error-stack-parser: 2.1.4
      flow-enums-runtime: 0.0.6
      graceful-fs: 4.2.11
      hermes-parser: 0.35.0
      image-size: 1.2.1
      invariant: 2.2.4
      jest-worker: 29.7.0
      jsc-safe-url: 0.2.4
      lodash.throttle: 4.1.1
      metro-babel-transformer: 0.83.7
      metro-cache: 0.83.7
      metro-cache-key: 0.83.7
      metro-config: 0.83.7
      metro-core: 0.83.7
      metro-file-map: 0.83.7
      metro-resolver: 0.83.7
      metro-runtime: 0.83.7
      metro-source-map: 0.83.7
      metro-symbolicate: 0.83.7
      metro-transform-plugins: 0.83.7
      metro-transform-worker: 0.83.7
      mime-types: 3.0.2
      nullthrows: 1.1.1
      serialize-error: 2.1.0
      source-map: 0.5.7
      throat: 5.0.0
      ws: 7.5.10
      yargs: 17.7.2
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  micromatch@4.0.8:
    dependencies:
      braces: 3.0.3
      picomatch: 2.3.2

  mime-db@1.52.0: {}

  mime-db@1.54.0: {}

  mime-types@2.1.35:
    dependencies:
      mime-db: 1.52.0

  mime-types@3.0.2:
    dependencies:
      mime-db: 1.54.0

  mime@1.6.0: {}

  mimic-fn@1.2.0: {}

  mimic-response@1.0.1: {}

  mimic-response@3.1.0: {}

  minimatch@10.2.5:
    dependencies:
      brace-expansion: 5.0.6

  minimatch@3.1.5:
    dependencies:
      brace-expansion: 1.1.14

  minimatch@9.0.9:
    dependencies:
      brace-expansion: 2.1.0

  minimist@1.2.8: {}

  minipass@7.1.3: {}

  minizlib@3.1.0:
    dependencies:
      minipass: 7.1.3

  mkdirp@1.0.4: {}

  modern-screenshot@4.7.0: {}

  motion-dom@12.38.0:
    dependencies:
      motion-utils: 12.36.0

  motion-utils@12.36.0: {}

  ms@2.0.0: {}

  ms@2.1.3: {}

  mz@2.7.0:
    dependencies:
      any-promise: 1.3.0
      object-assign: 4.1.1
      thenify-all: 1.6.0

  nanoid@3.3.12: {}

  negotiator@0.6.3: {}

  negotiator@0.6.4: {}

  negotiator@1.0.0: {}

  nested-error-stacks@2.0.1: {}

  next-themes@0.4.6(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  node-fetch@2.7.0:
    dependencies:
      whatwg-url: 5.0.0

  node-forge@1.4.0: {}

  node-int64@0.4.0: {}

  node-releases@2.0.38: {}

  normalize-path@3.0.0: {}

  normalize-url@6.1.0: {}

  npm-package-arg@11.0.3:
    dependencies:
      hosted-git-info: 7.0.2
      proc-log: 4.2.0
      semver: 7.8.0
      validate-npm-package-name: 5.0.1

  npm-run-path@6.0.0:
    dependencies:
      path-key: 4.0.0
      unicorn-magic: 0.3.0

  nth-check@2.1.1:
    dependencies:
      boolbase: 1.0.0

  nullthrows@1.1.1: {}

  ob1@0.83.3:
    dependencies:
      flow-enums-runtime: 0.0.6

  ob1@0.83.7:
    dependencies:
      flow-enums-runtime: 0.0.6

  object-assign@4.1.1: {}

  object-inspect@1.13.4: {}

  on-exit-leak-free@2.1.2: {}

  on-finished@2.3.0:
    dependencies:
      ee-first: 1.1.1

  on-finished@2.4.1:
    dependencies:
      ee-first: 1.1.1

  on-headers@1.1.0: {}

  once@1.4.0:
    dependencies:
      wrappy: 1.0.2

  onetime@2.0.1:
    dependencies:
      mimic-fn: 1.2.0

  open@7.4.2:
    dependencies:
      is-docker: 2.2.1
      is-wsl: 2.2.0

  open@8.4.2:
    dependencies:
      define-lazy-prop: 2.0.0
      is-docker: 2.2.1
      is-wsl: 2.2.0

  openai@6.38.0(ws@8.20.1)(zod@3.25.76):
    optionalDependencies:
      ws: 8.20.1
      zod: 3.25.76

  ora@3.4.0:
    dependencies:
      chalk: 2.4.2
      cli-cursor: 2.1.0
      cli-spinners: 2.9.2
      log-symbols: 2.2.0
      strip-ansi: 5.2.0
      wcwidth: 1.0.1

  orval@8.9.1(prettier@3.8.3)(typescript@5.9.3):
    dependencies:
      '@commander-js/extra-typings': 14.0.0(commander@14.0.3)
      '@orval/angular': 8.9.1(typescript@5.9.3)
      '@orval/axios': 8.9.1(typescript@5.9.3)
      '@orval/core': 8.9.1(typescript@5.9.3)
      '@orval/fetch': 8.9.1(typescript@5.9.3)
      '@orval/hono': 8.9.1(typescript@5.9.3)
      '@orval/mcp': 8.9.1(typescript@5.9.3)
      '@orval/mock': 8.9.1(typescript@5.9.3)
      '@orval/query': 8.9.1(typescript@5.9.3)
      '@orval/solid-start': 8.9.1(typescript@5.9.3)
      '@orval/swr': 8.9.1(typescript@5.9.3)
      '@orval/zod': 8.9.1(typescript@5.9.3)
      '@scalar/json-magic': 0.12.12
      '@scalar/openapi-parser': 0.25.12
      '@scalar/openapi-types': 0.8.0
      chokidar: 5.0.0
      commander: 14.0.3
      enquirer: 2.4.1
      execa: 9.6.1
      find-up: 8.0.0
      fs-extra: 11.3.5
      jiti: 2.7.0
      js-yaml: 4.1.1
      remeda: 2.34.0
      string-argv: 0.3.2
      tsconfck: 3.1.6(typescript@5.9.3)
      typedoc: 0.28.19(typescript@5.9.3)
      typedoc-plugin-coverage: 4.0.3(typedoc@0.28.19(typescript@5.9.3))
      typedoc-plugin-markdown: 4.11.0(typedoc@0.28.19(typescript@5.9.3))
    optionalDependencies:
      prettier: 3.8.3
    transitivePeerDependencies:
      - '@faker-js/faker'
      - supports-color
      - typescript

  p-cancelable@2.1.1: {}

  p-limit@2.3.0:
    dependencies:
      p-try: 2.2.0

  p-limit@3.1.0:
    dependencies:
      yocto-queue: 0.1.0

  p-limit@4.0.0:
    dependencies:
      yocto-queue: 1.2.2

  p-limit@7.3.0:
    dependencies:
      yocto-queue: 1.2.2

  p-locate@4.1.0:
    dependencies:
      p-limit: 2.3.0

  p-locate@6.0.0:
    dependencies:
      p-limit: 4.0.0

  p-retry@7.1.1:
    dependencies:
      is-network-error: 1.3.2

  p-try@2.2.0: {}

  parse-ms@4.0.0: {}

  parse-png@2.1.0:
    dependencies:
      pngjs: 3.4.0

  parseurl@1.3.3: {}

  path-exists@4.0.0: {}

  path-is-absolute@1.0.1: {}

  path-key@3.1.1: {}

  path-key@4.0.0: {}

  path-parse@1.0.7: {}

  path-scurry@2.0.2:
    dependencies:
      lru-cache: 11.5.0
      minipass: 7.1.3

  path-to-regexp@8.4.2: {}

  pathe@2.0.3: {}

  pg-cloudflare@1.3.0:
    optional: true

  pg-connection-string@2.12.0: {}

  pg-int8@1.0.1: {}

  pg-pool@3.13.0(pg@8.20.0):
    dependencies:
      pg: 8.20.0

  pg-protocol@1.13.0: {}

  pg-types@2.2.0:
    dependencies:
      pg-int8: 1.0.1
      postgres-array: 2.0.0
      postgres-bytea: 1.0.1
      postgres-date: 1.0.7
      postgres-interval: 1.2.0

  pg@8.20.0:
    dependencies:
      pg-connection-string: 2.12.0
      pg-pool: 3.13.0(pg@8.20.0)
      pg-protocol: 1.13.0
      pg-types: 2.2.0
      pgpass: 1.0.5
    optionalDependencies:
      pg-cloudflare: 1.3.0

  pgpass@1.0.5:
    dependencies:
      split2: 4.2.0

  picocolors@1.1.1: {}

  picomatch@2.3.2: {}

  picomatch@3.0.2: {}

  picomatch@4.0.4: {}

  pino-abstract-transport@2.0.0:
    dependencies:
      split2: 4.2.0

  pino-abstract-transport@3.0.0:
    dependencies:
      split2: 4.2.0

  pino-http@10.5.0:
    dependencies:
      get-caller-file: 2.0.5
      pino: 9.14.0
      pino-std-serializers: 7.1.0
      process-warning: 5.0.0

  pino-pretty@13.1.3:
    dependencies:
      colorette: 2.0.20
      dateformat: 4.6.3
      fast-copy: 4.0.3
      fast-safe-stringify: 2.1.1
      help-me: 5.0.0
      joycon: 3.1.1
      minimist: 1.2.8
      on-exit-leak-free: 2.1.2
      pino-abstract-transport: 3.0.0
      pump: 3.0.4
      secure-json-parse: 4.1.0
      sonic-boom: 4.2.1
      strip-json-comments: 5.0.3

  pino-std-serializers@7.1.0: {}

  pino@9.14.0:
    dependencies:
      '@pinojs/redact': 0.4.0
      atomic-sleep: 1.0.0
      on-exit-leak-free: 2.1.2
      pino-abstract-transport: 2.0.0
      pino-std-serializers: 7.1.0
      process-warning: 5.0.0
      quick-format-unescaped: 4.0.4
      real-require: 0.2.0
      safe-stable-stringify: 2.5.0
      sonic-boom: 4.2.1
      thread-stream: 3.1.0

  pirates@4.0.7: {}

  plist@3.1.1:
    dependencies:
      '@xmldom/xmldom': 0.9.10
      base64-js: 1.5.1
      xmlbuilder: 15.1.1

  pngjs@3.4.0: {}

  postcss-value-parser@4.2.0: {}

  postcss@8.4.49:
    dependencies:
      nanoid: 3.3.12
      picocolors: 1.1.1
      source-map-js: 1.2.1

  postcss@8.5.14:
    dependencies:
      nanoid: 3.3.12
      picocolors: 1.1.1
      source-map-js: 1.2.1

  postgres-array@2.0.0: {}

  postgres-bytea@1.0.1: {}

  postgres-date@1.0.7: {}

  postgres-interval@1.2.0:
    dependencies:
      xtend: 4.0.2

  prettier@3.8.3: {}

  pretty-bytes@5.6.0: {}

  pretty-format@29.7.0:
    dependencies:
      '@jest/schemas': 29.6.3
      ansi-styles: 5.2.0
      react-is: 18.3.1

  pretty-ms@9.3.0:
    dependencies:
      parse-ms: 4.0.0

  proc-log@4.2.0: {}

  process-warning@5.0.0: {}

  progress@2.0.3: {}

  promise@7.3.1:
    dependencies:
      asap: 2.0.6

  promise@8.3.0:
    dependencies:
      asap: 2.0.6

  prompts@2.4.2:
    dependencies:
      kleur: 3.0.3
      sisteransi: 1.0.5

  prop-types@15.8.1:
    dependencies:
      loose-envify: 1.4.0
      object-assign: 4.1.1
      react-is: 16.13.1

  proxy-addr@2.0.7:
    dependencies:
      forwarded: 0.2.0
      ipaddr.js: 1.9.1

  pump@3.0.4:
    dependencies:
      end-of-stream: 1.4.5
      once: 1.4.0

  punycode.js@2.3.1: {}

  punycode@2.3.1: {}

  qrcode-terminal@0.11.0: {}

  qs@6.15.1:
    dependencies:
      side-channel: 1.1.0

  query-string@7.1.3:
    dependencies:
      decode-uri-component: 0.2.2
      filter-obj: 1.1.0
      split-on-first: 1.1.0
      strict-uri-encode: 2.0.0

  queue-microtask@1.2.3: {}

  queue@6.0.2:
    dependencies:
      inherits: 2.0.4

  quick-format-unescaped@4.0.4: {}

  quick-lru@5.1.1: {}

  range-parser@1.2.1: {}

  raw-body@3.0.2:
    dependencies:
      bytes: 3.1.2
      http-errors: 2.0.1
      iconv-lite: 0.7.2
      unpipe: 1.0.0

  rc@1.2.8:
    dependencies:
      deep-extend: 0.6.0
      ini: 1.3.8
      minimist: 1.2.8
      strip-json-comments: 2.0.1

  react-day-picker@9.14.0(react@19.1.0):
    dependencies:
      '@date-fns/tz': 1.4.1
      '@tabby_ai/hijri-converter': 1.0.5
      date-fns: 4.1.0
      date-fns-jalali: 4.1.0-0
      react: 19.1.0

  react-devtools-core@6.1.5:
    dependencies:
      shell-quote: 1.8.3
      ws: 7.5.10
    transitivePeerDependencies:
      - bufferutil
      - utf-8-validate

  react-dom@19.1.0(react@19.1.0):
    dependencies:
      react: 19.1.0
      scheduler: 0.26.0

  react-fast-compare@3.2.2: {}

  react-freeze@1.0.4(react@19.1.0):
    dependencies:
      react: 19.1.0

  react-hook-form@7.75.0(react@19.1.0):
    dependencies:
      react: 19.1.0

  react-is@16.13.1: {}

  react-is@18.3.1: {}

  react-is@19.2.6: {}

  react-native-gesture-handler@2.28.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      '@egjs/hammerjs': 2.0.17
      hoist-non-react-statics: 3.3.2
      invariant: 2.2.4
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  react-native-is-edge-to-edge@1.3.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  react-native-keyboard-controller@1.18.5(react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-is-edge-to-edge: 1.3.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-reanimated: 4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)

  react-native-reanimated@4.1.7(react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0))(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-is-edge-to-edge: 1.3.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      react-native-worklets: 0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      semver: 7.8.0

  react-native-safe-area-context@5.6.2(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)

  react-native-screens@4.16.0(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-freeze: 1.0.4(react@19.1.0)
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      react-native-is-edge-to-edge: 1.3.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      warn-once: 0.1.1

  react-native-svg@15.12.1(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      css-select: 5.2.2
      css-tree: 1.1.3
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      warn-once: 0.1.1

  react-native-web@0.21.2(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      '@babel/runtime': 7.29.2
      '@react-native/normalize-colors': 0.74.89
      fbjs: 3.0.5
      inline-style-prefixer: 7.0.1
      memoize-one: 6.0.0
      nullthrows: 1.1.1
      postcss-value-parser: 4.2.0
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      styleq: 0.1.3
    transitivePeerDependencies:
      - encoding

  react-native-worklets@0.5.1(@babel/core@7.29.0)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0):
    dependencies:
      '@babel/core': 7.29.0
      '@babel/plugin-transform-arrow-functions': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-class-properties': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-classes': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-nullish-coalescing-operator': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-optional-chaining': 7.28.6(@babel/core@7.29.0)
      '@babel/plugin-transform-shorthand-properties': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-template-literals': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-unicode-regex': 7.27.1(@babel/core@7.29.0)
      '@babel/preset-typescript': 7.28.5(@babel/core@7.29.0)
      convert-source-map: 2.0.0
      react: 19.1.0
      react-native: 0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0)
      semver: 7.7.2
    transitivePeerDependencies:
      - supports-color

  react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0):
    dependencies:
      '@jest/create-cache-key-function': 29.7.0
      '@react-native/assets-registry': 0.81.5
      '@react-native/codegen': 0.81.5(@babel/core@7.29.0)
      '@react-native/community-cli-plugin': 0.81.5
      '@react-native/gradle-plugin': 0.81.5
      '@react-native/js-polyfills': 0.81.5
      '@react-native/normalize-colors': 0.81.5
      '@react-native/virtualized-lists': 0.81.5(@types/react@19.1.17)(react-native@0.81.5(@babel/core@7.29.0)(@types/react@19.1.17)(react@19.1.0))(react@19.1.0)
      abort-controller: 3.0.0
      anser: 1.4.10
      ansi-regex: 5.0.1
      babel-jest: 29.7.0(@babel/core@7.29.0)
      babel-plugin-syntax-hermes-parser: 0.29.1
      base64-js: 1.5.1
      commander: 12.1.0
      flow-enums-runtime: 0.0.6
      glob: 7.2.3
      invariant: 2.2.4
      jest-environment-node: 29.7.0
      memoize-one: 5.2.1
      metro-runtime: 0.83.7
      metro-source-map: 0.83.7
      nullthrows: 1.1.1
      pretty-format: 29.7.0
      promise: 8.3.0
      react: 19.1.0
      react-devtools-core: 6.1.5
      react-refresh: 0.14.2
      regenerator-runtime: 0.13.11
      scheduler: 0.26.0
      semver: 7.8.0
      stacktrace-parser: 0.1.11
      whatwg-fetch: 3.6.20
      ws: 6.2.3
      yargs: 17.7.2
    optionalDependencies:
      '@types/react': 19.1.17
    transitivePeerDependencies:
      - '@babel/core'
      - '@react-native-community/cli'
      - '@react-native/metro-config'
      - bufferutil
      - supports-color
      - utf-8-validate

  react-refresh@0.14.2: {}

  react-refresh@0.18.0: {}

  react-remove-scroll-bar@2.3.8(@types/react@19.1.17)(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-style-singleton: 2.2.3(@types/react@19.1.17)(react@19.1.0)
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.1.17

  react-remove-scroll-bar@2.3.8(@types/react@19.2.14)(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-style-singleton: 2.2.3(@types/react@19.2.14)(react@19.1.0)
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.14

  react-remove-scroll@2.7.2(@types/react@19.1.17)(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-remove-scroll-bar: 2.3.8(@types/react@19.1.17)(react@19.1.0)
      react-style-singleton: 2.2.3(@types/react@19.1.17)(react@19.1.0)
      tslib: 2.8.1
      use-callback-ref: 1.3.3(@types/react@19.1.17)(react@19.1.0)
      use-sidecar: 1.1.3(@types/react@19.1.17)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.1.17

  react-remove-scroll@2.7.2(@types/react@19.2.14)(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-remove-scroll-bar: 2.3.8(@types/react@19.2.14)(react@19.1.0)
      react-style-singleton: 2.2.3(@types/react@19.2.14)(react@19.1.0)
      tslib: 2.8.1
      use-callback-ref: 1.3.3(@types/react@19.2.14)(react@19.1.0)
      use-sidecar: 1.1.3(@types/react@19.2.14)(react@19.1.0)
    optionalDependencies:
      '@types/react': 19.2.14

  react-resizable-panels@2.1.9(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  react-smooth@4.0.4(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      fast-equals: 5.4.0
      prop-types: 15.8.1
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-transition-group: 4.4.5(react-dom@19.1.0(react@19.1.0))(react@19.1.0)

  react-style-singleton@2.2.3(@types/react@19.1.17)(react@19.1.0):
    dependencies:
      get-nonce: 1.0.1
      react: 19.1.0
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.1.17

  react-style-singleton@2.2.3(@types/react@19.2.14)(react@19.1.0):
    dependencies:
      get-nonce: 1.0.1
      react: 19.1.0
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.14

  react-transition-group@4.4.5(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      '@babel/runtime': 7.29.2
      dom-helpers: 5.2.1
      loose-envify: 1.4.0
      prop-types: 15.8.1
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  react@19.1.0: {}

  readdirp@4.1.2: {}

  readdirp@5.0.0: {}

  real-require@0.2.0: {}

  recharts-scale@0.4.5:
    dependencies:
      decimal.js-light: 2.5.1

  recharts@2.15.4(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      clsx: 2.1.1
      eventemitter3: 4.0.7
      lodash: 4.18.1
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
      react-is: 18.3.1
      react-smooth: 4.0.4(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      recharts-scale: 0.4.5
      tiny-invariant: 1.3.3
      victory-vendor: 36.9.2

  regenerate-unicode-properties@10.2.2:
    dependencies:
      regenerate: 1.4.2

  regenerate@1.4.2: {}

  regenerator-runtime@0.13.11: {}

  regexpu-core@6.4.0:
    dependencies:
      regenerate: 1.4.2
      regenerate-unicode-properties: 10.2.2
      regjsgen: 0.8.0
      regjsparser: 0.13.1
      unicode-match-property-ecmascript: 2.0.0
      unicode-match-property-value-ecmascript: 2.2.1

  regjsgen@0.8.0: {}

  regjsparser@0.13.1:
    dependencies:
      jsesc: 3.1.0

  remeda@2.34.0: {}

  require-directory@2.1.1: {}

  require-from-string@2.0.2: {}

  requireg@0.2.2:
    dependencies:
      nested-error-stacks: 2.0.1
      rc: 1.2.8
      resolve: 1.7.1

  resolve-alpn@1.2.1: {}

  resolve-from@5.0.0: {}

  resolve-pkg-maps@1.0.0: {}

  resolve-workspace-root@2.0.1: {}

  resolve.exports@2.0.3: {}

  resolve@1.22.12:
    dependencies:
      es-errors: 1.3.0
      is-core-module: 2.16.2
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0

  resolve@1.7.1:
    dependencies:
      path-parse: 1.0.7

  responselike@2.0.1:
    dependencies:
      lowercase-keys: 2.0.0

  restore-cursor@2.0.0:
    dependencies:
      onetime: 2.0.1
      signal-exit: 3.0.7

  reusify@1.1.0: {}

  rimraf@3.0.2:
    dependencies:
      glob: 7.2.3

  rollup@4.60.3:
    dependencies:
      '@types/estree': 1.0.8
    optionalDependencies:
      '@rollup/rollup-linux-x64-gnu': 4.60.3
      fsevents: 2.3.3

  router@2.2.0:
    dependencies:
      debug: 4.4.3
      depd: 2.0.0
      is-promise: 4.0.0
      parseurl: 1.3.3
      path-to-regexp: 8.4.2
    transitivePeerDependencies:
      - supports-color

  run-parallel@1.2.0:
    dependencies:
      queue-microtask: 1.2.3

  safe-buffer@5.2.1: {}

  safe-stable-stringify@2.5.0: {}

  safer-buffer@2.1.2: {}

  sax@1.6.0: {}

  scheduler@0.26.0: {}

  secure-json-parse@4.1.0: {}

  semver@6.3.1: {}

  semver@7.6.3: {}

  semver@7.7.2: {}

  semver@7.8.0: {}

  send@0.19.2:
    dependencies:
      debug: 2.6.9
      depd: 2.0.0
      destroy: 1.2.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      fresh: 0.5.2
      http-errors: 2.0.1
      mime: 1.6.0
      ms: 2.1.3
      on-finished: 2.4.1
      range-parser: 1.2.1
      statuses: 2.0.2
    transitivePeerDependencies:
      - supports-color

  send@1.2.1:
    dependencies:
      debug: 4.4.3
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      fresh: 2.0.0
      http-errors: 2.0.1
      mime-types: 3.0.2
      ms: 2.1.3
      on-finished: 2.4.1
      range-parser: 1.2.1
      statuses: 2.0.2
    transitivePeerDependencies:
      - supports-color

  serialize-error@2.1.0: {}

  serve-static@1.16.3:
    dependencies:
      encodeurl: 2.0.0
      escape-html: 1.0.3
      parseurl: 1.3.3
      send: 0.19.2
    transitivePeerDependencies:
      - supports-color

  serve-static@2.2.1:
    dependencies:
      encodeurl: 2.0.0
      escape-html: 1.0.3
      parseurl: 1.3.3
      send: 1.2.1
    transitivePeerDependencies:
      - supports-color

  server-only@0.0.1: {}

  setimmediate@1.0.5: {}

  setprototypeof@1.2.0: {}

  sf-symbols-typescript@2.2.0: {}

  shallowequal@1.1.0: {}

  shebang-command@2.0.0:
    dependencies:
      shebang-regex: 3.0.0

  shebang-regex@3.0.0: {}

  shell-quote@1.8.3: {}

  side-channel-list@1.0.1:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4

  side-channel-map@1.0.1:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      object-inspect: 1.13.4

  side-channel-weakmap@1.0.2:
    dependencies:
      call-bound: 1.0.4
      es-errors: 1.3.0
      get-intrinsic: 1.3.0
      object-inspect: 1.13.4
      side-channel-map: 1.0.1

  side-channel@1.1.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4
      side-channel-list: 1.0.1
      side-channel-map: 1.0.1
      side-channel-weakmap: 1.0.2

  signal-exit@3.0.7: {}

  signal-exit@4.1.0: {}

  simple-plist@1.3.1:
    dependencies:
      bplist-creator: 0.1.0
      bplist-parser: 0.3.1
      plist: 3.1.1

  simple-swizzle@0.2.4:
    dependencies:
      is-arrayish: 0.3.4

  sisteransi@1.0.5: {}

  slash@3.0.0: {}

  slash@5.1.0: {}

  slugify@1.6.9: {}

  sonic-boom@4.2.1:
    dependencies:
      atomic-sleep: 1.0.0

  sonner@2.0.7(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)

  source-map-js@1.2.1: {}

  source-map-support@0.5.21:
    dependencies:
      buffer-from: 1.1.2
      source-map: 0.6.1

  source-map@0.5.7: {}

  source-map@0.6.1: {}

  split-on-first@1.1.0: {}

  split2@4.2.0: {}

  sprintf-js@1.0.3: {}

  stack-utils@2.0.6:
    dependencies:
      escape-string-regexp: 2.0.0

  stackframe@1.3.4: {}

  stacktrace-parser@0.1.11:
    dependencies:
      type-fest: 0.7.1

  statuses@1.5.0: {}

  statuses@2.0.2: {}

  stream-buffers@2.2.0: {}

  strict-uri-encode@2.0.0: {}

  string-argv@0.3.2: {}

  string-width@4.2.3:
    dependencies:
      emoji-regex: 8.0.0
      is-fullwidth-code-point: 3.0.0
      strip-ansi: 6.0.1

  strip-ansi@5.2.0:
    dependencies:
      ansi-regex: 4.1.1

  strip-ansi@6.0.1:
    dependencies:
      ansi-regex: 5.0.1

  strip-final-newline@4.0.0: {}

  strip-json-comments@2.0.1: {}

  strip-json-comments@5.0.3: {}

  structured-headers@0.4.1: {}

  styleq@0.1.3: {}

  sucrase@3.35.1:
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      commander: 4.1.1
      lines-and-columns: 1.2.4
      mz: 2.7.0
      pirates: 4.0.7
      tinyglobby: 0.2.16
      ts-interface-checker: 0.1.13

  supports-color@5.5.0:
    dependencies:
      has-flag: 3.0.0

  supports-color@7.2.0:
    dependencies:
      has-flag: 4.0.0

  supports-color@8.1.1:
    dependencies:
      has-flag: 4.0.0

  supports-hyperlinks@2.3.0:
    dependencies:
      has-flag: 4.0.0
      supports-color: 7.2.0

  supports-preserve-symlinks-flag@1.0.0: {}

  tailwind-merge@3.5.0: {}

  tailwindcss-animate@1.0.7(tailwindcss@4.3.0):
    dependencies:
      tailwindcss: 4.3.0

  tailwindcss@4.3.0: {}

  tapable@2.3.3: {}

  tar@7.5.15:
    dependencies:
      '@isaacs/fs-minipass': 4.0.1
      chownr: 3.0.0
      minipass: 7.1.3
      minizlib: 3.1.0
      yallist: 5.0.0

  terminal-link@2.1.1:
    dependencies:
      ansi-escapes: 4.3.2
      supports-hyperlinks: 2.3.0

  terser@5.47.1:
    dependencies:
      '@jridgewell/source-map': 0.3.11
      acorn: 8.16.0
      commander: 2.20.3
      source-map-support: 0.5.21

  test-exclude@6.0.0:
    dependencies:
      '@istanbuljs/schema': 0.1.6
      glob: 7.2.3
      minimatch: 3.1.5

  thenify-all@1.6.0:
    dependencies:
      thenify: 3.3.1

  thenify@3.3.1:
    dependencies:
      any-promise: 1.3.0

  thread-stream@3.1.0:
    dependencies:
      real-require: 0.2.0

  throat@5.0.0: {}

  tiny-invariant@1.3.3: {}

  tinyglobby@0.2.16:
    dependencies:
      fdir: 6.5.0(picomatch@4.0.4)
      picomatch: 4.0.4

  tmpl@1.0.5: {}

  to-regex-range@5.0.1:
    dependencies:
      is-number: 7.0.0

  toidentifier@1.0.1: {}

  tr46@0.0.3: {}

  ts-interface-checker@0.1.13: {}

  tsconfck@3.1.6(typescript@5.9.3):
    optionalDependencies:
      typescript: 5.9.3

  tslib@2.8.1: {}

  tsx@4.21.0:
    dependencies:
      esbuild: 0.27.3
      get-tsconfig: 4.14.0
    optionalDependencies:
      fsevents: 2.3.3

  tw-animate-css@1.4.0: {}

  type-detect@4.0.8: {}

  type-fest@0.21.3: {}

  type-fest@0.7.1: {}

  type-is@2.0.1:
    dependencies:
      content-type: 1.0.5
      media-typer: 1.1.0
      mime-types: 3.0.2

  typedoc-plugin-coverage@4.0.3(typedoc@0.28.19(typescript@5.9.3)):
    dependencies:
      typedoc: 0.28.19(typescript@5.9.3)

  typedoc-plugin-markdown@4.11.0(typedoc@0.28.19(typescript@5.9.3)):
    dependencies:
      typedoc: 0.28.19(typescript@5.9.3)

  typedoc@0.28.19(typescript@5.9.3):
    dependencies:
      '@gerrit0/mini-shiki': 3.23.0
      lunr: 2.3.9
      markdown-it: 14.1.1
      minimatch: 10.2.5
      typescript: 5.9.3
      yaml: 2.8.4

  typescript@5.9.3: {}

  ua-parser-js@1.0.41: {}

  uc.micro@2.1.0: {}

  undici-types@7.19.2: {}

  undici@6.25.0: {}

  unicode-canonical-property-names-ecmascript@2.0.1: {}

  unicode-match-property-ecmascript@2.0.0:
    dependencies:
      unicode-canonical-property-names-ecmascript: 2.0.1
      unicode-property-aliases-ecmascript: 2.2.0

  unicode-match-property-value-ecmascript@2.2.1: {}

  unicode-property-aliases-ecmascript@2.2.0: {}

  unicorn-magic@0.3.0: {}

  unicorn-magic@0.4.0: {}

  universalify@2.0.1: {}

  unpipe@1.0.0: {}

  update-browserslist-db@1.2.3(browserslist@4.28.2):
    dependencies:
      browserslist: 4.28.2
      escalade: 3.2.0
      picocolors: 1.1.1

  use-callback-ref@1.3.3(@types/react@19.1.17)(react@19.1.0):
    dependencies:
      react: 19.1.0
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.1.17

  use-callback-ref@1.3.3(@types/react@19.2.14)(react@19.1.0):
    dependencies:
      react: 19.1.0
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.14

  use-latest-callback@0.2.6(react@19.1.0):
    dependencies:
      react: 19.1.0

  use-sidecar@1.1.3(@types/react@19.1.17)(react@19.1.0):
    dependencies:
      detect-node-es: 1.1.0
      react: 19.1.0
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.1.17

  use-sidecar@1.1.3(@types/react@19.2.14)(react@19.1.0):
    dependencies:
      detect-node-es: 1.1.0
      react: 19.1.0
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 19.2.14

  use-sync-external-store@1.6.0(react@19.1.0):
    dependencies:
      react: 19.1.0

  utils-merge@1.0.1: {}

  uuid@3.4.0: {}

  uuid@7.0.3: {}

  validate-npm-package-name@5.0.1: {}

  vary@1.1.2: {}

  vaul@1.1.2(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.1.11(@types/react@19.1.17))(@types/react@19.1.17)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    transitivePeerDependencies:
      - '@types/react'
      - '@types/react-dom'

  vaul@1.1.2(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0):
    dependencies:
      '@radix-ui/react-dialog': 1.1.15(@types/react-dom@19.2.3(@types/react@19.2.14))(@types/react@19.2.14)(react-dom@19.1.0(react@19.1.0))(react@19.1.0)
      react: 19.1.0
      react-dom: 19.1.0(react@19.1.0)
    transitivePeerDependencies:
      - '@types/react'
      - '@types/react-dom'

  victory-vendor@36.9.2:
    dependencies:
      '@types/d3-array': 3.2.2
      '@types/d3-ease': 3.0.2
      '@types/d3-interpolate': 3.0.4
      '@types/d3-scale': 4.0.9
      '@types/d3-shape': 3.1.8
      '@types/d3-time': 3.0.4
      '@types/d3-timer': 3.0.2
      d3-array: 3.2.4
      d3-ease: 3.0.1
      d3-interpolate: 3.0.1
      d3-scale: 4.0.2
      d3-shape: 3.2.0
      d3-time: 3.1.0
      d3-timer: 3.0.1

  vite@7.3.3(@types/node@25.6.2)(jiti@2.7.0)(lightningcss@1.32.0)(terser@5.47.1)(tsx@4.21.0)(yaml@2.8.4):
    dependencies:
      esbuild: 0.27.3
      fdir: 6.5.0(picomatch@4.0.4)
      picomatch: 4.0.4
      postcss: 8.5.14
      rollup: 4.60.3
      tinyglobby: 0.2.16
    optionalDependencies:
      '@types/node': 25.6.2
      fsevents: 2.3.3
      jiti: 2.7.0
      lightningcss: 1.32.0
      terser: 5.47.1
      tsx: 4.21.0
      yaml: 2.8.4

  vlq@1.0.1: {}

  walker@1.0.8:
    dependencies:
      makeerror: 1.0.12

  warn-once@0.1.1: {}

  wcwidth@1.0.1:
    dependencies:
      defaults: 1.0.4

  webidl-conversions@3.0.1: {}

  webidl-conversions@5.0.0: {}

  whatwg-fetch@3.6.20: {}

  whatwg-url-without-unicode@8.0.0-3:
    dependencies:
      buffer: 5.7.1
      punycode: 2.3.1
      webidl-conversions: 5.0.0

  whatwg-url@5.0.0:
    dependencies:
      tr46: 0.0.3
      webidl-conversions: 3.0.1

  which@2.0.2:
    dependencies:
      isexe: 2.0.0

  wonka@6.3.6: {}

  wrap-ansi@7.0.0:
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1

  wrappy@1.0.2: {}

  write-file-atomic@4.0.2:
    dependencies:
      imurmurhash: 0.1.4
      signal-exit: 3.0.7

  ws@6.2.3:
    dependencies:
      async-limiter: 1.0.1

  ws@7.5.10: {}

  ws@8.20.1: {}

  xcode@3.0.1:
    dependencies:
      simple-plist: 1.3.1
      uuid: 7.0.3

  xml2js@0.6.0:
    dependencies:
      sax: 1.6.0
      xmlbuilder: 11.0.1

  xmlbuilder@11.0.1: {}

  xmlbuilder@15.1.1: {}

  xtend@4.0.2: {}

  y18n@5.0.8: {}

  yallist@3.1.1: {}

  yallist@5.0.0: {}

  yaml@1.10.3: {}

  yaml@2.8.4: {}

  yargs-parser@21.1.1: {}

  yargs@17.7.2:
    dependencies:
      cliui: 8.0.1
      escalade: 3.2.0
      get-caller-file: 2.0.5
      require-directory: 2.1.1
      string-width: 4.2.3
      y18n: 5.0.8
      yargs-parser: 21.1.1

  yocto-queue@0.1.0: {}

  yocto-queue@1.2.2: {}

  yoctocolors@2.1.2: {}

  zod-validation-error@3.5.4(zod@3.25.76):
    dependencies:
      zod: 3.25.76

  zod@3.25.76: {}

```

---

## File: pnpm-workspace.yaml

```yaml
# ============================================================================
# SECURITY: Minimum release age for npm packages (supply-chain attack defense)
# ============================================================================
#
# This setting requires that any npm package version must have been published
# for at least 1 day (1440 minutes) before pnpm will allow installing it.
# This is a critical defense against supply-chain attacks. In most cases,
# malicious npm releases are discovered and pulled within hours, so a 1-day
# delay provides a strong safety buffer.
#
# DO NOT DISABLE THIS SETTING. Removing or setting it to 0 is considered
# extremely dangerous and leaves the entire workspace vulnerable to supply-
# chain attacks, which have been the #1 vector for npm ecosystem compromises.
#
# If you absolutely need to install a package before the 1-day window has
# passed (e.g. an urgent security bugfix), you can add it to the
# `minimumReleaseAgeExclude` allowlist below. Only consider doing this for
# packages released by trusted organizations with an impeccable security
# posture (e.g. Replit packsges, react from Meta, typescript from Microsoft). Even then,
# remove the exclusion once the 1-day window has passed.
#
# Example:
#   minimumReleaseAgeExclude:
#     - react
#     - typescript
#
# ============================================================================
minimumReleaseAge: 1440

minimumReleaseAgeExclude:
  # Exclude @replit scoped packages from the minimum release age check.
  # These are published by Replit and trusted — the supply-chain attack vector
  # this setting guards against does not apply to our own packages.
  - '@replit/*'
  - stripe-replit-sync

packages:
  - artifacts/*
  - lib/*
  - lib/integrations/*
  - scripts

catalog:
  '@replit/vite-plugin-cartographer': ^0.5.1
  '@replit/vite-plugin-dev-banner': ^0.1.1
  '@replit/vite-plugin-runtime-error-modal': ^0.0.6
  '@tailwindcss/vite': ^4.1.14
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  '@types/react-dom': ^19.2.0
  '@vitejs/plugin-react': ^5.0.4
  class-variance-authority: ^0.7.1
  clsx: ^2.1.1
  drizzle-orm: ^0.45.2
  framer-motion: ^12.23.24
  lucide-react: ^0.545.0
  # Must be this exact version because expo requires it
  react: 19.1.0
  # Must be this exact version because expo requires it
  react-dom: 19.1.0
  tailwind-merge: ^3.3.1
  tailwindcss: ^4.1.14
  tsx: ^4.21.0
  vite: ^7.3.2
  wouter: ^3.3.5
  zod: ^3.25.76

autoInstallPeers: false

onlyBuiltDependencies:
  - '@swc/core'
  - esbuild
  - msw
  - unrs-resolver

overrides:
  # replit uses linux-x64 only, we can exclude all other platforms
  "esbuild>@esbuild/darwin-arm64": "-"
  "esbuild>@esbuild/darwin-x64": "-"
  "esbuild>@esbuild/freebsd-arm64": "-"
  "esbuild>@esbuild/freebsd-x64": "-"
  "esbuild>@esbuild/linux-arm": "-"
  "esbuild>@esbuild/linux-arm64": "-"
  "esbuild>@esbuild/linux-ia32": "-"
  "esbuild>@esbuild/linux-loong64": "-"
  "esbuild>@esbuild/linux-mips64el": "-"
  "esbuild>@esbuild/linux-ppc64": "-"
  "esbuild>@esbuild/linux-riscv64": "-"
  "esbuild>@esbuild/linux-s390x": "-"
  "esbuild>@esbuild/netbsd-arm64": "-"
  "esbuild>@esbuild/netbsd-x64": "-"
  "esbuild>@esbuild/openbsd-arm64": "-"
  "esbuild>@esbuild/openbsd-x64": "-"
  "esbuild>@esbuild/sunos-x64": "-"
  "esbuild>@esbuild/win32-arm64": "-"
  "esbuild>@esbuild/win32-ia32": "-"
  "esbuild>@esbuild/win32-x64": "-"
  "esbuild>@esbuild/aix-ppc64": '-'
  "esbuild>@esbuild/android-arm": '-'
  "esbuild>@esbuild/android-arm64": '-'
  "esbuild>@esbuild/android-x64": '-'
  "esbuild>@esbuild/openharmony-arm64": '-'
  "lightningcss>lightningcss-android-arm64": "-"
  "lightningcss>lightningcss-darwin-arm64": "-"
  "lightningcss>lightningcss-darwin-x64": "-"
  "lightningcss>lightningcss-freebsd-x64": "-"
  "lightningcss>lightningcss-linux-arm-gnueabihf": "-"
  "lightningcss>lightningcss-linux-arm64-gnu": "-"
  "lightningcss>lightningcss-linux-arm64-musl": "-"
  "lightningcss>lightningcss-linux-x64-musl": "-"
  "lightningcss>lightningcss-win32-arm64-msvc": "-"
  "lightningcss>lightningcss-win32-x64-msvc": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-android-arm64": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-darwin-arm64": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-darwin-x64": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-freebsd-x64": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-linux-arm-gnueabihf": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-linux-arm64-gnu": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-linux-arm64-musl": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-win32-arm64-msvc": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-win32-x64-msvc": "-"
  "@tailwindcss/oxide>@tailwindcss/oxide-linux-x64-musl": "-"
  "rollup>@rollup/rollup-android-arm-eabi": "-"
  "rollup>@rollup/rollup-android-arm64": "-"
  "rollup>@rollup/rollup-darwin-arm64": "-"
  "rollup>@rollup/rollup-darwin-x64": "-"
  "rollup>@rollup/rollup-freebsd-arm64": "-"
  "rollup>@rollup/rollup-freebsd-x64": "-"
  "rollup>@rollup/rollup-linux-arm-gnueabihf": "-"
  "rollup>@rollup/rollup-linux-arm-musleabihf": "-"
  "rollup>@rollup/rollup-linux-arm64-gnu": "-"
  "rollup>@rollup/rollup-linux-arm64-musl": "-"
  "rollup>@rollup/rollup-linux-loong64-gnu": "-"
  "rollup>@rollup/rollup-linux-loong64-musl": "-"
  "rollup>@rollup/rollup-linux-ppc64-gnu": "-"
  "rollup>@rollup/rollup-linux-ppc64-musl": "-"
  "rollup>@rollup/rollup-linux-riscv64-gnu": "-"
  "rollup>@rollup/rollup-linux-riscv64-musl": "-"
  "rollup>@rollup/rollup-linux-s390x-gnu": "-"
  "rollup>@rollup/rollup-linux-x64-musl": "-"
  "rollup>@rollup/rollup-openbsd-x64": "-"
  "rollup>@rollup/rollup-openharmony-arm64": "-"
  "rollup>@rollup/rollup-win32-arm64-msvc": "-"
  "rollup>@rollup/rollup-win32-ia32-msvc": "-"
  "rollup>@rollup/rollup-win32-x64-gnu": "-"
  "rollup>@rollup/rollup-win32-x64-msvc": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-darwin-arm64": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-darwin-x64": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-freebsd-ia32": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-freebsd-x64": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-linux-arm64": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-linux-arm": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-linux-ia32": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-sunos-x64": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-win32-ia32": "-"
  "@expo/ngrok-bin>@expo/ngrok-bin-win32-x64": "-"
  # drizzle-kit uses esbuild internally on an older version that's vulnerable, this overrides it
  "@esbuild-kit/esm-loader": "npm:tsx@^4.21.0"
  esbuild: "0.27.3"
```

---

## File: scripts/package.json

```json
{
  "name": "@workspace/scripts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "hello": "tsx ./src/hello.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "tsx": "catalog:"
  }
}

```

---

## File: scripts/post-merge.sh

```bash
#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

```

---

## File: scripts/src/hello.ts

```typescript
console.log("Hello from @workspace/scripts");

```

---

## File: scripts/tsconfig.json

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}

```

---

## File: tsconfig.base.json

```json
{
  "compilerOptions": {
    "isolatedModules": true,
    "lib": ["es2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmitOnError": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": false,
    "noImplicitReturns": true,
    "noUnusedLocals": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": false,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "skipLibCheck": true,
    "target": "es2022",
    "types": [],
    "customConditions": ["workspace"]
  }
}

```

---

## File: tsconfig.json

```json
{
  "extends": "./tsconfig.base.json",
  "compileOnSave": false,
  "files": [],
  "references": [
    {
      "path": "./lib/db"
    },
    {
      "path": "./lib/api-client-react"
    },
    {
      "path": "./lib/api-zod"
    },
    {
      "path": "./lib/integrations-openai-ai-server"
    },
    {
      "path": "./lib/integrations-openai-ai-react"
    }
  ]
}

```

---

