import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Animated,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

const { width: SCREEN_W } = Dimensions.get("window");

/* ── Obsidian Orchard Theme ───────────────────────────────── */
const T = {
    bg: "#131313",
    surface: "#201f1f",
    surfaceHigh: "#2a2a2a",
    surfaceVariant: "#353534",
    primary: "#ccc989",
    primaryContainer: "#969359",
    onPrimary: "#333202",
    onSurface: "#e5e2e1",
    onSurfaceVariant: "#cac7b7",
    outlineVariant: "#48473b",
    secondaryContainer: "#434c37",
    error: "#ffb4ab",
    errorContainer: "#93000a",
    stone500: "#78716c",
    stone600: "#57534e",
    stone800: "#292524",
};

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    /* micro-animation for button press */
    const btnScale = useRef(new Animated.Value(1)).current;

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError("Please enter email and password");
            return;
        }
        setError("");
        setLoading(true);

        /* button press animation */
        Animated.sequence([
            Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(btnScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();

        try {
            await login(email.trim(), password);
        } catch (e: any) {
            const msg = e?.message || "Login failed. Please try again.";            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={["#131313", "#16190A", "#131313"]}
            start={{ x: 0.8, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex1}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Branding ── */}
                    <View style={styles.brandContainer}>
                        <Text style={styles.brandTitle}>AtomicShift</Text>
                        <Text style={styles.brandSubtitle}>SECURE GATEWAY</Text>
                    </View>

                    {/* ── Glass Card ── */}
                    <View style={styles.glassCard}>
                        {/* Header row */}
                        <View style={styles.cardHeader}>
                            <Text style={styles.welcomeText}>Welcome back</Text>
                            <View style={styles.secureBadge}>
                                <Text style={styles.secureBadgeIcon}>✓</Text>
                                <Text style={styles.secureBadgeText}>AI SECURE</Text>
                            </View>
                        </View>

                        {/* ── Email ── */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>E-MAIL / USERNAME</Text>
                            <TextInput
                                style={styles.underlineInput}
                                placeholder="Enter your registered email"
                                placeholderTextColor={T.stone600}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={setEmail}
                                returnKeyType="next"
                            />
                        </View>

                        {/* ── Password ── */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>PASSWORD</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.underlineInput, styles.flex1]}
                                    placeholder="••••••••"
                                    placeholderTextColor={T.stone600}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="go"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Text style={styles.visibilityIcon}>
                                        {showPassword ? "◉" : "◎"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Remember / Recovery ── */}
                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setRememberMe(!rememberMe)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        rememberMe && styles.checkboxChecked,
                                    ]}
                                >
                                    {rememberMe && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </View>
                                <Text style={styles.checkboxLabel}>
                                    Keep me authenticated
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <Text style={styles.recoveryLink}>Recovery</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Error ── */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>⚠ {error}</Text>
                            </View>
                        ) : null}

                        {/* ── Submit ── */}
                        <Animated.View
                            style={[styles.submitWrapper, { transform: [{ scale: btnScale }] }]}
                        >
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color={T.onPrimary} />
                                ) : (
                                    <>
                                        <Text style={styles.submitBtnText}>
                                            Continue session
                                        </Text>
                                        <Text style={styles.submitArrow}>→</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── Divider ── */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR AUTHENTICATE WITH</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── Biometric buttons ── */}
                        <View style={styles.biometricRow}>
                            <TouchableOpacity style={styles.biometricBtn}>
                                <Text style={styles.biometricIcon}>⊙</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.biometricBtn}>
                                <Text style={styles.biometricIcon}>☺</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Register link ── */}
                    <View style={styles.registerRow}>
                        <Text style={styles.registerText}>New to AtomicShift? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.registerLink}>Establish Presence</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    {/* ── Bottom badges ── */}
                    <View style={styles.bottomBadges}>
                        <View style={styles.badgeItem}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>ENCRYPTION: AES-256</Text>
                        </View>
                        <View style={styles.badgeItem}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>JWT AUTH</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    flex1: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },

    /* ── Brand ── */
    brandContainer: {
        alignItems: "center",
        marginBottom: 48,
    },
    brandTitle: {
        fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
        fontSize: 52,
        fontWeight: "800",
        color: T.primary,
        letterSpacing: -3,
        marginBottom: 8,
    },
    brandSubtitle: {
        fontSize: 11,
        fontWeight: "600",
        color: T.onSurfaceVariant,
        letterSpacing: 6,
        textTransform: "uppercase",
    },

    /* ── Glass Card ── */
    glassCard: {
        backgroundColor: "rgba(53, 53, 52, 0.25)",
        borderRadius: 32,
        padding: 32,
        borderWidth: 1,
        borderColor: "rgba(72, 71, 59, 0.15)",
        /* shadow for depth */
        ...Platform.select({
            web: { boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.4)" } as any,
            default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.4,
                shadowRadius: 40,
                elevation: 24,
            }
        }),
    },

    /* ── Card Header ── */
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 26,
        fontWeight: "700",
        color: T.onSurface,
        letterSpacing: -0.5,
    },
    secureBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(67, 76, 55, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(204, 201, 137, 0.2)",
    },
    secureBadgeIcon: {
        fontSize: 10,
        color: T.primary,
    },
    secureBadgeText: {
        fontSize: 8,
        fontWeight: "700",
        color: T.primary,
        letterSpacing: 3,
    },

    /* ── Fields ── */
    fieldGroup: {
        marginBottom: 32,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: T.primary,
        letterSpacing: 4,
        marginBottom: 8,
    },
    underlineInput: {
        borderBottomWidth: 1,
        borderBottomColor: "rgba(72, 71, 59, 0.4)",
        paddingVertical: 12,
        fontSize: 17,
        color: T.onSurface,
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    visibilityIcon: {
        fontSize: 22,
        color: T.stone500,
        marginLeft: 12,
    },

    /* ── Options ── */
    optionsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(72, 71, 59, 0.4)",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxChecked: {
        backgroundColor: T.primary,
        borderColor: T.primary,
    },
    checkmark: {
        fontSize: 11,
        color: T.onPrimary,
        fontWeight: "700",
    },
    checkboxLabel: {
        fontSize: 13,
        color: T.onSurfaceVariant,
    },
    recoveryLink: {
        fontSize: 13,
        color: T.stone500,
        textDecorationLine: "underline",
        textDecorationColor: T.stone800,
    },

    /* ── Error ── */
    errorContainer: {
        backgroundColor: "rgba(147, 0, 10, 0.2)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 180, 171, 0.15)",
    },
    errorText: {
        color: T.error,
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
    },

    /* ── Submit ── */
    submitWrapper: {
        marginTop: 8,
        marginBottom: 32,
    },
    submitBtn: {
        backgroundColor: T.primary,
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        /* glow shadow */
        ...Platform.select({
            web: { boxShadow: `0px 15px 30px rgba(204, 201, 137, 0.25)` } as any,
            default: {
                shadowColor: T.primary,
                shadowOffset: { width: 0, height: 15 },
                shadowOpacity: 0.25,
                shadowRadius: 30,
                elevation: 12,
            }
        }),
    },
    submitBtnText: {
        color: T.onPrimary,
        fontSize: 17,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    submitArrow: {
        color: T.onPrimary,
        fontSize: 20,
        fontWeight: "700",
    },

    /* ── Divider ── */
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "rgba(72, 71, 59, 0.2)",
    },
    dividerText: {
        fontSize: 9,
        color: T.stone500,
        letterSpacing: 3,
        fontWeight: "600",
    },

    /* ── Biometric ── */
    biometricRow: {
        flexDirection: "row",
        gap: 12,
    },
    biometricBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: "rgba(53, 53, 52, 0.2)",
        borderWidth: 1,
        borderColor: "rgba(72, 71, 59, 0.2)",
        alignItems: "center",
    },
    biometricIcon: {
        fontSize: 22,
        color: T.stone500,
    },

    /* ── Register ── */
    registerRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32,
    },
    registerText: {
        fontSize: 14,
        color: T.onSurfaceVariant,
    },
    registerLink: {
        fontSize: 14,
        fontWeight: "700",
        color: T.primary,
    },

    /* ── Bottom badges ── */
    bottomBadges: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        marginTop: 36,
        opacity: 0.3,
    },
    badgeItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    badgeDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: T.primary,
    },
    badgeText: {
        fontSize: 8,
        letterSpacing: 3,
        fontWeight: "600",
        color: T.onSurface,
    },
});
