import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"

const queue = [
  { id: 1, file: "phone-stand.gcode", priority: "high", eta: "2h 30m" },
  { id: 2, file: "desk-organizer.gcode", priority: "normal", eta: "4h 15m" },
  { id: 3, file: "cable-holder.gcode", priority: "normal", eta: "1h 20m" },
  { id: 4, file: "prototype-v2.gcode", priority: "low", eta: "5h 45m" },
]

const priorityColors = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  normal: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
}

export function JobQueue() {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Print Queue</h2>
          <Badge variant="outline" className="font-mono">
            {queue.length} Jobs
          </Badge>
        </div>

        <div className="space-y-2">
          {queue.map((job, index) => (
            <div
              key={job.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-card text-muted-foreground font-mono text-sm">
                {index + 1}
              </div>
              <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate font-mono">{job.file}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{job.eta}</span>
                </div>
              </div>
              <Badge className={priorityColors[job.priority]} variant="outline">
                {job.priority}
              </Badge>
            </div>
          ))}
        </div>

        <Button className="w-full bg-transparent" variant="outline">
          View All Jobs
        </Button>
      </div>
    </Card>
  )
}
