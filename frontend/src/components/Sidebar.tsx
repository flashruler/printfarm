import { Home, Printer,Settings, Activity, Package, History, Bell, Library } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

interface SidebarButton {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}

const sidebarButtons: SidebarButton[] = [
  { id: 'dashboard', icon: Home, label: 'Dashboard' },
  { id: 'printers', icon: Printer, label: 'Printers'},
  { id: 'addons', icon: Library, label: 'Addons', disabled: true },
  { id: 'history', icon: History, label: 'History', disabled: true },
  { id: 'materials', icon: Package, label: 'Materials', disabled: true },
  { id: 'activity', icon: Activity, label: 'Activity', disabled: true },
  { id: 'notifications', icon: Bell, label: 'Notifications', disabled: true },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <div className="w-16 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col items-center py-4 gap-2 shrink-0 h-screen sticky top-0">
      {sidebarButtons.map((button) => {
        const Icon = button.icon;
        const isActive = currentView === button.id;
        const isDisabled = button.disabled;

        return (
          <button
            key={button.id}
            onClick={() => !isDisabled && onViewChange(button.id)}
            disabled={isDisabled}
            className={cn(
              "cursor-pointer w-12 h-12 flex items-center justify-center rounded-md transition-all relative group",
              isActive && "bg-[#37373d] border-l-2 border-blue-500",
              !isActive && !isDisabled && "hover:bg-[#2d2d2d]",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
            title={button.label}
          >
            <Icon
              className={cn(
                "w-6 h-6",
                isActive ? "text-white" : "text-gray-400",
                !isDisabled && "group-hover:text-white"
              )}
            />
            
            {/* Tooltip */}
            <div className={cn(
              "absolute left-full ml-2 px-2 py-1 bg-[#2d2d2d] text-white text-xs rounded",
              "opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none",
              "z-50"
            )}>
              {button.label}
              {isDisabled && " (Coming Soon)"}
            </div>
          </button>
        );
      })}

      {/* Spacer to push settings to bottom */}
      <div className="flex-1" />

      {/* Settings button at bottom */}
      <button
        onClick={() => onViewChange('settings')}
        disabled
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded-md transition-all relative group",
          currentView === 'settings' && "bg-[#37373d] border-l-2 border-blue-500",
          currentView !== 'settings' && "hover:bg-[#2d2d2d]",
          "opacity-40 cursor-not-allowed"
        )}
        title="Settings"
      >
        <Settings
          className={cn(
            "w-6 h-6",
            currentView === 'settings' ? "text-white" : "text-gray-400",
            "group-hover:text-white"
          )}
        />
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#2d2d2d] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Settings (Coming Soon)
        </div>
      </button>
    </div>
  );
}
