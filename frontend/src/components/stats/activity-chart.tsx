"use client"

import { Card } from "@/components/ui/card"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { time: "00:00", active: 2, completed: 0 },
  { time: "02:00", active: 3, completed: 1 },
  { time: "04:00", active: 5, completed: 2 },
  { time: "06:00", active: 7, completed: 3 },
  { time: "08:00", active: 8, completed: 5 },
  { time: "10:00", active: 9, completed: 7 },
  { time: "12:00", active: 8, completed: 9 },
  { time: "14:00", active: 7, completed: 11 },
  { time: "16:00", active: 8, completed: 13 },
  { time: "18:00", active: 6, completed: 15 },
  { time: "20:00", active: 5, completed: 16 },
  { time: "22:00", active: 4, completed: 17 },
]

export function ActivityChart() {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">24h Activity</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Active Prints</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.269 0 0)" vertical={false} />
            <XAxis dataKey="time" stroke="oklch(0.708 0 0)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.708 0 0)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.18 0 0)",
                border: "1px solid oklch(0.269 0 0)",
                borderRadius: "8px",
                color: "oklch(0.985 0 0)",
              }}
            />
            <Line type="monotone" dataKey="active" stroke="oklch(0.65 0.24 264)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="completed" stroke="oklch(0.75 0.19 160)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
