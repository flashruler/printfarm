#printer registry

import json
from pathlib import Path
from bambu_client import BambuPrinter
from typing import Any, Dict
from importlib import import_module

CONFIG_PATH = Path(__file__).parent / "printers.json"

class PrinterRegistry:
    def __init__(self):
        self.printers = {}
        self.load()

    def load(self):
        """Load printer definitions from file."""
        if CONFIG_PATH.exists():
            data = json.loads(CONFIG_PATH.read_text())
            for pid, cfg in data.items():
                self.add_from_config(pid, cfg)

    def save(self):
        """Write current printer config to disk (type-aware)."""
        serializable: Dict[str, Dict[str, Any]] = {}
        for pid, p in self.printers.items():
            ptype = getattr(p, "type", None)
            if ptype == "bambu" and isinstance(p, BambuPrinter):
                serializable[pid] = {
                    "type": "bambu",
                    "ip": p.ip,
                    "access_code": p.access_code,
                    "serial": p.serial,
                }
            elif ptype == "octoprint":
                # Best-effort generic fields
                serializable[pid] = {
                    "type": "octoprint",
                    "url": getattr(p, "url", ""),
                    "api_key": getattr(p, "api_key", ""),
                }
            elif ptype == "prusalink":
                serializable[pid] = {
                    "type": "prusalink",
                    "url": getattr(p, "url", ""),
                    "username": getattr(p, "username", "maker"),
                    "password": getattr(p, "password", ""),
                }
        CONFIG_PATH.write_text(json.dumps(serializable, indent=2))

    def add_from_config(self, printer_id: str, cfg: dict):
        ptype = cfg.get("type")
        if ptype == "bambu":
            self.printers[printer_id] = BambuPrinter(
                cfg["ip"], cfg["access_code"], cfg["serial"]
            )
        elif ptype == "octoprint":
            try:
                mod = import_module("backend.printers.octoprint")
            except ModuleNotFoundError:
                mod = import_module("printers.octoprint") if (Path(__file__).parent / "printers").exists() else None
            if mod and hasattr(mod, "OctoPrintPrinter"):
                self.printers[printer_id] = mod.OctoPrintPrinter(
                    cfg.get("url", ""), cfg.get("api_key", "")
                )
            else:
                raise ValueError("OctoPrint adapter not available")
        elif ptype == "prusalink":
            try:
                mod = import_module("backend.printers.prusalink")
            except ModuleNotFoundError:
                mod = import_module("printers.prusalink") if (Path(__file__).parent / "printers").exists() else None
            if mod and hasattr(mod, "PrusaLinkAdapter"):
                self.printers[printer_id] = mod.PrusaLinkAdapter(
                    url=cfg.get("url", ""),
                    username=cfg.get("username", "maker"),
                    password=cfg.get("password", ""),
                    **cfg
                )
            else:
                raise ValueError("PrusaLink adapter not available")
            
    def add_printer(self, printer_id: str, cfg: dict):
        """Add printer dynamically (used by the API)."""
        self.add_from_config(printer_id, cfg)
        self.save()
        return {"id": printer_id, "type": cfg["type"]}

    def remove_printer(self, printer_id: str):
        if printer_id in self.printers:
            self.printers.pop(printer_id)
            self.save()
            return True
        return False
    
    def get_printer_count(self):
        """Get the total number of printers in the registry."""
        return len(self.printers)