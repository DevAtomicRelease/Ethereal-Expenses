/**
 * Tabs Layout — Floating pill-shaped bottom navigation bar.
 *
 * Icons come from assets/Icons/ (inlined as react-native-svg components):
 *   Home       → home.svg
 *   Expenses   → scroll.svg
 *   Insights   → analytics.svg
 *   Profile    → setting.svg
 *
 * Active tab  : gold filled circle + glow, icon rendered in dark olive
 * Inactive tab: icon rendered in muted stone-500
 */
import React from "react";
import { Tabs } from "expo-router";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import {
  HomeIcon,
  ScrollIcon,
  AnalyticsIcon,
  SettingIcon,
} from "@/components/ui/TabIcons";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const ACTIVE_BG   = "#CCC989";    // gold
const ACTIVE_FG   = "#1d1d00";    // dark olive — icon color on gold bg
const INACTIVE    = "#6B6A60";    // muted grey — icon color when not focused
const PILL_BG     = "rgba(23,23,23,0.82)";
const PILL_BORDER = "rgba(72,71,59,0.18)";

// ─── Tab definitions (order = nav bar left-to-right) ─────────────────────────
type TabDef = {
  name: string;
  Icon: React.FC<{ color: string; size?: number }>;
};

const TABS: TabDef[] = [
  { name: "home",     Icon: HomeIcon      },
  { name: "expenses", Icon: ScrollIcon    },
  { name: "insights", Icon: AnalyticsIcon },
  { name: "profile",  Icon: SettingIcon   },
];

// ─── Check if the active tab is on its root/index screen ─────────────────────
function isOnRootScreen(tabState: BottomTabBarProps["state"]): boolean {
  const activeRoute = tabState.routes[tabState.index];
  // Each tab has a nested Stack navigator; check its state
  const nestedState = activeRoute?.state;
  if (!nestedState) return true; // no state yet = initial render = index
  const nestedIndex = nestedState.index ?? 0;
  const nestedRoutes = nestedState.routes ?? [];
  const activeNested = nestedRoutes[nestedIndex];
  // Show tab bar only when on the "index" screen of each tab
  return activeNested?.name === "index";
}

// ─── Floating Pill Tab Bar ────────────────────────────────────────────────────
function FloatingTabBar({ state, navigation, descriptors, insets: _insets }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;
  const pillWidth = Math.min(screenWidth * 0.9, 448);

  // Hide tab bar on sub-screens (only show on index/root of each tab)
  if (!isOnRootScreen(state)) return null;

  return (
    <View
      style={[styles.wrapper, { bottom: Math.max(insets.bottom + 14, 24) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { width: pillWidth }]}>
        {TABS.map(({ name, Icon }) => {
          const routeIndex = state.routes.findIndex((r) => r.name === name);
          if (routeIndex === -1) return null;

          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(name);
            }
          };

          return (
            <TouchableOpacity
              key={name}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Icon
                  color={isFocused ? ACTIVE_FG : INACTIVE}
                  size={22}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
    pointerEvents: "box-none" as any,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 68,
    borderRadius: 9999,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.55,
        shadowRadius: 24,
      },
      android: { elevation: 28 },
      web: {
        boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      } as any,
    }),
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  iconWrap: {
    width: 48,
    height: 48,
    maxWidth: 48,
    maxHeight: 48,
    aspectRatio: 1,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  iconWrapActive: {
    backgroundColor: ACTIVE_BG,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: ACTIVE_BG,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
      web: {
        boxShadow: "0 0 18px rgba(204,201,137,0.5)",
      } as any,
    }),
  },
});

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home"     />
      <Tabs.Screen name="expenses" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="profile"  />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}
