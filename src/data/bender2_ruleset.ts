import type {
  ScoringRuleSet,
  InputDefinition,
  OutputDefinition,
  AgeGroup,
} from "@/lib/types";
import tables from "./bender2_tables.json";

interface FineBin {
  id: string;
  minMonths: number;
  maxMonths: number;
  normBin: string | null;
  durationBin: string;
}

const FINE_BINS: FineBin[] = (() => {
  const bins: FineBin[] = [];

  for (let m = 0; m < 12; m += 2) {
    const id = `4-${m}_to_4-${m + 1}`;
    bins.push({
      id,
      minMonths: 4 * 12 + m,
      maxMonths: 4 * 12 + m + 1,
      normBin: id,
      durationBin: "4",
    });
  }

  for (let year = 5; year <= 16; year++) {
    for (const [start, end] of [
      [0, 3],
      [4, 7],
      [8, 11],
    ] as const) {
      const id = `${year}-${start}_to_${year}-${end}`;
      bins.push({
        id,
        minMonths: year * 12 + start,
        maxMonths: year * 12 + end,
        normBin: id,
        durationBin: `${year}`,
      });
    }
  }

  bins.push({
    id: "17-0_to_18-11",
    minMonths: 17 * 12,
    maxMonths: 18 * 12 + 11,
    normBin: "17-0_to_18-11",
    durationBin: "17_to_20",
  });
  bins.push({
    id: "19-0_to_19-11",
    minMonths: 19 * 12,
    maxMonths: 19 * 12 + 11,
    normBin: "19-0_to_19-11",
    durationBin: "17_to_20",
  });

  bins.push({
    id: "20-0_to_20-11",
    minMonths: 20 * 12,
    maxMonths: 20 * 12 + 11,
    normBin: "20-0_to_24-11",
    durationBin: "17_to_20",
  });
  bins.push({
    id: "21-0_to_24-11",
    minMonths: 21 * 12,
    maxMonths: 24 * 12 + 11,
    normBin: "20-0_to_24-11",
    durationBin: "21_to_29",
  });
  bins.push({
    id: "25-0_to_29-11",
    minMonths: 25 * 12,
    maxMonths: 29 * 12 + 11,
    normBin: "25-0_to_29-11",
    durationBin: "21_to_29",
  });

  for (const decadeStart of [30, 40, 50, 60, 70]) {
    for (const halfStart of [0, 5]) {
      const lowYear = decadeStart + halfStart;
      const highYear = lowYear + 4;
      const id = `${lowYear}-0_to_${highYear}-11`;
      bins.push({
        id,
        minMonths: lowYear * 12,
        maxMonths: highYear * 12 + 11,
        normBin: id,
        durationBin: `${decadeStart}_to_${decadeStart + 9}`,
      });
    }
  }

  bins.push({
    id: "80-0_to_84-11",
    minMonths: 80 * 12,
    maxMonths: 84 * 12 + 11,
    normBin: "80-0_to_84-11",
    durationBin: "80_plus",
  });
  bins.push({
    id: "85-0_and_older",
    minMonths: 85 * 12,
    maxMonths: 200 * 12,
    normBin: "85-0_and_older",
    durationBin: "80_plus",
  });

  return bins;
})();

const VERBAL_STANDARD = [
  { min: 0, max: 69, label: "נמוך מאוד" },
  { min: 70, max: 84, label: "נמוך" },
  { min: 85, max: 115, label: "ממוצע" },
  { min: 116, max: 130, label: "גבוה" },
  { min: 131, max: 999, label: "גבוה מאוד" },
];

const VERBAL_DURATION = [
  { min: -999, max: -2.0001, label: "מהיר מאוד" },
  { min: -2, max: -1.0001, label: "מהיר מהממוצע" },
  { min: -1, max: 1, label: "ממוצע" },
  { min: 1.0001, max: 2, label: "איטי מהממוצע" },
  { min: 2.0001, max: 999, label: "איטי מאוד" },
];

const PERCENTILE_FORMULA =
  "round((1 + erf((s - 100) / 15 / sqrt(2))) / 2 * 10000) / 100";

interface NormTables {
  copy: Record<string, Record<string, number>>;
  recall: Record<string, Record<string, number>>;
}

interface DurationStats {
  copy: Record<string, { mean_seconds: number; sd_seconds: number }>;
  recall: Record<string, { mean_seconds: number; sd_seconds: number }>;
}

const normTables = tables.norm_tables as NormTables;
const durationStats = tables.duration_stats_coarse as DurationStats;

function buildLookupByGroup(
  source: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const bin of FINE_BINS) {
    if (!bin.normBin) continue;
    const data = source[bin.normBin];
    if (data) {
      out[bin.id] = data;
    }
  }
  return out;
}

function buildStatsByGroup(
  source: Record<string, { mean_seconds: number; sd_seconds: number }>,
): Record<string, { mean: number; sd: number }> {
  const out: Record<string, { mean: number; sd: number }> = {};
  for (const bin of FINE_BINS) {
    const stats = source[bin.durationBin];
    if (stats) {
      out[bin.id] = { mean: stats.mean_seconds, sd: stats.sd_seconds };
    }
  }
  return out;
}

