import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePrinterStatus } from '@/lib/utils';

interface TemperaturePoint {
  timestamp: number;
  nozzle: number;
  bed: number;
}

interface TemperatureGraphProps {
  printerId: string;
}

export function TemperatureGraph({ printerId }: TemperatureGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [temperatureHistory, setTemperatureHistory] = useState<TemperaturePoint[]>([]);
  const { data } = usePrinterStatus(printerId, true);
  
  const MAX_POINTS = 60; // Keep 60 data points (1 minute at 1 second intervals)

  // Update temperature history when status changes
  useEffect(() => {
    if (data) {
      // Get nozzle temp (could be array or single value)
      const nozzleTemp = Array.isArray(data.nozzle_temperatures) 
        ? data.nozzle_temperatures[0] || 0 
        : (data.nozzle_temperatures as number) || 0;
      const bedTemp = data.bed_temperature || 0;

      setTemperatureHistory(prev => {
        const newPoint: TemperaturePoint = {
          timestamp: Date.now(),
          nozzle: nozzleTemp,
          bed: bedTemp,
        };
        
        // Add new point and keep only the last MAX_POINTS
        const updated = [...prev, newPoint].slice(-MAX_POINTS);
        return updated;
      });
    }
  }, [data]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || temperatureHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Get the actual background color from the parent card
    const parentCard = canvas.closest('.bg-card');
    const computedStyle = parentCard 
      ? getComputedStyle(parentCard)
      : getComputedStyle(document.body);
    
    const bgColor = computedStyle.backgroundColor || '#ffffff';
    const isDark = document.documentElement.classList.contains('dark');
    
    // Theme-aware colors
    const gridColor = isDark ? '#3a3a3a' : '#e5e5e5';
    const textColor = isDark ? '#888' : '#666';
    const nozzleColor = '#ef4444'; // Red for nozzle
    const bedColor = '#3b82f6'; // Blue for bed

    // Clear canvas with theme background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Find min/max temps for scaling
    const allTemps = temperatureHistory.flatMap(p => [p.nozzle, p.bed]);
    const minTemp = Math.floor(Math.min(...allTemps) / 10) * 10;
    const maxTemp = Math.ceil(Math.max(...allTemps) / 10) * 10 + 10;
    const tempRange = maxTemp - minTemp;

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (graphHeight * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Temperature labels
      const temp = maxTemp - (tempRange * i) / gridLines;
      ctx.fillStyle = textColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${temp.toFixed(0)}°C`, padding - 10, y + 4);
    }

    // Draw time labels
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('Now', width - padding, height - padding + 20);
    ctx.fillText(`-${MAX_POINTS}s`, padding, height - padding + 20);

    // Function to convert temp to Y coordinate
    const tempToY = (temp: number) => {
      const normalized = (temp - minTemp) / tempRange;
      return padding + graphHeight * (1 - normalized);
    };

    // Function to convert index to X coordinate
    const indexToX = (index: number) => {
      return padding + (graphWidth * index) / (MAX_POINTS - 1);
    };

    // Draw nozzle temperature line
    ctx.strokeStyle = nozzleColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    temperatureHistory.forEach((point, index) => {
      const x = indexToX(index);
      const y = tempToY(point.nozzle);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw bed temperature line
    ctx.strokeStyle = bedColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    temperatureHistory.forEach((point, index) => {
      const x = indexToX(index);
      const y = tempToY(point.bed);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw legend
    const legendX = width - padding - 100;
    const legendY = padding + 10;
    
    // Nozzle legend
    ctx.fillStyle = nozzleColor;
    ctx.fillRect(legendX, legendY, 20, 3);
    ctx.fillStyle = textColor;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nozzle', legendX + 25, legendY + 3);

    // Bed legend
    ctx.fillStyle = bedColor;
    ctx.fillRect(legendX, legendY + 20, 20, 3);
    ctx.fillStyle = textColor;
    ctx.fillText('Bed', legendX + 25, legendY + 23);

  }, [temperatureHistory]);

  return (
    <Card className="p-4 bg-card">
      <h3 className="text-lg font-semibold mb-4">Temperature Over Time</h3>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="w-full"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </Card>
  );
}
