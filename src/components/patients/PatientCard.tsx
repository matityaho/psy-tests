import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PatientCardProps {
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    notes: string | null;
  };
}

export function PatientCard({ patient }: PatientCardProps) {
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {patient.firstName} {patient.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm">
          <span>Age: {age}</span>
          <Badge variant="outline">{patient.gender}</Badge>
          <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
        </div>
        {patient.notes && (
          <p className="mt-2 text-sm text-muted-foreground">{patient.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
