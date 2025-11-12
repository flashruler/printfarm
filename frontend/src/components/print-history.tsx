import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Printer, FileCode } from "lucide-react"
import { usePrintHistory } from "@/lib/utils"

function formatTime(ts: string) {
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ts
    return d.toLocaleString()
  } catch {
    return ts
  }
}

export function PrintHistory() {
  const { data, isLoading, error } = usePrintHistory()
  const items = data?.items || []

  return (
    <Card className="p-6 bg-card border-border space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Prints</h2>
        <Badge variant="outline" className="font-mono">{items.length}</Badge>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">{String(error.message || error)}</div>}

      <div className="space-y-3">
        {items.map((job) => {
          const pct = typeof job.progress === 'number' ? Math.max(0, Math.min(100, Number(job.progress))) : null
          return (
            <div key={job.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate font-mono">{job.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Printer className="w-3 h-3" />
                      <span className="font-mono">{job.printer_id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Started {formatTime(job.started_at)}</span>
                  </div>
                </div>
              </div>
              {pct !== null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono">{Math.round(pct)}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default PrintHistory
