import React, { createContext, useContext, useState } from "react";

interface PrinterSelectionCtx {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const PrinterSelectionContext = createContext<PrinterSelectionCtx | undefined>(undefined);

export function PrinterSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <PrinterSelectionContext.Provider value={{ selectedId, setSelectedId }}>
      {children}
    </PrinterSelectionContext.Provider>
  );
}

export function usePrinterSelection() {
  const ctx = useContext(PrinterSelectionContext);
  if (!ctx) throw new Error("usePrinterSelection must be used within PrinterSelectionProvider");
  return ctx;
}
