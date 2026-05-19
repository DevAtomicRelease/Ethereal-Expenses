/**
 * Chat Screen — Conversational finance assistant.
 * Full-screen chat UI with message bubbles, typing indicator, and suggested prompts.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { dataClient } from "@/api/dataClient";

// ─── Design tokens (matching app theme) ──────────────────────────────────────
const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  primaryDim: "#969359",
  onPrimary: "#333202",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outline: "#939182",
  outlineVar: "#48473B",
  error: "#FFB4AB",
} as const;

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const sendIcon = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>`;
const botIcon = `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg>`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "How much did I spend this month?",
  "What's my biggest expense category?",
  "How can I reduce my spending?",
  "Compare this week vs last week",
  "Am I on track with my budget?",
];

// ─── Typing Indicator Component ──────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={s.botRow}>
      <View style={s.botAvatar}>
        <SvgXml xml={botIcon.replace(/currentColor/g, C.primary)} width={16} height={16} />
      </View>
      <View style={[s.bubble, s.botBubble, { paddingVertical: 16, paddingHorizontal: 20 }]}>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                s.typingDot,
                { opacity: 0.4 + (i * 0.2) },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your finance assistant. Ask me anything about your spending — like \"How much did I spend on food?\" or \"What's my biggest expense this month?\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, isLoading]);

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const response: any = await dataClient
        .post("chat", {
          json: { message: messageText, history },
          timeout: 90000, // LLM inference can be slow
          retry: { limit: 1 },
        })
        .json();

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: response.reply || "I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      console.log("[Chat] error:", e?.message, e?.response?.status);
      let errText = "Something went wrong. Please try again.";
      if (e?.response?.status === 404) {
        errText = "Chat service is not available yet. Please ensure the backend is updated.";
      } else if (e?.response?.status === 401) {
        errText = "Your session has expired. Please log in again.";
      } else if (e?.message?.includes("network") || e?.message?.includes("Network") || e?.message?.includes("timeout")) {
        errText = "Could not reach the server. Please check your connection and try again.";
      }
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: errText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.role === "user") {
      return (
        <View style={s.userRow}>
          <View style={[s.bubble, s.userBubble]}>
            <Text style={s.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={s.botRow}>
        <View style={s.botAvatar}>
          <SvgXml xml={botIcon.replace(/currentColor/g, C.primary)} width={16} height={16} />
        </View>
        <View style={[s.bubble, s.botBubble]}>
          <Text style={s.botText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Finance Assistant</Text>
            <Text style={s.headerSub}>Powered by Ethereal</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {isLoading && <TypingIndicator />}
              {showSuggestions && (
                <View style={s.suggestionsWrap}>
                  <Text style={s.suggestionsLabel}>TRY ASKING</Text>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={s.suggestionChip}
                      onPress={() => sendMessage(prompt)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.suggestionText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
        />

        {/* ── Input Bar ── */}
        <View style={s.inputBar}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your spending..."
              placeholderTextColor={C.outline}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || isLoading) && { opacity: 0.3 }]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <SvgXml xml={sendIcon.replace(/currentColor/g, C.onPrimary)} width={18} height={18} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "22",
  },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: C.primary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: C.outline,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 2,
  },

  // ── Messages ──
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  botRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    gap: 8,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: C.primary,
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: C.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  userText: {
    color: C.onPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  botText: {
    color: C.onSurface,
    fontSize: 15,
    lineHeight: 22,
  },

  // ── Typing Indicator ──
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },

  // ── Suggestions ──
  suggestionsWrap: {
    marginTop: 12,
    paddingBottom: 12,
  },
  suggestionsLabel: {
    color: C.outline,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  suggestionText: {
    color: C.onSurfaceVar,
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Input Bar ──
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVar + "22",
    backgroundColor: C.bg,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: C.surfaceHigh,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
  },
  textInput: {
    flex: 1,
    color: C.onSurface,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
});
