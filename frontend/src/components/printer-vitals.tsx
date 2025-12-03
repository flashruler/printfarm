import { Thermometer } from "lucide-react";
import Card from "./ui/card";

interface PrinterVitalsProps {
  nozzle: number | null;
  bed: number | null;
  status: string;
  material?: string | null;
}

export function PrinterVitals({ nozzle, bed, material }: PrinterVitalsProps) {
  return (
    <div className="space-y-2">
      <Card className="p-4 bg-card border-border">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Thermometer className="w-4 h-4" /> Vitals
        </h3>
        <div className="text-sm space-y-1">
          <div className="font-mono">
            Nozzle: {nozzle != null ? `${nozzle.toFixed(1)}°C` : "—"}
          </div>
          <div className="font-mono">
            Bed: {bed != null ? `${bed.toFixed(1)}°C` : "—"}
          </div>
          <div className="font-mono">Material: {material ?? "-"}</div>
        </div>
      </Card>
    </div>
  );
}
