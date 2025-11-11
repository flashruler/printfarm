
import PrinterManager from './components/PrinterManager';
import { FarmStats } from './components/farm-stats';
import { ActivityChart } from './components/activity-chart';
import { PrinterGrid } from './components/printer-grid';
import { JobQueue } from './components/job-queue';
import { MaterialUsage } from './components/material-usage';
import './App.css'
import { useStatusStream } from '@/lib/utils'

function App() {
  // Establish a single WebSocket connection to receive live updates (e.g., print percentage)
  useStatusStream(true)

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold mb-4">PrintFarm Dashboard</h1>
      </header>

      {/* Top KPIs */}
      <FarmStats />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* <ActivityChart /> */}
          <PrinterGrid />
        </div>
        {/* <div className="space-y-6">
          <JobQueue />
          <MaterialUsage />
        </div> */}
      </div>

      {/* Management utilities */}
      <section className="pt-4 border-t">
        <h2 className="text-xl font-semibold mb-2">Manage Printers</h2>
        <PrinterManager />
      </section>
    </div>
  )
}

export default App
