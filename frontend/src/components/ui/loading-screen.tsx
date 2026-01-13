

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-100 w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  )
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  }

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className={`absolute inset-0 border-muted rounded-full ${sizeClasses[size]}`} />
      <div
        className={`absolute inset-0 border-primary border-t-transparent rounded-full animate-spin ${sizeClasses[size]}`}
      />
    </div>
  )
}


export function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  )
}