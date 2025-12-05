import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const materials = [
  { name: "PLA - Black", used: 75, total: 1000, color: "bg-primary" },
  { name: "PETG - Clear", used: 340, total: 1000, color: "bg-accent" },
  { name: "ABS - White", used: 890, total: 1000, color: "bg-chart-3" },
  { name: "PLA - Gray", used: 120, total: 1000, color: "bg-muted-foreground" },
]

export function MaterialUsage() {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Material Levels</h2>

        <div className="space-y-4">
          {materials.map((material) => {
            const percentage = (material.used / material.total) * 100
            const remaining = material.total - material.used

            return (
              <div key={material.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{material.name}</span>
                  <span className="text-muted-foreground font-mono">{remaining}g left</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
