import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({ label = "Memuat..." }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0F766E" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: "#334155",
  },
});
