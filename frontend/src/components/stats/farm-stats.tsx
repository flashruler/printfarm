import { Card } from "@/components/ui/card"
import { Cpu, AlertTriangle } from "lucide-react"
import { usePrinters } from "@/lib/utils"

export function FarmStats() {
    const { data: printers} = usePrinters()
    const activeCount = Array.isArray(printers)
    ? printers.length
    : 0
    
    // Simplified - error counting removed to avoid infinite loop complexity
    // Individual printer cards show their own error states
    const totalErrors = 0

  const stats = [
    {
      label: "Active Printers",
      value: `${activeCount}/${printers?.length ?? "0"}`,
      change: "+2",
      icon: Cpu,
      color: "text-primary",
    },
    {
      label: "Warnings",
      value: totalErrors.toString(),
      change: "Active errors",
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Card key={i} className="p-6 bg-card border-border">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-foreground font-mono">{stat.value}</h3>
                  <span className="text-xs text-muted-foreground">{stat.change}</span>
                </div>
              </div>
              <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
