"""Plugin loader and registry.

Auto-discovers and loads plugins from the user_plugins directory.
"""

from __future__ import annotations

import os
import json
import importlib.util
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any

from plugins.base import BasePlugin

if TYPE_CHECKING:
    from core.event_bus import EventBus
    from registry import PrinterRegistry
    from fastapi import FastAPI

logger = logging.getLogger(__name__)


class PluginRegistry:
    """Registry for managing plugins.
    
    Discovers plugins in user_plugins/ directory, loads them, and manages lifecycle.
    """
    
    def __init__(self):
        self.plugins: dict[str, BasePlugin] = {}
        self.plugin_dir = Path(__file__).parent / "user_plugins"
        self.settings: dict[str, dict[str, Any]] = {}  # Plugin name -> settings
    
    def discover_plugins(self) -> list[dict[str, Any]]:
        """Discover all plugins in user_plugins directory.
        
        Returns:
            List of plugin manifests
        """
        if not self.plugin_dir.exists():
            logger.info(f"Plugin directory does not exist: {self.plugin_dir}")
            return []
        
        manifests = []
        for plugin_path in self.plugin_dir.iterdir():
            if not plugin_path.is_dir():
                continue
            
            manifest_path = plugin_path / "plugin.json"
            if not manifest_path.exists():
                logger.warning(f"No plugin.json found in {plugin_path}")
                continue
            
            try:
                with open(manifest_path, "r") as f:
                    manifest = json.load(f)
                    manifest["_path"] = str(plugin_path)
                    manifests.append(manifest)
            except Exception as e:
                logger.error(f"Failed to load manifest from {manifest_path}: {e}")
        
        return manifests
    
    async def load_plugins(
        self, 
        app: FastAPI, 
        registry: PrinterRegistry, 
        event_bus: EventBus
    ) -> None:
        """Load all discovered plugins.
        
        Args:
            app: FastAPI application
            registry: Printer registry
            event_bus: Event bus
        """
        manifests = self.discover_plugins()
        
        for manifest in manifests:
            plugin_name = manifest.get("name")
            if not plugin_name:
                logger.error(f"Plugin manifest missing 'name' field: {manifest}")
                continue
            
            try:
                await self.load_plugin(plugin_name, manifest, app, registry, event_bus)
            except Exception as e:
                logger.error(f"Failed to load plugin '{plugin_name}': {e}", exc_info=True)
    
    async def load_plugin(
        self,
        plugin_name: str,
        manifest: dict[str, Any],
        app: FastAPI,
        registry: PrinterRegistry,
        event_bus: EventBus
    ) -> None:
        """Load a single plugin.
        
        Args:
            plugin_name: Plugin name
            manifest: Plugin manifest dict
            app: FastAPI app
            registry: Printer registry
            event_bus: Event bus
        """
        if plugin_name in self.plugins:
            logger.warning(f"Plugin '{plugin_name}' already loaded")
            return
        
        plugin_path = Path(manifest["_path"])
        backend_config = manifest.get("backend", {})
        entry_file = backend_config.get("entry", "main.py")
        class_name = backend_config.get("class", "Plugin")
        
        # Import plugin module
        module_path = plugin_path / entry_file
        if not module_path.exists():
            logger.error(f"Plugin entry file not found: {module_path}")
            return
        
        spec = importlib.util.spec_from_file_location(
            f"plugins.user_plugins.{plugin_name}",
            module_path
        )
        if not spec or not spec.loader:
            logger.error(f"Failed to load module spec for {plugin_name}")
            return
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Get plugin class
        if not hasattr(module, class_name):
            logger.error(f"Plugin class '{class_name}' not found in {entry_file}")
            return
        
        plugin_class = getattr(module, class_name)
        
        # Instantiate and load plugin
        plugin_instance = plugin_class()
        await plugin_instance.on_load(app, registry, event_bus)
        plugin_instance._mark_loaded()
        
        self.plugins[plugin_name] = plugin_instance
        logger.info(f"✅ Loaded plugin: {plugin_name} v{manifest.get('version', 'unknown')}")
    
    async def unload_plugin(self, plugin_name: str) -> None:
        """Unload a plugin.
        
        Args:
            plugin_name: Name of plugin to unload
        """
        if plugin_name not in self.plugins:
            logger.warning(f"Plugin '{plugin_name}' not loaded")
            return
        
        plugin = self.plugins[plugin_name]
        await plugin.on_unload()
        plugin._mark_unloaded()
        
        del self.plugins[plugin_name]
        logger.info(f"Unloaded plugin: {plugin_name}")
    
    def get_plugin(self, plugin_name: str) -> BasePlugin | None:
        """Get a loaded plugin by name.
        
        Args:
            plugin_name: Plugin name
            
        Returns:
            Plugin instance or None
        """
        return self.plugins.get(plugin_name)
    
    def list_plugins(self) -> list[dict[str, Any]]:
        """List all loaded plugins.
        
        Returns:
            List of plugin info dicts
        """
        return [
            {
                "name": plugin.name,
                "version": plugin.version,
                "author": plugin.author,
                "description": plugin.description,
                "loaded": plugin.is_loaded,
            }
            for plugin in self.plugins.values()
        ]
    
    def get_settings(self, plugin_name: str) -> dict[str, Any]:
        """Get settings for a plugin.
        
        Args:
            plugin_name: Plugin name
            
        Returns:
            Settings dict
        """
        return self.settings.get(plugin_name, {})
    
    async def update_settings(self, plugin_name: str, settings: dict[str, Any]) -> None:
        """Update settings for a plugin.
        
        Args:
            plugin_name: Plugin name
            settings: New settings
        """
        self.settings[plugin_name] = settings
        
        # Notify plugin of settings change
        plugin = self.get_plugin(plugin_name)
        if plugin:
            await plugin.on_settings_changed(settings)


# Global plugin registry instance
plugin_registry = PluginRegistry()
