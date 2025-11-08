// JSX runtime is automatic; no explicit React import required
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Thermometer, Droplets, AlertCircle, XCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { usePrinterStatus } from '@/lib/utils';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);

export function PrinterDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, error } = usePrinterStatus(id, true);

  const bed = typeof data?.bed_temperature === 'number' ? data?.bed_temperature : null;
  const nz = data?.nozzle_temperatures;
  const nozzle = Array.isArray(nz) ? nz[0] : (typeof nz === 'number' ? nz : (nz?.current ?? nz?.nozzle));
  const status = data?.print_status || 'unknown';

  return (
    <MotionCard
      layoutId={`printer-${id}`}
      layout
      transition={{ layout: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }, duration: 0.2 }}
      className="p-6 border-primary/70 shadow-lg space-y-4"
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
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2"><Thermometer className="w-4 h-4" /> Temperatures</h3>
          <div className="text-sm font-mono">Nozzle: {nozzle ?? '-'}°C</div>
          <div className="text-sm font-mono">Bed: {bed ?? '-'}°C</div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2"><Droplets className="w-4 h-4" /> Material</h3>
          <div className="text-sm text-muted-foreground">(Material info TBD)</div>
        </div>
      </div>

      {typeof (data as any)?.progress === 'number' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono">{(data as any).progress}%</span>
          </div>
          <Progress value={(data as any).progress} />
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
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" disabled>
            <PauseCircle className="w-4 h-4" /> Pause
          </button>
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" disabled>
            <PlayCircle className="w-4 h-4" /> Resume
          </button>
          <button className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70" disabled>
            <XCircle className="w-4 h-4" /> Cancel
          </button>
        </div>
        <p className="text-xs text-muted-foreground">(Control endpoints not implemented yet.)</p>
      </div>

      <div className="text-xs text-muted-foreground">
        {isLoading && 'Loading detailed status...'}
        {error && 'Error loading status'}
      </div>
    </MotionCard>
  );
}

export default PrinterDetail;
