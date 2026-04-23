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

/* ── Password strength helper ─────────────────────────────── */
function getPasswordStrength(pw: string) {
    if (!pw) return { label: "", color: "transparent", ratio: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { label: "WEAK", color: "#ff6b6b", ratio: 0.2 };
    if (score <= 2) return { label: "FAIR", color: "#ffa94d", ratio: 0.4 };
    if (score <= 3) return { label: "GOOD", color: "#ffd43b", ratio: 0.6 };
    if (score <= 4) return { label: "STRONG", color: "#69db7c", ratio: 0.8 };
    return { label: "EXCELLENT", color: T.primary, ratio: 1 };
}

export default function RegisterScreen() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    /* micro-animation for button press */
    const btnScale = useRef(new Animated.Value(1)).current;

    const strength = getPasswordStrength(password);

    const handleRegister = async () => {
        if (!fullName.trim()) {
            setError("Please enter your full name");
            return;
        }
        if (!email.trim()) {
            setError("Please enter your email");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match");
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
            await register(email.trim(), password);
        } catch (e: any) {
            const msg = e?.message || "Registration failed. Please try again.";
            setError(msg);
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
                        <Text style={styles.brandSubtitle}>ESTABLISH PRESENCE</Text>
                    </View>

                    {/* ── Glass Card ── */}
                    <View style={styles.glassCard}>
                        {/* Header row */}
                        <View style={styles.cardHeader}>
                            <Text style={styles.welcomeText}>Create account</Text>
                            <View style={styles.secureBadge}>
                                <Text style={styles.secureBadgeIcon}>✓</Text>
                                <Text style={styles.secureBadgeText}>ENCRYPTED</Text>
                            </View>
                        </View>

                        {/* ── Full Name ── */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>FULL NAME</Text>
                            <TextInput
                                style={styles.underlineInput}
                                placeholder="Enter your full name"
                                placeholderTextColor={T.stone600}
                                autoCapitalize="words"
                                autoCorrect={false}
                                value={fullName}
                                onChangeText={setFullName}
                                returnKeyType="next"
                            />
                        </View>

                        {/* ── Email ── */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>E-MAIL</Text>
                            <TextInput
                                style={styles.underlineInput}
                                placeholder="Enter your email address"
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
                                    placeholder="Minimum 8 characters"
                                    placeholderTextColor={T.stone600}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="next"
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

                            {/* Password strength bar */}
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBarBg}>
                                        <View
                                            style={[
                                                styles.strengthBarFill,
                                                {
                                                    width: `${strength.ratio * 100}%`,
                                                    backgroundColor: strength.color,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.strengthLabel,
                                            { color: strength.color },
                                        ]}
                                    >
                                        {strength.label}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── Confirm Password ── */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.underlineInput, styles.flex1]}
                                    placeholder="Re-enter your password"
                                    placeholderTextColor={T.stone600}
                                    secureTextEntry={!showConfirm}
                                    value={confirm}
                                    onChangeText={setConfirm}
                                    returnKeyType="go"
                                    onSubmitEditing={handleRegister}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirm(!showConfirm)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Text style={styles.visibilityIcon}>
                                        {showConfirm ? "◉" : "◎"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {/* Match indicator */}
                            {confirm.length > 0 && (
                                <View style={styles.matchRow}>
                                    <Text
                                        style={[
                                            styles.matchIndicator,
                                            {
                                                color:
                                                    password === confirm
                                                        ? T.primary
                                                        : T.error,
                                            },
                                        ]}
                                    >
                                        {password === confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                                    </Text>
                                </View>
                            )}
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
                                onPress={handleRegister}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color={T.onPrimary} />
                                ) : (
                                    <>
                                        <Text style={styles.submitBtnText}>
                                            Establish presence
                                        </Text>
                                        <Text style={styles.submitArrow}>→</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── Terms ── */}
                        <Text style={styles.termsText}>
                            By registering you agree to our{" "}
                            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </View>

                    {/* ── Login link ── */}
                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>Already have access? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.loginLink}>Resume Session</Text>
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
        marginBottom: 36,
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
        marginBottom: 36,
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
        marginBottom: 24,
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

    /* ── Strength bar ── */
    strengthContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        gap: 10,
    },
    strengthBarBg: {
        flex: 1,
        height: 3,
        backgroundColor: "rgba(72, 71, 59, 0.2)",
        borderRadius: 2,
        overflow: "hidden",
    },
    strengthBarFill: {
        height: "100%",
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 3,
    },

    /* ── Match indicator ── */
    matchRow: {
        marginTop: 8,
    },
    matchIndicator: {
        fontSize: 12,
        fontWeight: "500",
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
        marginBottom: 20,
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

    /* ── Terms ── */
    termsText: {
        fontSize: 11,
        color: T.stone500,
        textAlign: "center",
        lineHeight: 18,
    },
    termsLink: {
        color: T.onSurfaceVariant,
        textDecorationLine: "underline",
        textDecorationColor: T.stone800,
    },

    /* ── Login link ── */
    loginRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32,
    },
    loginText: {
        fontSize: 14,
        color: T.onSurfaceVariant,
    },
    loginLink: {
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
