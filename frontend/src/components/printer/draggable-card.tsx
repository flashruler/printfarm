import { useDrag, useDrop } from 'react-dnd';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import type { ComponentId } from '@/lib/layout-config';

interface DraggableCardProps {
  id: ComponentId;
  children: React.ReactNode;
  isEditMode: boolean;
  isEnabled: boolean;
  label: string;
  column: 'left' | 'right';
  onToggle?: () => void;
  onMove?: (dragId: ComponentId, hoverId: ComponentId) => void;
}

const ITEM_TYPE = 'COMPONENT_CARD';

interface DragItem {
  id: ComponentId;
  column: 'left' | 'right';
}

// Component for edit mode with drag & drop
function EditableCard({ 
  id, 
  children, 
  isEnabled,
  label,
  onToggle,
  column,
  onMove,
}: Omit<DraggableCardProps, 'isEditMode'> & { 
  column: 'left' | 'right';
  onMove: (dragId: ComponentId, hoverId: ComponentId) => void;
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: { id, column },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: ITEM_TYPE,
    hover: (item: DragItem) => {
      if (item.id !== id) {
        onMove(item.id, id);
      }
    },
  });

  const style = {
    opacity: isDragging ? 0.5 : isEnabled ? 1 : 0.4,
  };

  // Combine refs for drag and drop
  const attachRef = (node: HTMLDivElement | null) => {
    preview(drop(node));
  };

  const attachDragRef = (node: HTMLButtonElement | null) => {
    drag(node);
  };

  return (
    <div ref={attachRef} style={style} className="relative">
      <div className="absolute -top-2 -left-2 z-10 flex gap-1">
        <button
          ref={attachDragRef}
          className="bg-primary text-primary-foreground rounded p-1 shadow-lg cursor-grab active:cursor-grabbing hover:bg-primary/90"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          className="bg-secondary text-secondary-foreground rounded p-1 shadow-lg hover:bg-secondary/80"
          onClick={onToggle}
        >
          {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
      <div className="absolute -top-2 left-12 z-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow-lg">
        {label}
      </div>
      <div className="pointer-events-none">
        {children}
      </div>
    </div>
  );
}

export function DraggableCard({ 
  id, 
  children, 
  isEditMode, 
  isEnabled,
  label,
  column,
  onToggle,
  onMove,
}: DraggableCardProps) {
  // Don't render at all if disabled and not in edit mode
  if (!isEnabled && !isEditMode) {
    return null;
  }

  if (isEditMode && onMove) {
    return (
      <EditableCard 
        id={id} 
        isEnabled={isEnabled} 
        label={label} 
        column={column}
        onToggle={onToggle}
        onMove={onMove}
      >
        {children}
      </EditableCard>
    );
  }

  return (
    <div className="relative">
      {children}
    </div>
  );
}
