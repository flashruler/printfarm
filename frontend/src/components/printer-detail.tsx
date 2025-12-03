// JSX runtime is automatic; no explicit React import required
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";
import {
  XCircle,
  AlertTriangle,
  Edit3,
  RotateCcw,
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
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TemperatureGraph } from "./temperature-graph";
import { PrinterVitals } from "./printer-vitals";
import { PrintProgress } from "./print-progress";
import { PrintControls } from "./print-controls";
import { MovementControls } from "./movement-controls";
import { GCodeUploader } from "./gcode-uploader";
import { DraggableCard } from "./draggable-card";
import { 
  loadLayoutConfig, 
  saveLayoutConfig, 
  resetLayoutConfig,
  type ComponentConfig,
  type ComponentId 
} from "@/lib/layout-config";

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
  const { data } = usePrinterStatus(id, true);
  const errorState = usePrinterError(id);
  
  // Layout configuration state
  const [layoutConfig, setLayoutConfig] = useState(() => loadLayoutConfig());
  const [isEditMode, setIsEditMode] = useState(false);

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
  const jogDistance = 10; // Fixed 10mm jog distance (can make configurable later)

  // Movement helper - sends relative G-code commands
  const handleMoveAxis = (axis: 'X' | 'Y' | 'Z', direction: 1 | -1) => {
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
  
  const handleHome = () => {
    runAction({ id, action: "home" });
  };
  
  const handlePrintAction = (action: string) => {
    runAction({ id, action: action as "pause" | "resume" | "cancel" | "home" });
  };
  
  const handleUpload = (file: File) => {
    upload.mutate({ printerId: id, file });
  };
  
  // Disable movement buttons if printer is actively printing
  const isPrinting = status.toLowerCase().includes('print');
  const movementDisabled = isGcodePending || isPrinting;

  // Handlers for layout configuration
  const handleMove = (dragId: ComponentId, hoverId: ComponentId) => {
    setLayoutConfig((prev) => {
      const components = [...prev.components];
      const dragIndex = components.findIndex((c) => c.id === dragId);
      const hoverIndex = components.findIndex((c) => c.id === hoverId);

      if (dragIndex === -1 || hoverIndex === -1) return prev;

      const dragComponent = components[dragIndex];
      const hoverComponent = components[hoverIndex];

      // Only allow reordering within the same column
      if (dragComponent.column !== hoverComponent.column) return prev;

      // Reorder by removing and inserting
      components.splice(dragIndex, 1);
      components.splice(hoverIndex, 0, dragComponent);

      // Update order values
      components.forEach((c, idx) => {
        c.order = idx;
      });

      const newConfig = { components };
      saveLayoutConfig(newConfig);
      return newConfig;
    });
  };

  const handleToggleComponent = (componentId: ComponentId) => {
    setLayoutConfig((prev) => {
      const components = prev.components.map((c) =>
        c.id === componentId ? { ...c, enabled: !c.enabled } : c
      );
      const newConfig = { components };
      saveLayoutConfig(newConfig);
      return newConfig;
    });
  };

  const handleResetLayout = () => {
    const defaultConfig = resetLayoutConfig();
    setLayoutConfig(defaultConfig);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Separate components by column and sort by order
  const leftComponents = useMemo(
    () =>
      layoutConfig.components
        .filter((c) => c.column === 'left')
        .sort((a, b) => a.order - b.order),
    [layoutConfig]
  );

  const rightComponents = useMemo(
    () =>
      layoutConfig.components
        .filter((c) => c.column === 'right')
        .sort((a, b) => a.order - b.order),
    [layoutConfig]
  );

  // Component renderer
  const renderComponent = (config: ComponentConfig) => {
    let component: React.ReactNode = null;

    switch (config.id) {
      case 'vitals':
        component = (
          <PrinterVitals
            nozzle={nozzle ?? null}
            bed={bed}
            status={status}
            material={filament_info.data?.tray_type}
          />
        );
        break;
      case 'temperature-graph':
        component = <TemperatureGraph printerId={id} />;
        break;
      case 'gcode-uploader':
        component = (
          <GCodeUploader
            printerId={id}
            onUpload={handleUpload}
            isUploading={upload.isPending}
            error={upload.isError ? String(upload.error?.message || "Upload failed") : null}
            success={upload.isSuccess}
          />
        );
        break;
      case 'print-progress':
        component = <PrintProgress status={status} percentage={percent} />;
        break;
      case 'print-controls':
        component = (
          <PrintControls
            status={status}
            isPending={isPending}
            onAction={handlePrintAction}
          />
        );
        break;
      case 'movement-controls':
        component = (
          <MovementControls
            isDisabled={movementDisabled}
            onMove={handleMoveAxis}
            onHome={handleHome}
            jogDistance={jogDistance}
          />
        );
        break;
    }

    return (
      <DraggableCard
        key={config.id}
        id={config.id}
        isEditMode={isEditMode}
        isEnabled={config.enabled}
        label={config.label}
        column={config.column}
        onToggle={() => handleToggleComponent(config.id)}
        onMove={handleMove}
      >
        {component}
      </DraggableCard>
    );
  };

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
        <div className="flex items-center gap-2">
          <Button
            onClick={handleToggleEditMode}
            variant={isEditMode ? "default" : "outline"}
            size="sm"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            {isEditMode ? "Done" : "Edit Layout"}
          </Button>
          {isEditMode && (
            <Button
              onClick={handleResetLayout}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {isEditMode && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-sm">
          <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
            Edit Mode Active
          </div>
          <div className="text-muted-foreground text-xs">
            Drag components to reorder • Click eye icon to show/hide • Click reset to restore defaults
          </div>
        </div>
      )}

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

<DndProvider backend={HTML5Backend}>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4 text-left flex flex-col">
            {leftComponents.map((config) => renderComponent(config))}
          </div>

          {/* Right Column */}
          <div className="space-y-4 flex flex-col">
            {rightComponents.map((config) => renderComponent(config))}
          </div>
        </div>
      </DndProvider>
    </MotionCard>
  );
}

export default PrinterDetail;
