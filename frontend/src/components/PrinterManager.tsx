import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrinters, usePrinterStatus } from '@/lib/utils';

type PrinterType = 'bambu' | 'prusalink' | 'octoprint';

interface BasePrinterPayload {
  id: string;
  type: PrinterType;
}

interface BambuPayload extends BasePrinterPayload {
  type: 'bambu';
  ip: string;
  access_code: string;
  serial: string;
}

interface PrusaLinkPayload extends BasePrinterPayload {
  type: 'prusalink';
  url: string;
  username: string;
  password: string;
}

interface OctoPrintPayload extends BasePrinterPayload {
  type: 'octoprint';
  url: string;
  api_key: string;
}

type AddPrinterPayload = BambuPayload | PrusaLinkPayload | OctoPrintPayload;

// Field definitions for each printer type
const PRINTER_FIELDS: Record<PrinterType, Array<{ name: string; label: string; placeholder: string; type?: string }>> = {
  bambu: [
    { name: 'ip', label: 'IP Address', placeholder: '192.168.1.100' },
    { name: 'access_code', label: 'Access Code', placeholder: '12345678' },
    { name: 'serial', label: 'Serial Number', placeholder: 'ABC123XYZ' },
  ],
  prusalink: [
    { name: 'url', label: 'URL', placeholder: 'http://192.168.1.150' },
    { name: 'username', label: 'Username', placeholder: 'maker' },
    { name: 'password', label: 'Password', placeholder: 'password', type: 'password' },
  ],
  octoprint: [
    { name: 'url', label: 'URL', placeholder: 'http://192.168.1.200' },
    { name: 'api_key', label: 'API Key', placeholder: 'Your OctoPrint API key', type: 'password' },
  ],
};

// Fetch list of printers

function PrinterRow({ id, type, onRemove }: { id: string; type: string; onRemove: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data: statusData, error: statusError, isLoading: statusLoading } = usePrinterStatus(id, open);

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">
          {id} <span className="text-xs text-gray-500">({type})</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            {open ? 'Hide' : 'Status'}
          </button>
          <button
            onClick={() => onRemove(id)}
            className="text-sm px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 text-sm">
          {statusLoading && <div>Loading status...</div>}
          {statusError && <div className="text-red-600">{statusError.message}</div>}
          {statusData && (
            <pre className="bg-gray-100 text-xs p-2 rounded overflow-x-auto">{JSON.stringify(statusData, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export const PrinterManager = () => {
  const qc = useQueryClient();
  const { data: printers, isLoading, error } = usePrinters();
  const [printerType, setPrinterType] = useState<PrinterType>('bambu');
  const [formData, setFormData] = useState<Record<string, string>>({ id: '' });

  const addMutation = useMutation({
    mutationFn: async (payload: AddPrinterPayload) => {
      const res = await fetch('/api/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add printer');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printers'] });
      setFormData({ id: '' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove printer');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['printers'] }),
  });

  const handleTypeChange = (newType: PrinterType) => {
    setPrinterType(newType);
    setFormData({ id: formData.id || '' }); // Keep ID, reset other fields
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  const isFormValid = () => {
    if (!formData.id) return false;
    const fields = PRINTER_FIELDS[printerType];
    return fields.every(field => formData[field.name]?.trim());
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    const payload = {
      id: formData.id,
      type: printerType,
      ...formData,
    } as AddPrinterPayload;
    
    addMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Add Printer</h2>
        
        {/* Printer Type Selector */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Printer Type</label>
          <select
            value={printerType}
            onChange={(e) => handleTypeChange(e.target.value as PrinterType)}
            className="border rounded px-3 py-2 w-full md:w-64"
          >
            <option value="bambu">Bambu Lab</option>
            <option value="prusalink">Prusa (PrusaLink)</option>
            <option value="octoprint">OctoPrint</option>
          </select>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Printer ID - always shown */}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Printer ID</label>
              <input
                placeholder="e.g., bambu1, prusa_mk4"
                className="border rounded px-3 py-2 w-full"
                value={formData.id || ''}
                onChange={(e) => handleFieldChange('id', e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic fields based on printer type */}
          <div className="grid gap-2 md:grid-cols-2">
            {PRINTER_FIELDS[printerType].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium mb-1">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  className="border rounded px-3 py-2 w-full"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={addMutation.isPending || !isFormValid()}
            className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? 'Adding...' : 'Add Printer'}
          </button>
        </form>
        
        {addMutation.error && (
          <p className="text-sm text-red-600 mt-2">{(addMutation.error as Error).message}</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Printers</h2>
        {isLoading && <div>Loading printers...</div>}
        {error && <div className="text-red-600">{error.message}</div>}
        <div className="space-y-2">
          {printers?.map((p) => (
            <PrinterRow
              key={p.id}
              id={p.id}
              type={p.type}
              onRemove={(id) => removeMutation.mutate(id)}
            />
          ))}
          {printers?.length === 0 && <div className="text-sm text-gray-500">No printers added yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default PrinterManager;
