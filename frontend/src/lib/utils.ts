import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

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

// Filament info: fetch once, then rely on WS to push updates when material changes
export function getFilamentInfo(id: string) {
  return useQuery<any, Error>({
    queryKey: ["printer-filament", id],
    queryFn: async () => {
      const res = await fetch(`/api/printers/${id}/filamentinfo`)
      if (!res.ok) throw new Error("Failed to fetch filament info")
      return res.json()
    },
    enabled: true,
    refetchInterval: false,
    staleTime: Infinity,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

// Open one WebSocket and stream updates into the React Query cache
export function useStatusStream(enabled: boolean = true) {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled) return
    let closed = false

    const connect = () => {
      if (closed) return
      const url = `${location.origin.replace(/^http/, 'ws')}/api/ws`
      let ws: WebSocket | null = null
      try {
        ws = new WebSocket(url)
      } catch {
        setTimeout(connect, 2000)
        return
      }
      wsRef.current = ws
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          // Unified printer update message
          if (msg?.type === 'printer_update' && msg?.printer_id) {
            const pid = msg.printer_id
            if (typeof msg.percentage === 'number') {
              qc.setQueryData(["printer-percentage", pid], { print_percentage: msg.percentage })
            }
            if (msg.status) {
              qc.setQueryData(["printer-status", pid], msg.status)
            }
            if (Object.prototype.hasOwnProperty.call(msg, 'tray_type')) {
              const prev: any = qc.getQueryData(["printer-filament", pid])
              const nextTray = msg.tray_type as any
              const hasNext = typeof nextTray === 'string' && nextTray.trim() !== ''
              // Only write when we have a concrete material string or the server says it changed
              if (hasNext || msg.tray_type_changed) {
                if (!prev || prev.tray_type !== nextTray) {
                  qc.setQueryData(["printer-filament", pid], { tray_type: nextTray })
                }
              }
            }
          }
        } catch {}
      }
      ws.onclose = () => {
        wsRef.current = null
        if (!closed) setTimeout(connect, 2000)
      }
      ws.onerror = () => {
        ws?.close()
      }
      // Keepalive pings
      const ping = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 15000)
      ws.addEventListener('close', () => clearInterval(ping))
    }
    connect()
    return () => {
      closed = true
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close()
    }
  }, [enabled, qc])
}

// Read WS-fed percentage from cache without making a network request
export function useWsPercentage(id: string) {
  const qc = useQueryClient()
  return useQuery<{ print_percentage: number | null; error?: string } | undefined>({
    queryKey: ["printer-percentage", id],
    queryFn: async () => qc.getQueryData(["printer-percentage", id]) as any,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}
// Read WS-fed tray type from cache without making a network request
export function useWsTrayType(id: string) {
  const qc = useQueryClient()
  return useQuery<{ tray_type: string | null; error?: string } | undefined>({
    queryKey: ["printer-filament", id],
    queryFn: async () => qc.getQueryData(["printer-filament", id]) as any,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}
