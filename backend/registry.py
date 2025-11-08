#printer registry

import json
from pathlib import Path
from bambu_client import BambuPrinter

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
        """Write current printer config to disk."""
        serializable = {}
        for pid, p in self.printers.items():
            if isinstance(p, BambuPrinter):
                serializable[pid] = {
                    "type": "bambu",
                    "ip": p.ip,
                    "access_code": p.access_code,
                    "serial": p.serial,
                }
        CONFIG_PATH.write_text(json.dumps(serializable, indent=2))

    def add_from_config(self, printer_id: str, cfg: dict):
        if cfg["type"] == "bambu":
            self.printers[printer_id] = BambuPrinter(
                cfg["ip"], cfg["access_code"], cfg["serial"]
            )
            
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