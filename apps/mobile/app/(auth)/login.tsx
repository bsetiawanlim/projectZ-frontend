import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../../src/lib/api";
import { theme } from "../../src/theme/tokens";

export default function MobileLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.signIn(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>PZ Mobile Terminal</Text>
        <Text style={styles.subtitle}>Enter operator credentials</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="operator@projectz.com"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••••"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderColor: theme.colors.borderSubtle,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  errorBox: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    marginBottom: theme.spacing.md,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderWidth: 1,
  },
  errorText: {
    color: theme.colors.accentRose,
    fontSize: 13,
  },
  form: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  input: {
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textPrimary,
    borderColor: theme.colors.borderSubtle,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
