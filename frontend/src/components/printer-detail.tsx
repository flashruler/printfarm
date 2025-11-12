// JSX runtime is automatic; no explicit React import required
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Thermometer, Droplets, AlertCircle, XCircle, PauseCircle, PlayCircle, House, Upload } from 'lucide-react';
import { usePrinterStatus, useFilamentInfo, useWsPercentage, usePrinterAction, useUploadGcode  } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

const MotionCard = motion(Card);

export function PrinterDetail({ id, onClose, className = "" }: { id: string; onClose: () => void; className?: string }) {
  const { data, isLoading, error } = usePrinterStatus(id, true);

  const bed = typeof data?.bed_temperature === 'number' ? data?.bed_temperature : null;
  const nz = data?.nozzle_temperatures;
  const nozzle = Array.isArray(nz) ? nz[0] : (typeof nz === 'number' ? nz : (nz?.current ?? nz?.nozzle));
  const status = data?.print_status || 'unknown';
  const filament_info = useFilamentInfo(id);
  const { data: wsPct } = useWsPercentage(id);
  const percent: number | null = typeof wsPct?.print_percentage === 'number' ? wsPct.print_percentage : null;
  const { mutate: runAction, isPending} = usePrinterAction()
  const upload = useUploadGcode()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedName, setSelectedName] = useState<string>("")
  const onPick = () => inputRef.current?.click()
  const onFileChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]
    setSelectedName(f?.name || "")
  }
  const onUpload = () => {
    const f = inputRef.current?.files?.[0]
    if (!f) return
    upload.mutate({ printerId: id, file: f })
  }

  return (
    <MotionCard
      layoutId={`printer-${id}`}
      layout
      transition={{ layout: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }, duration: 0.2 }}
      className={`p-6 border-primary/70 shadow-lg space-y-4 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Printer: {id}</h2>
          <Badge variant="outline" className="font-mono capitalize">{status}</Badge>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 text-left">
          <h3 className="text-sm font-medium flex items-center gap-2"><Thermometer className="w-4 h-4" /> Vitals</h3>
          <div className="text-sm font-mono">Nozzle: {nozzle ?? '-'}°C</div>
          <div className="text-sm font-mono">Bed: {bed ?? '-'}°C</div>
          <div className="text-sm font-mono">Material: {filament_info.data?.tray_type ?? '-'}</div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2"><Droplets className="w-4 h-4" /> Material</h3>
          <div className="text-sm text-muted-foreground">{filament_info.data?.tray_type ?? '-'}</div>
        </div>
      </div>

      {typeof percent === 'number' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono">{Math.round(percent)}%</span>
          </div>
          <Progress value={percent} />
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" /> Printer reports an error.
        </div>
      )}

      <div className="pt-2 border-t border-border space-y-2">
        <h3 className="text-sm font-medium">Controls</h3>
        <div className="flex gap-3">
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" onClick={() => runAction({ id, action: "pause" })} disabled={isPending}>
            <PauseCircle className="w-4 h-4" /> Pause
          </button>
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" onClick={() => runAction({ id, action: "resume" })} disabled={isPending}>
            <PlayCircle className="w-4 h-4" /> Resume
          </button>
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" onClick={() => runAction({ id, action: "cancel" })} disabled={isPending}>
            <XCircle className="w-4 h-4" /> Cancel
          </button>
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" onClick={() => runAction({ id, action: "home" })} disabled={isPending}>
            <House className="w-4 h-4" /> Home
          </button>
        </div>
        {/* <p className="text-xs text-muted-foreground">(Control endpoints not implemented yet.)</p> */}
      </div>

      <div className="pt-2 border-t border-border space-y-2">
        <h3 className="text-sm font-medium">Upload G-code</h3>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept=".gcode,.g,.nc" className="hidden" onChange={onFileChosen} />
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" onClick={onPick}>
            <Upload className="w-4 h-4" /> Choose File
          </button>
          <span className="text-xs text-muted-foreground truncate max-w-48">{selectedName || 'No file selected'}</span>
          <button className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50" disabled={!selectedName || upload.isPending} onClick={onUpload}>
            {upload.isPending ? 'Uploading…' : 'Upload & Print'}
          </button>
        </div>
        {upload.isError && (
          <div className="text-xs text-destructive">{String(upload.error?.message || 'Upload failed')}</div>
        )}
        {upload.isSuccess && (
          <div className="text-xs text-green-600">Started print: {selectedName}</div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {isLoading && 'Loading detailed status...'}
        {error && 'Error loading status'}
      </div>
    </MotionCard>
  );
}

export default PrinterDetail;
