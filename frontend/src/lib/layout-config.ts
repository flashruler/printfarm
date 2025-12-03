// Layout configuration types and localStorage management

export type ComponentId = 
  | 'vitals'
  | 'temperature-graph'
  | 'gcode-uploader'
  | 'print-progress'
  | 'print-controls'
  | 'movement-controls';

export interface ComponentConfig {
  id: ComponentId;
  label: string;
  enabled: boolean;
  order: number;
  column: 'left' | 'right';
}

export interface LayoutConfig {
  components: ComponentConfig[];
}

const DEFAULT_LAYOUT: LayoutConfig = {
  components: [
    { id: 'vitals', label: 'Printer Vitals', enabled: true, order: 0, column: 'left' },
    { id: 'temperature-graph', label: 'Temperature Graph', enabled: true, order: 1, column: 'left' },
    { id: 'gcode-uploader', label: 'G-Code Uploader', enabled: true, order: 2, column: 'left' },
    { id: 'print-progress', label: 'Print Progress', enabled: true, order: 0, column: 'right' },
    { id: 'print-controls', label: 'Print Controls', enabled: true, order: 1, column: 'right' },
    { id: 'movement-controls', label: 'Movement Controls', enabled: true, order: 2, column: 'right' },
  ],
};

const STORAGE_KEY = 'printfarm-layout-config';

export function loadLayoutConfig(): LayoutConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LayoutConfig;
      // Merge with defaults in case new components were added
      return mergeWithDefaults(parsed);
    }
  } catch (error) {
    console.error('Failed to load layout config:', error);
  }
  return DEFAULT_LAYOUT;
}

export function saveLayoutConfig(config: LayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save layout config:', error);
  }
}

export function resetLayoutConfig(): LayoutConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset layout config:', error);
  }
  return DEFAULT_LAYOUT;
}

function mergeWithDefaults(config: LayoutConfig): LayoutConfig {
  const configMap = new Map(config.components.map(c => [c.id, c]));
  
  // Start with all default components
  const merged: ComponentConfig[] = DEFAULT_LAYOUT.components.map(defaultComp => {
    const userComp = configMap.get(defaultComp.id);
    // If user has this component configured, use their settings
    if (userComp) {
      return userComp;
    }
    // Otherwise use default
    return defaultComp;
  });
  
  return { components: merged };
}
