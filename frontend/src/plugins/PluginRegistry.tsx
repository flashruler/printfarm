/**
 * Plugin system for frontend.
 * 
 * Allows plugins to register components that get dynamically loaded into the UI.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PluginManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  frontend?: {
    entry: string;
    slots?: string[];
    permissions?: string[];
  };
  sidebar?: {
    id: string;
    label: string;
    icon: string; // Icon name from lucide-react
  };
}

export interface PluginComponent {
  manifest: PluginManifest;
  Component: React.ComponentType<any>;
  slots: Record<string, React.ComponentType<any>>;
}

interface PluginContextType {
  plugins: PluginComponent[];
  loading: boolean;
  error: string | null;
  reloadPlugins: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType>({
  plugins: [],
  loading: false,
  error: null,
  reloadPlugins: async () => {},
});

export const usePlugins = () => useContext(PluginContext);

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const [plugins, setPlugins] = useState<PluginComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlugins = async () => {
    setLoading(true);
    setError(null);

    try {
      // Discover plugins by importing from user_plugins directory
      // This uses Vite's glob import feature
      const pluginModules = import.meta.glob('/src/plugins/user_plugins/*/index.tsx');
      const manifestModules = import.meta.glob('/src/plugins/user_plugins/*/plugin.json');

      const loadedPlugins: PluginComponent[] = [];

      for (const path in pluginModules) {
        const pluginName = path.split('/')[4]; // Extract plugin name from path
        const manifestPath = `/src/plugins/user_plugins/${pluginName}/plugin.json`;

        if (!manifestModules[manifestPath]) {
          console.warn(`No manifest found for plugin: ${pluginName}`);
          continue;
        }

        try {
          // Load manifest and component
          const manifestModule = await manifestModules[manifestPath]() as { default: PluginManifest };
          const pluginModule = await pluginModules[path]() as any;

          const manifest = manifestModule.default;
          const Component = pluginModule.default;
          const slots = pluginModule.slots || {};

          loadedPlugins.push({
            manifest,
            Component,
            slots,
          });

          console.log(`✅ Loaded plugin: ${manifest.name}`);
        } catch (err) {
          console.error(`Failed to load plugin ${pluginName}:`, err);
        }
      }

      setPlugins(loadedPlugins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins');
      console.error('Plugin loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  return (
    <PluginContext.Provider value={{ plugins, loading, error, reloadPlugins: loadPlugins }}>
      {children}
    </PluginContext.Provider>
  );
}

/**
 * Slot component - renders plugin components registered for a specific slot.
 */
interface SlotProps {
  name: string;
  [key: string]: any; // Props to pass to plugin components
}

export function Slot({ name, ...props }: SlotProps) {
  const { plugins } = usePlugins();

  return (
    <>
      {plugins.map((plugin) => {
        const SlotComponent = plugin.slots[name];
        if (!SlotComponent) return null;

        return (
          <React.Fragment key={plugin.manifest.name}>
            <SlotComponent {...props} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Hook to get plugin-specific data.
 */
export function usePlugin(pluginName: string) {
  const { plugins } = usePlugins();
  return plugins.find((p) => p.manifest.name === pluginName);
}
