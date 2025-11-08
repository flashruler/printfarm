import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrinters, usePrinterStatus } from '@/lib/utils';

interface AddPrinterPayload {
  id: string;
  type: 'bambu';
  ip: string;
  access_code: string;
  serial: string;
}

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
  const [form, setForm] = useState<AddPrinterPayload>({
    id: '',
    type: 'bambu',
    ip: '',
    access_code: '',
    serial: '',
  });

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
      setForm({ id: '', type: 'bambu', ip: '', access_code: '', serial: '' });
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.ip || !form.access_code || !form.serial) return;
    addMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Add Printer</h2>
        <form onSubmit={onSubmit} className="grid gap-2 md:grid-cols-5">
          <input
            placeholder="ID"
            className="border rounded px-2 py-1"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
          <input
            placeholder="IP"
            className="border rounded px-2 py-1"
            value={form.ip}
            onChange={(e) => setForm({ ...form, ip: e.target.value })}
          />
            <input
            placeholder="Access Code"
            className="border rounded px-2 py-1"
            value={form.access_code}
            onChange={(e) => setForm({ ...form, access_code: e.target.value })}
          />
          <input
            placeholder="Serial"
            className="border rounded px-2 py-1"
            value={form.serial}
            onChange={(e) => setForm({ ...form, serial: e.target.value })}
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50"
          >
            {addMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </form>
        {addMutation.error && (
          <p className="text-sm text-red-600">{(addMutation.error as Error).message}</p>
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
