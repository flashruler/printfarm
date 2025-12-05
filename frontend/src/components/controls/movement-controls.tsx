import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, House } from "lucide-react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

interface MovementControlsProps {
  isDisabled: boolean;
  onMove: (axis: 'X' | 'Y' | 'Z', direction: 1 | -1) => void;
  onHome: () => void;
  jogDistance?: number;
}

export function MovementControls({ 
  isDisabled, 
  onMove, 
  onHome,
  jogDistance = 10 
}: MovementControlsProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        {/* XY Axis Control */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">XY Axis</h3>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            <div />
          <Button
            onClick={() => onMove('Y', 1)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="aspect-square"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <div />
          
          <Button
            onClick={() => onMove('X', -1)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="aspect-square"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onHome}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="aspect-square"
          >
            <House className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={() => onMove('X', 1)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="aspect-square"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <div />
          <Button
            onClick={() => onMove('Y', -1)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="aspect-square"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <div />
        </div>
        <div className="text-center text-xs text-muted-foreground">
          {jogDistance}mm per move
        </div>
      </div>

      {/* Z Axis Control */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Z Axis</h3>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => onMove('Z', 1)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="flex-1 max-w-32"
          >
            <ArrowUp className="w-4 h-4 mr-1" />
            Z Up
          </Button>
          <Button
            onClick={() => onMove('Z', -1)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className="flex-1 max-w-32"
          >
            <ArrowDown className="w-4 h-4 mr-1" />
            Z Down
          </Button>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          {jogDistance}mm per move
        </div>
      </div>
      </Card>
    </div>
  );
}
