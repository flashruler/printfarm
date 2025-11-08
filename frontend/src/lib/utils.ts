import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useQuery } from "@tanstack/react-query"

export type PrinterListItem = { id: string; type: string }

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared data hooks for printers
export function usePrinters() {
  return useQuery<PrinterListItem[], Error>({
    queryKey: ["printers"],
    queryFn: async () => {
      const res = await fetch("/api/printers")
      if (!res.ok) throw new Error("Failed to fetch printers")
      return res.json()
    },
    refetchInterval: 10_000,
  })
}

export function usePrinterStatus(id: string, enabled: boolean) {
  return useQuery<any, Error>({
    queryKey: ["printer-status", id],
    queryFn: async () => {
      const res = await fetch(`/api/printers/${id}/status`)
      if (!res.ok) throw new Error("Failed to fetch status")
      return res.json()
    },
    enabled,
    refetchInterval: 5_000,
  })
}

// (printer selection context lives in src/lib/printerSelection.tsx)
