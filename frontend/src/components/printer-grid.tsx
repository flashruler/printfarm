"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Thermometer, Droplets } from "lucide-react"
import { usePrinters, usePrinterStatus, useWsPercentage, useWsTrayType, useWsPrintPhase } from "@/lib/utils"
import { usePrinterSelection } from "@/lib/printerSelection"
import { PrinterDetail } from "./printer-detail"
import { motion } from "framer-motion"

type StatusConfigKey = "printing" | "idle" | "error" | "unknown" | "finished"

const statusConfig: Record<StatusConfigKey, { color: string; label: string }> = {
  printing: { color: "bg-primary text-primary-foreground", label: "Printing" },
  idle: { color: "bg-muted text-muted-foreground", label: "Idle" },
  error: { color: "bg-destructive text-destructive-foreground", label: "Error" },
  finished: { color: "bg-green-600 text-white", label: "Finished" },
  unknown: { color: "bg-secondary text-foreground", label: "Unknown" },
}

function getTemps(status: any): { nozzle: number | null; bed: number | null } {
  // Backend returns: { bed_temperature, nozzle_temperatures, print_status, ... }
  const bed = typeof status?.bed_temperature === "number" ? status.bed_temperature : null
  let nozzle: number | null = null
  const nz = status?.nozzle_temperatures
  if (typeof nz === "number") nozzle = nz
  else if (Array.isArray(nz) && nz.length) nozzle = Number(nz[0])
  else if (nz && typeof nz === "object") {
    if (typeof nz.current === "number") nozzle = nz.current
    else if (typeof nz.nozzle === "number") nozzle = nz.nozzle
  }
  return { nozzle, bed }
}

const MotionCard = motion(Card)

function GridPrinterCard({ id, type }: { id: string; type: string }) {
  const { selectedId, setSelectedId } = usePrinterSelection()
  const isSelected = selectedId === id
  const { data, isLoading } = usePrinterStatus(id, !isSelected) // small card polling only if not expanded
  const { data: wsPct } = useWsPercentage(id)
  const percent: number | null = wsPct?.print_percentage ?? null
  const filamentInfo = useWsTrayType(id)
  const filamentType: string | null = filamentInfo.data?.tray_type ?? null
  const phaseInfo = useWsPrintPhase(id)
  const printPhase: string | null = (phaseInfo.data?.print_phase as any) ?? null
  const { nozzle, bed } = getTemps(data)
  const statusKey: StatusConfigKey =
    (data?.print_status === "RUNNING" && "printing") ||
    (data?.print_status === "IDLE" && "idle") ||
    (data?.print_status === "FINISH" && "finished") ||
    (data?.print_status === "ERROR" && "error") ||
    "unknown"

  if (isSelected) {
    return (
      <PrinterDetail
        id={id}
        onClose={() => setSelectedId(null)}
        className="col-span-1 md:col-span-2"
      />
    )
  }

  return (
    <MotionCard
      layoutId={`printer-${id}`}
      layout
      onClick={() => setSelectedId(id)}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ layout: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }, duration: 0.2 }}
      className="p-4 bg-card border-border transition-all duration-200 ease-out cursor-pointer hover:shadow-md hover:border-primary/50"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{type}</h3>
            <p className="text-xs text-muted-foreground font-mono">{id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[statusKey].color}>{statusConfig[statusKey].label}</Badge>
          </div>
        </div>
        <div>
          {typeof percent === 'number' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-mono text-foreground">{Math.round(percent)}%</span>
              </div>
              <Progress value={percent} />
              {printPhase && (
                <div className="text-[11px] text-muted-foreground mt-1 text-left">Current Phase: <span className="text-foreground font-medium">{printPhase}</span></div>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No active print</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              {isLoading ? (
                <span className="text-muted-foreground">…</span>
              ) : (
                <>
                  <span className="text-foreground font-mono">{nozzle ?? "-"}°</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-foreground font-mono">{bed ?? "-"}°</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{filamentType}</span>
          </div>
        </div>
      </div>
    </MotionCard>
  )
}

export function PrinterGrid() {
  const { data: printers, isLoading, error } = usePrinters()
  const { selectedId } = usePrinterSelection()
  const activeCount = Array.isArray(printers)
    ? printers.length // until we have richer status on list, just count all
    : 0

  // Ensure the expanded (selected) card renders first in the grid
  const ordered = Array.isArray(printers) ? [...printers] : []
  if (selectedId) {
    ordered.sort((a: any, b: any) => {
      if (a.id === selectedId) return -1
      if (b.id === selectedId) return 1
      return 0
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Printers</h2>
        <Badge variant="outline" className="font-mono">
          {activeCount} Active
        </Badge>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading printers...</div>}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {ordered?.map((p: any) => (
          <GridPrinterCard key={p.id} id={p.id} type={p.type} />
        ))}
        {ordered?.length === 0 && (
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">No printers added yet.</div>
          </Card>
        )}
      </div>
    </div>
  )
}
