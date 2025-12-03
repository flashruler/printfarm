import { PauseCircle, PlayCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/button";

interface PrintControlsProps {
  status: string;
  isPending: boolean;
  onAction: (action: string) => void;
}

export function PrintControls({ status, isPending, onAction }: PrintControlsProps) {
  const isPaused = status.toLowerCase().includes("pause");
  const isPrinting = status.toLowerCase().includes("print");
  const isActive = isPrinting || isPaused;

  if (!isActive) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Controls</h3>
      <div className="flex gap-2">
        {!isPaused && (
          <Button
            onClick={() => onAction("pause")}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <PauseCircle className="w-4 h-4 mr-1" />
            Pause
          </Button>
        )}
        {isPaused && (
          <Button
            onClick={() => onAction("resume")}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <PlayCircle className="w-4 h-4 mr-1" />
            Resume
          </Button>
        )}
        <Button
          onClick={() => onAction("cancel")}
          disabled={isPending}
          variant="destructive"
          size="sm"
          className="flex-1"
        >
          <XCircle className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
