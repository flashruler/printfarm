import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

export type PrinterListItem = { id: string; type: string }
export interface PrinterStatus {
  bed_temperature?: number | null
  nozzle_temperatures?: number | number[] | { current?: number; nozzle?: number }
  print_status?: string | null
  print_phase?: string | null
  print_error_code?: number | null
  has_error?: boolean
}

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
  return useQuery<PrinterStatus, Error>({
    queryKey: ["printer-status", id],
    queryFn: async () => {
      const res = await fetch(`/api/printers/${id}/status`)
      if (!res.ok) throw new Error("Failed to fetch status")
      return res.json() as Promise<PrinterStatus>
    },
    enabled,
    refetchInterval: 5_000,
  })
}


// -------------------------
// POST helpers & mutations
// -------------------------
export async function postJson<TResp, TBody = unknown>(url: string, body?: TBody, init?: RequestInit): Promise<TResp> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || res.statusText)
  }
  return res.json() as Promise<TResp>
}

export type PrinterAction = 'pause' | 'resume' | 'cancel' | 'home'
export interface ActionResult { status?: string; error?: string; action?: PrinterAction }

// Mutation hook for printer control actions. WebSocket broadcast will update caches; invalidations are fallback only.
export function usePrinterAction() {
  const qc = useQueryClient()
  return useMutation<ActionResult, Error, { id: string; action: PrinterAction}>({
    mutationFn: ({ id, action }) => postJson<ActionResult>(`/api/printers/${id}/${action}`),
    onSuccess: (_data, vars) => {
      // Optional invalidations in case WS missed or user was disconnected
      qc.invalidateQueries({ queryKey: ["printer-status", vars.id] })
      qc.invalidateQueries({ queryKey: ["printer-percentage", vars.id] })
    },
  })
}



// Filament info: fetch once, then rely on WS to push updates when material changes
export interface FilamentInfo { tray_type?: string | null; error?: string }
export function useFilamentInfo(id: string) {
  return useQuery<FilamentInfo, Error>({
    queryKey: ["printer-filament", id],
    queryFn: async () => {
      const res = await fetch(`/api/printers/${id}/filamentinfo`)
      if (!res.ok) throw new Error("Failed to fetch filament info")
      return res.json() as Promise<FilamentInfo>
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
              // Also cache print phase & error info separately for lightweight reads
              const phase = msg.status.print_phase || msg.status.print_status || null
              const errorCode = msg.status.print_error_code ?? null
              const hasError = msg.status.has_error ?? (typeof errorCode === 'number' && errorCode !== 0)
              qc.setQueryData(["printer-printphase", pid], { print_phase: phase, print_error_code: errorCode, has_error: hasError })
            }
            if (Object.prototype.hasOwnProperty.call(msg, 'tray_type')) {
              const prev = qc.getQueryData<FilamentInfo | undefined>(["printer-filament", pid])
              const nextTray = (msg.tray_type as string | null | undefined) ?? null
              const hasNext = typeof nextTray === 'string' && nextTray.trim() !== ''
              // Only write when we have a concrete material string or the server says it changed
              if (hasNext || msg.tray_type_changed) {
                if (!prev || prev.tray_type !== nextTray) {
                  qc.setQueryData(["printer-filament", pid], { tray_type: nextTray } as FilamentInfo)
                }
              }
            }
          }
        } catch {
          // ignore malformed WS payloads
        }
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
    queryFn: async () => qc.getQueryData<{ print_percentage: number | null; error?: string }>(["printer-percentage", id]),
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
    queryFn: async () => qc.getQueryData<{ tray_type: string | null; error?: string }>(["printer-filament", id]),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}

export function useWsPrintPhase(id: string) {
  const qc = useQueryClient()
  return useQuery<{ print_phase: string | null; error?: string } | undefined>({
    queryKey: ["printer-printphase", id],
    queryFn: async () => qc.getQueryData<{ print_phase: string | null; error?: string }>(["printer-printphase", id]),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}

// -------------------------
// Prints history and upload
// -------------------------
export interface PrintJobItem {
  id: string
  file_name: string
  printer_id: string
  started_at: string
  uploaded_path?: string
  status?: string
  progress?: number | null
}

export function usePrintHistory() {
  return useQuery<{ items: PrintJobItem[] }, Error>({
    queryKey: ["print-history"],
    queryFn: async () => {
      const res = await fetch(`/api/prints`)
      if (!res.ok) throw new Error("Failed to fetch prints")
      return res.json()
    },
    refetchInterval: 4000,
  })
}

export function useUploadGcode() {
  const qc = useQueryClient()
  return useMutation<{ id: string }, Error, { printerId: string; file: File }>({
    mutationFn: async ({ printerId, file }) => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/printers/${encodeURIComponent(printerId)}/upload`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(text || 'Upload failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["print-history"] })
    }
  })
}
