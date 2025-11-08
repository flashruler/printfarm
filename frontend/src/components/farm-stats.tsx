import { Card } from "@/components/ui/card"
import { Cpu, Clock, Activity, AlertTriangle } from "lucide-react"

export function FarmStats() {
  const stats = [
    {
      label: "Active Printers",
      value: "8/12",
      change: "+2",
      icon: Cpu,
      color: "text-primary",
    },
    {
      label: "Total Print Time",
      value: "47.3h",
      change: "Today",
      icon: Clock,
      color: "text-accent",
    },
    {
      label: "Success Rate",
      value: "94.2%",
      change: "+1.2%",
      icon: Activity,
      color: "text-accent",
    },
    {
      label: "Warnings",
      value: "2",
      change: "Active",
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
