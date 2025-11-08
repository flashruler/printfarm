"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Thermometer, Droplets, AlertCircle } from "lucide-react"
import { usePrinters, usePrinterStatus } from "@/lib/utils"

type StatusConfigKey = "printing" | "idle" | "error" | "unknown"

const statusConfig: Record<StatusConfigKey, { color: string; label: string }> = {
  printing: { color: "bg-primary text-primary-foreground", label: "Printing" },
  idle: { color: "bg-muted text-muted-foreground", label: "Idle" },
  error: { color: "bg-destructive text-destructive-foreground", label: "Error" },
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

function GridPrinterCard({ id, type }: { id: string; type: string }) {
  const { data, isLoading, error } = usePrinterStatus(id, true)
  const { nozzle, bed } = getTemps(data)
  const statusKey: StatusConfigKey =
    (data?.print_status === "printing" && "printing") ||
    (data?.print_status === "IDLE" && "idle") ||
    (data?.print_status === "error" && "error") ||
    "unknown"

  return (
    <Card className="p-4 bg-card border-border hover:border-primary/50 transition-colors">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{type}</h3>
            <p className="text-xs text-muted-foreground font-mono">{id}</p>
          </div>
          <Badge className={statusConfig[statusKey].color}>{statusConfig[statusKey].label}</Badge>
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : error ? (
                <span className="text-destructive">Error</span>
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
            <span className="text-xs text-muted-foreground truncate">{type}</span>
          </div>
        </div>

        {/* Placeholder progress if available later */}
        {typeof (data as any)?.progress === "number" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate flex-1 font-mono">Current Job</span>
              <span className="text-foreground font-semibold ml-2">{(data as any).progress}%</span>
            </div>
            <Progress value={(data as any).progress} className="h-1.5" />
          </div>
        )}

        {(data as any)?.print_status === "error" && (
          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive">Printer reported error</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export function PrinterGrid() {
  const { data: printers, isLoading, error } = usePrinters()
  const activeCount = Array.isArray(printers)
    ? printers.length // until we have richer status on list, just count all
    : 0

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {printers?.map((p: any) => (
          <GridPrinterCard key={p.id} id={p.id} type={p.type} />
        ))}
        {printers?.length === 0 && (
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">No printers added yet.</div>
          </Card>
        )}
      </div>
    </div>
  )
}
