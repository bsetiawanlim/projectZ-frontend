import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "../../src/theme/tokens";

export default function MobileHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Project Z</Text>
        <Text style={styles.subtitle}>Mobile Field & Terminal Shell</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Access</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(tabs)/pos")}
        >
          <Text style={styles.primaryButtonText}>Open Mobile POS 🛒</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.secondaryButtonText}>Operator Login 🔐</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
    padding: theme.spacing.lg,
  },
  header: {
    marginVertical: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderColor: theme.colors.borderSubtle,
    borderWidth: 1,
    gap: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: theme.colors.bgElevated,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: "center",
    borderColor: theme.colors.borderSubtle,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
});
