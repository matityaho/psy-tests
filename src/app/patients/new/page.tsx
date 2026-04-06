import { PatientForm } from "@/components/patients/PatientForm";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">New Patient</h2>
      <PatientForm />
    </div>
  );
}
