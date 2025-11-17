import { Card } from "@/components/ui/card"
import { Cpu, AlertTriangle } from "lucide-react"
import { usePrinters, usePrinterError} from "@/lib/utils"
import { useEffect, useState, useCallback } from "react"

// Helper component to check error state for a single printer
function PrinterErrorChecker({ id, onErrorStateChange }: { id: string; onErrorStateChange: (hasError: boolean) => void }) {
  const errorState = usePrinterError(id)
  
  // Notify parent component when error state changes
  useEffect(() => {
    onErrorStateChange(errorState.isError)
  }, [errorState.isError, onErrorStateChange])
  
  return null // This component doesn't render anything
}

export function FarmStats() {
    const { data: printers} = usePrinters()
    const activeCount = Array.isArray(printers)
    ? printers.length
    : 0
    
    // Track error count across all printers
    const [errorCounts, setErrorCounts] = useState<Record<string, boolean>>({})
    
    const handleErrorStateChange = useCallback((printerId: string, hasError: boolean) => {
      setErrorCounts(prev => ({ ...prev, [printerId]: hasError }))
    }, [])
    
    const totalErrors = Object.values(errorCounts).filter(Boolean).length

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
    <>
      {/* Hidden error checkers for each printer */}
      {printers?.map(p => (
        <PrinterErrorChecker 
          key={p.id} 
          id={p.id} 
          onErrorStateChange={(hasError) => handleErrorStateChange(p.id, hasError)}
        />
      ))}
      
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
    </>
  )
}
