// JSX runtime is automatic; no explicit React import required
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Thermometer,
  AlertCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  House,
  Upload,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  usePrinterStatus,
  useFilamentInfo,
  useWsPercentage,
  usePrinterAction,
  useUploadGcode,
  usePrinterError,
  useSendGcode,
} from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import Button from "./ui/button";
import { TemperatureGraph } from "./temperature-graph";

const MotionCard = motion(Card);

export function PrinterDetail({
  id,
  onClose,
  className = "",
}: {
  id: string;
  onClose: () => void;
  className?: string;
}) {
  const { data, isLoading, error } = usePrinterStatus(id, true);
  const errorState = usePrinterError(id);

  const bed =
    typeof data?.bed_temperature === "number" ? data?.bed_temperature : null;
  const nz = data?.nozzle_temperatures;
  const nozzle = Array.isArray(nz)
    ? nz[0]
    : typeof nz === "number"
    ? nz
    : nz?.current ?? nz?.nozzle;
  const status = data?.print_status || "unknown";
  const filament_info = useFilamentInfo(id);
  const { data: wsPct } = useWsPercentage(id);
  const percent: number | null =
    typeof wsPct?.print_percentage === "number" ? wsPct.print_percentage : null;
  const { mutate: runAction, isPending } = usePrinterAction();
  const upload = useUploadGcode();
  const { mutate: sendGcode, isPending: isGcodePending } = useSendGcode();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const jogDistance = 10; // Fixed 10mm jog distance (can make configurable later)
  
  const onPick = () => inputRef.current?.click();
  const onFileChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    setSelectedName(f?.name || "");
  };
  const onUpload = () => {
    const f = inputRef.current?.files?.[0];
    if (!f) return;
    upload.mutate({ printerId: id, file: f });
  };

  // Movement helper - sends relative G-code commands
  const handleMove = (axis: 'X' | 'Y' | 'Z', direction: 1 | -1) => {
    const distance = direction * jogDistance;
    const feedrate = axis === 'Z' ? 1000 : 3000; // Slower for Z axis
    const gcode = `G91\nG1 ${axis}${distance} F${feedrate}\nG90`;
    sendGcode({ printerId: id, gcode }, {
      onError: (error: Error) => {
        const errorMsg = error?.message || String(error);
        
        // Check if trying to move during printing
        if (errorMsg.includes('printing') || errorMsg.includes('printing_in_progress')) {
          alert('🚫 SAFETY BLOCK: Cannot move axes while printing!\n\nManual movement during printing could damage your print or printer.');
        }
        // Check if this is a homing error
        else if (errorMsg.includes('must be homed') || errorMsg.includes('requires_homing')) {
          alert('⚠️ Safety Error: Printer must be homed before moving axes.\n\nPlease click the Home button first.');
        }
      }
    });
  };
  
  // Disable movement buttons if printer is actively printing
  const isPrinting = status.toLowerCase().includes('print');
  const movementDisabled = isGcodePending || isPrinting;

  return (
    <MotionCard
      layoutId={`printer-${id}`}
      layout
      transition={{
        layout: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] },
        duration: 0.2,
      }}
      className={`p-6 shadow-lg space-y-4 ${
        errorState.isError ? "border-2 border-destructive" : "border-primary/70"
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Printer: {id}</h2>
          <div className="flex items-center gap-2">
            {errorState.isError && (
              <Badge className="flex items-center gap-1 bg-destructive text-destructive-foreground">
                <AlertTriangle className="w-3 h-3" />
                Error
              </Badge>
            )}
            <Badge variant="outline" className="font-mono capitalize">
              {status}
            </Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {errorState.isError && errorState.errorReason && (
        <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-medium">Printer Error Detected</div>
            <div className="text-sm">{errorState.errorReason}</div>
            {errorState.errorType === "timeout" && (
              <div className="text-xs opacity-80">
                This operation is taking longer than expected. The printer may
                need attention.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 text-left flex flex-col">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Thermometer className="w-4 h-4" /> Vitals
          </h3>
          <div className="text-sm font-mono">Nozzle: {nozzle ?? "-"}°C</div>
          <div className="text-sm font-mono">Bed: {bed ?? "-"}°C</div>
          <div className="text-sm font-mono">
            Material: {filament_info.data?.tray_type ?? "-"}
          </div>

          {/* Temperature Graph */}
          <div className="pt-2">
            <TemperatureGraph printerId={id} />
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <h3 className="text-sm font-medium">Upload G-code</h3>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".gcode,.g,.nc"
                className="hidden"
                onChange={onFileChosen}
              />
              <button
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70"
                onClick={onPick}
              >
                <Upload className="w-4 h-4" /> Choose File
              </button>
              <span className="text-xs text-muted-foreground truncate max-w-48">
                {selectedName || "No file selected"}
              </span>
              <button
                className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                disabled={!selectedName || upload.isPending}
                onClick={onUpload}
              >
                {upload.isPending ? "Uploading…" : "Upload & Print"}
              </button>
            </div>
            {upload.isError && (
              <div className="text-xs text-destructive">
                {String(upload.error?.message || "Upload failed")}
              </div>
            )}
            {upload.isSuccess && (
              <div className="text-xs text-green-600">
                Started print: {selectedName}
              </div>
            )}
          </div>
        </div>
        {/* <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2"><Droplets className="w-4 h-4" /> Material</h3>
          <div className="text-sm text-muted-foreground">{filament_info.data?.tray_type ?? '-'}</div>
        </div> */}

        <div className="space-y-2 flex flex-col">
          {status.toLowerCase() === "idle" ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No active prints
            </div>
          ) : typeof percent === "number" ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono">{Math.round(percent)}%</span>
              </div>
              <Progress value={percent} />
            </div>
          ) : null}
          <div className="pt-2 border-t border-border space-y-2">
            <h3 className="text-sm font-medium">Controls</h3>
            <div className="flex gap-3">
              <button
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70"
                onClick={() => runAction({ id, action: "pause" })}
                disabled={isPending}
              >
                <PauseCircle className="w-4 h-4" /> Pause
              </button>
              <button
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70"
                onClick={() => runAction({ id, action: "resume" })}
                disabled={isPending}
              >
                <PlayCircle className="w-4 h-4" /> Resume
              </button>
              <button
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70"
                onClick={() => runAction({ id, action: "cancel" })}
                disabled={isPending}
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
              {/* <button
                className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70"
                onClick={() => runAction({ id, action: "home" })}
                disabled={isPending}
              >
                <House className="w-4 h-4" /> Home
              </button> */}
            </div>
            {/* <p className="text-xs text-muted-foreground">(Control endpoints not implemented yet.)</p> */}
          </div>
          {/* XY Movement */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">XY Axis</h3>
            <div className="flex flex-col items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => handleMove("Y", 1)}
                disabled={movementDisabled}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handleMove("X", -1)}
                  disabled={movementDisabled}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runAction({ id, action: "home" })}
                  disabled={isPending || isPrinting}
                >
                  <House className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleMove("X", 1)}
                  disabled={movementDisabled}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="outline"
                onClick={() => handleMove("Y", -1)}
                disabled={movementDisabled}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-center text-muted-foreground">
              {jogDistance}mm per move
            </div>
          </Card>

          {/* Z Movement */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Z Axis</h3>
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => handleMove("Z", 1)}
                variant="outline"
                className="w-32"
                disabled={movementDisabled}
              >
                <ArrowUp className="w-4 h-4 mr-2" />Z Up
              </Button>
              <Button
                onClick={() => handleMove("Z", -1)}
                variant="outline"
                className="w-32"
                disabled={movementDisabled}
              >
                <ArrowDown className="w-4 h-4 mr-2" />Z Down
              </Button>
            </div>
            <div className="mt-2 text-xs text-center text-muted-foreground">
              {jogDistance}mm per move
            </div>
          </Card>
        </div>
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" /> Printer reports an error.
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {isLoading && "Loading detailed status..."}
        {error && "Error loading status"}
      </div>
    </MotionCard>
  );
}

export default PrinterDetail;
