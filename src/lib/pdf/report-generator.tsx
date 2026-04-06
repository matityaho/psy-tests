import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ScoringResult } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  col1: { flex: 2 },
  col2: { flex: 1 },
  col3: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  info: { marginBottom: 2 },
  infoLabel: { fontFamily: "Helvetica-Bold", color: "#333" },
});

interface PatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  notes: string | null;
}

interface AssessmentData {
  test: { name: string };
  assessmentDate: Date;
  respondentType: string | null;
  results: Record<string, ScoringResult> | null;
}

interface ReportProps {
  patient: PatientData;
  assessments: AssessmentData[];
}

export function PatientReport({ patient, assessments }: ReportProps) {
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {patient.firstName} {patient.lastName}
        </Text>
        <Text style={styles.subtitle}>Psychological Assessment Report</Text>

        <View style={styles.section}>
          <Text style={styles.info}>
            <Text style={styles.infoLabel}>Date of Birth: </Text>
            {new Date(patient.dateOfBirth).toLocaleDateString()}
          </Text>
          <Text style={styles.info}>
            <Text style={styles.infoLabel}>Age: </Text>
            {age}
          </Text>
          <Text style={styles.info}>
            <Text style={styles.infoLabel}>Gender: </Text>
            {patient.gender}
          </Text>
          {patient.notes && (
            <Text style={styles.info}>
              <Text style={styles.infoLabel}>Notes: </Text>
              {patient.notes}
            </Text>
          )}
        </View>

        {assessments.map((assessment, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {assessment.test.name}
              {assessment.respondentType
                ? ` (${assessment.respondentType})`
                : ""}
            </Text>
            <Text style={{ marginBottom: 8, color: "#666" }}>
              Date: {new Date(assessment.assessmentDate).toLocaleDateString()}
            </Text>

            {assessment.results ? (
              <View>
                <View style={styles.headerRow}>
                  <Text style={[styles.col1, styles.bold]}>Measure</Text>
                  <Text style={[styles.col2, styles.bold]}>Type</Text>
                  <Text style={[styles.col3, styles.bold]}>Result</Text>
                </View>
                {Object.values(assessment.results).map((result) => (
                  <View key={result.outputId} style={styles.row}>
                    <Text style={styles.col1}>{result.label}</Text>
                    <Text style={styles.col2}>
                      {result.type.replace("_", " ")}
                    </Text>
                    <Text style={styles.col3}>{String(result.value)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: "#999" }}>No results computed.</Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
