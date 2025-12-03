import { Progress } from "@/components/ui/progress";

interface PrintProgressProps {
  status: string;
  percentage: number | null;
}

export function PrintProgress({ status, percentage }: PrintProgressProps) {
  const isIdle = status.toLowerCase() === "idle";
  
  if (isIdle) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No active prints
      </div>
    );
  }

  if (typeof percentage !== "number") {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-mono">{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}