export const BENDER2_INPUTS: InputDefinition[] = [
  {
    id: "copy_raw",
    label: "ציון גלם — העתקה",
    type: "integer",
    min: 0,
    max: 52,
    required: true,
  },
  {
    id: "copy_duration",
    label: "משך העתקה (MM:SS)",
    type: "time_mmss",
    required: true,
  },
  {
    id: "recall_raw",
    label: "ציון גלם — זיכרון",
    type: "integer",
    min: 0,
    max: 52,
    required: false,
  },
  {
    id: "recall_duration",
    label: "משך זיכרון (MM:SS)",
    type: "time_mmss",
    required: false,
  },
];

export const BENDER2_OUTPUTS: OutputDefinition[] = [
  { id: "copy_standard", label: "ציון תקן — העתקה", type: "standard_score" },
  { id: "copy_percentile", label: "אחוזון — העתקה", type: "percentile" },
  { id: "copy_verbal", label: "הערכה מילולית — העתקה", type: "interpretation" },
  { id: "copy_duration_z", label: "z-score — משך העתקה", type: "custom" },
  {
    id: "copy_duration_verbal",
    label: "הערכה מילולית — משך העתקה",
    type: "interpretation",
  },
  { id: "recall_standard", label: "ציון תקן — זיכרון", type: "standard_score" },
  { id: "recall_percentile", label: "אחוזון — זיכרון", type: "percentile" },
  {
    id: "recall_verbal",
    label: "הערכה מילולית — זיכרון",
    type: "interpretation",
  },
  { id: "recall_duration_z", label: "z-score — משך זיכרון", type: "custom" },
  {
    id: "recall_duration_verbal",
    label: "הערכה מילולית — משך זיכרון",
    type: "interpretation",
  },
];

export const BENDER2_AGE_GROUPS: AgeGroup[] = FINE_BINS.map((b) => ({
  id: b.id,
  minMonths: b.minMonths,
  maxMonths: b.maxMonths,
}));

export const BENDER2_RULE_SET: ScoringRuleSet = {
  version: "1.0",
  description:
    "Bender Visual-Motor Gestalt Test, Second Edition (BG II). " +
    "Copy and Recall: standard score from age-group norm tables (Appendix A). " +
    "Durations: z-score from Table D-1 mean+SD by age group. " +
    "Percentile assumes normal distribution from standard score (μ=100, σ=15).",
  conditions: [{ id: "age_group", source: "patient.age" }],
  ageGroups: BENDER2_AGE_GROUPS,
  steps: [
    {
      type: "lookup_table",
      outputId: "copy_standard",
      inputId: "copy_raw",
      conditionKey: "age_group",
      tablesByGroup: buildLookupByGroup(normTables.copy),
    },
    {
      type: "formula",
      outputId: "copy_percentile",
      formula: PERCENTILE_FORMULA,
      variables: { s: "copy_standard" },
    },
    {
      type: "threshold",
      outputId: "copy_verbal",
      sourceOutputId: "copy_standard",
      thresholds: VERBAL_STANDARD,
    },
    {
      type: "z_score",
      outputId: "copy_duration_z",
      inputId: "copy_duration",
      conditionKey: "age_group",
      statsByGroup: buildStatsByGroup(durationStats.copy),
    },
    {
      type: "threshold",
      outputId: "copy_duration_verbal",
      sourceOutputId: "copy_duration_z",
      thresholds: VERBAL_DURATION,
    },
    {
      type: "lookup_table",
      outputId: "recall_standard",
      inputId: "recall_raw",
      conditionKey: "age_group",
      tablesByGroup: buildLookupByGroup(normTables.recall),
    },
    {
      type: "formula",
      outputId: "recall_percentile",
      formula: PERCENTILE_FORMULA,
      variables: { s: "recall_standard" },
    },
    {
      type: "threshold",
      outputId: "recall_verbal",
      sourceOutputId: "recall_standard",
      thresholds: VERBAL_STANDARD,
    },
    {
      type: "z_score",
      outputId: "recall_duration_z",
      inputId: "recall_duration",
      conditionKey: "age_group",
      statsByGroup: buildStatsByGroup(durationStats.recall),
    },
    {
      type: "threshold",
      outputId: "recall_duration_verbal",
      sourceOutputId: "recall_duration_z",
      thresholds: VERBAL_DURATION,
    },
  ],
};

export const BENDER2_TEST_META = {
  name: "Bender II",
  description:
    "מבחן Bender Visual-Motor Gestalt — מהדורה שנייה. מעריך תפיסה מוטורית-חזותית. כולל שלב העתקה (Copy) ושלב זיכרון (Recall) עם ציון גלם ומשך זמן לכל שלב.",
  category: "Visual-Motor",
  ageRange: "4-0 to 85+",
};
