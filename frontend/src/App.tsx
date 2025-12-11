import { useState } from "react";
import PrinterManager from "./components/printer/PrinterManager";
import { FarmStats } from "./components/stats/farm-stats";
import { PrinterGrid } from "./components/printer/printer-grid";
import { Sidebar } from "./components/layout/Sidebar";
import { PluginProvider, usePlugins } from "./plugins/PluginRegistry";
import "./App.css";
import { useStatusStream } from "@/lib/utils";

function App() {
  return (
    <PluginProvider>
      <AppContent />
    </PluginProvider>
  );
}

function AppContent() {
  // Establish a single WebSocket connection to receive live updates
  useStatusStream(true);

  const [currentView, setCurrentView] = useState("dashboard");
  const { plugins } = usePlugins();

  return (
    <div className="flex h-screen bg-background">
      {/* VS Code-style Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {currentView === "dashboard" && (
          <div className="p-6 space-y-8">
            <header>
              <h1 className="text-2xl font-bold mb-4">PrintFarm Dashboard</h1>
            </header>

            {/* Top KPIs */}
            <FarmStats />

            {/* Main content - Full width */}
            <div className="space-y-6">
              <PrinterGrid />
            </div>
          </div>
        )}

        {/* Placeholder for other views */}
        {currentView === "printers" && (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 capitalize">
              {currentView}
            </h1>
            <p className="text-muted-foreground">Coming soon...</p>
            {/* Management utilities */}
            <section className="pt-4 border-t">
              <h2 className="text-xl font-semibold mb-2">Manage Printers</h2>
              <PrinterManager />
            </section>
          </div>
        )}

        {/* Plugin Views - dynamically rendered */}
        {plugins.map((plugin) => {
          const pluginViewId = plugin.manifest.sidebar?.id;
          if (pluginViewId && currentView === pluginViewId) {
            const PluginComponent = plugin.Component;
            return <PluginComponent key={plugin.manifest.name} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default App;
