import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  calculateMatchScore,
  findMatchSuggestions,
  getMatchConfidence
} from "../shared/matching.js";

const sampleReports = [
  {
    id: "lost-wallet",
    type: "lost",
    title: "Black wallet",
    description: "Small black wallet with student card inside.",
    location: "Central Library",
    status: "open",
    createdAt: new Date().toISOString(),
    imageLabels: [
      { text: "Wallet", confidence: 0.86 },
      { text: "Fashion accessory", confidence: 0.62 }
    ],
    imageSignature: { averageColor: { r: 32, g: 30, b: 28 } },
    searchKeywords: ["black", "wallet", "student", "card", "central", "library"]
  },
  {
    id: "found-wallet",
    type: "found",
    title: "Wallet near library",
    description: "Found a dark wallet near the entrance.",
    location: "Central Library entrance",
    status: "open",
    createdAt: new Date().toISOString(),
    imageLabels: [
      { text: "Wallet", confidence: 0.8 },
      { text: "Fashion accessory", confidence: 0.59 }
    ],
    imageSignature: { averageColor: { r: 35, g: 32, b: 29 } },
    searchKeywords: ["wallet", "dark", "central", "library", "entrance"]
  }
];

export default function App() {
  const [selectedId, setSelectedId] = useState(sampleReports[0].id);
  const [search, setSearch] = useState("");
  const selectedReport = sampleReports.find((report) => report.id === selectedId);
  const matches = useMemo(() => findMatchSuggestions(sampleReports, selectedReport), [selectedReport]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.logo}>FindIT</Text>
          <Text style={styles.subtitle}>Mobile foundation preview</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Search</Text>
          <TextInput
            onChangeText={setSearch}
            placeholder="wallet, AirPods, library..."
            style={styles.input}
            value={search}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Reports</Text>
          {sampleReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              onPress={() => setSelectedId(report.id)}
              style={[styles.reportCard, selectedId === report.id && styles.selectedCard]}
            >
              <Text style={styles.reportType}>{report.type}</Text>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportMeta}>{report.location}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Possible Matches</Text>
          {matches.map(({ item, reasons, score }) => (
            <TouchableOpacity key={item.id} onPress={() => setSelectedId(item.id)} style={styles.matchCard}>
              <View>
                <Text style={styles.reportTitle}>{item.title}</Text>
                <Text style={styles.reportMeta}>{reasons.join(", ") || item.location}</Text>
              </View>
              <Text style={styles.score}>
                {getMatchConfidence(score)} {score}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Score Check</Text>
          <Text style={styles.bodyText}>
            The shared matching helper currently scores this pair at{" "}
            {calculateMatchScore(sampleReports[0], sampleReports[1])}%.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef4fb"
  },
  screen: {
    gap: 16,
    padding: 20
  },
  header: {
    paddingTop: 16
  },
  logo: {
    color: "#003d7c",
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#5e6b7a",
    fontSize: 16,
    marginTop: 4
  },
  panel: {
    backgroundColor: "white",
    borderRadius: 22,
    gap: 12,
    padding: 18,
    shadowColor: "#003d7c",
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  label: {
    color: "#1b2e45",
    fontWeight: "800"
  },
  input: {
    borderColor: "rgba(0, 61, 124, 0.18)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14
  },
  sectionTitle: {
    color: "#1b2e45",
    fontSize: 20,
    fontWeight: "900"
  },
  reportCard: {
    borderColor: "rgba(0, 61, 124, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14
  },
  selectedCard: {
    borderColor: "#ef7c00",
    backgroundColor: "#fff8ef"
  },
  reportType: {
    color: "#ef7c00",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  reportTitle: {
    color: "#1b2e45",
    fontSize: 16,
    fontWeight: "900"
  },
  reportMeta: {
    color: "#5e6b7a",
    marginTop: 4
  },
  matchCard: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#eef4fb"
  },
  score: {
    color: "#003d7c",
    fontWeight: "900"
  },
  bodyText: {
    color: "#5e6b7a",
    lineHeight: 22
  }
});
