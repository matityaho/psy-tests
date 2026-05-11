export interface PatientAge {
  ageYears: number;
  ageMonths: number;
}

export function computePatientAge(
  dateOfBirth: Date,
  asOf: Date = new Date(),
): PatientAge {
  let years = asOf.getFullYear() - dateOfBirth.getFullYear();
  let months = asOf.getMonth() - dateOfBirth.getMonth();

  if (asOf.getDate() < dateOfBirth.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { ageYears: years, ageMonths: months };
}

export function parseTimeMMSS(value: string): number {
  const match = value.match(/^(\d+):([0-5]?\d)$/);
  if (!match) {
    throw new Error(`Invalid MM:SS time: ${value}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatSecondsAsMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
