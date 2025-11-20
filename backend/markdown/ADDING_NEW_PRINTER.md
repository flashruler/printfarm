# Adding a New Printer Family

This guide walks through adding support for a new printer type (e.g., Prusa, Klipper, Moonraker, Creality Cloud) to PrintFarm.

## Architecture Overview

PrintFarm uses an **adapter pattern** where each printer family implements a common interface defined in `backend/printers/base.py`. The registry dynamically loads adapters based on the `type` field in the printer configuration.

```
backend/
├── printers/
│   ├── base.py           # PrinterAdapter protocol (interface)
│   ├── bambu_adapter.py  # Reference implementation (Bambu)
│   └── your_printer.py   # Your new adapter
├── registry.py           # Type-aware printer factory
└── main.py              # REST/WS API (adapter-agnostic)
```

## Step-by-Step Guide

### 1. Create Your Adapter File

Create a new file `backend/printers/your_printer.py`:

```python
from __future__ import annotations
from typing import Mapping, Any

class YourPrinterAdapter:
    type = "your_printer"  # Unique identifier for this printer family

    def __init__(self, url: str, api_key: str, **kwargs):
        """Initialize with credentials/connection info.
        
        Args:
            url: Printer API endpoint (e.g., "http://printer.local")
            api_key: Authentication token
            **kwargs: Additional config (serial, port, etc.)
        """
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.connected = False
        # Store any additional config for persistence
        self._config = kwargs

    async def connect(self) -> None:
        """Establish connection to the printer.
        
        For HTTP-based printers (OctoPrint, Moonraker), this might just
        validate credentials. For socket-based (Bambu MQTT), open connection.
        """
        # Example: Validate API key works
        # response = await self._api_request("GET", "/api/version")
        self.connected = True

    # --- Status Endpoints ---
    async def get_status(self) -> Mapping[str, Any]:
        """Return printer status with temperatures and state.
        
        Returns:
            {
                "bed_temperature": float | None,
                "nozzle_temperatures": float | list[float] | None,
                "print_status": str | None,        # Raw status from printer
                "print_phase": str,                # Normalized: idle, printing, paused, error, etc.
                "print_error_code": int | None,
                "has_error": bool,
            }
        """
        # Example implementation:
        # data = await self._api_request("GET", "/api/printer")
        # return {
        #     "bed_temperature": data.get("bed", {}).get("actual"),
        #     "nozzle_temperatures": data.get("tool0", {}).get("actual"),
        #     "print_status": data.get("state", {}).get("text"),
        #     "print_phase": self._normalize_status(data.get("state", {}).get("text")),
        #     "has_error": data.get("state", {}).get("flags", {}).get("error", False),
        # }
        return {"error": "not implemented"}

    async def get_print_status_raw(self) -> Mapping[str, Any]:
        """Return raw status string from printer API.
        
        Returns:
            {"print_status": str}
        """
        return {"error": "not implemented"}

    async def get_percentage(self) -> Mapping[str, Any]:
        """Return print progress percentage.
        
        Returns:
            {"print_percentage": int}  # 0-100
        """
        return {"error": "not implemented"}

    async def get_filament_info(self) -> Mapping[str, Any]:
        """Return loaded filament/material information.
        
        Returns:
            {
                "tray_type": str | None,  # Material name (PLA, PETG, etc.)
                "raw": dict,              # Full raw response for debugging
            }
        """
        return {"error": "not implemented"}

    # --- Control Endpoints ---
    async def home(self) -> Mapping[str, Any]:
        """Home all axes.
        
        Returns:
            {"status": "success", "action": "home"} or {"error": str}
        """
        # Example: await self._send_gcode("G28")
        return {"error": "not implemented"}

    async def pause(self) -> Mapping[str, Any]:
        """Pause current print."""
        return {"error": "not implemented"}

    async def resume(self) -> Mapping[str, Any]:
        """Resume paused print."""
        return {"error": "not implemented"}

    async def cancel(self) -> Mapping[str, Any]:
        """Cancel/stop current print."""
        return {"error": "not implemented"}

    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True) -> Mapping[str, Any]:
        """Send raw G-code commands to printer.
        
        Args:
            gcode: Single command string or list of commands
            gcode_check: Whether to validate G-code syntax (optional)
        
        Returns:
            {"ok": bool} or {"error": str}
        """
        return {"error": "not implemented"}

    # --- Capabilities Declaration ---
    @property
    def capabilities(self) -> Mapping[str, bool]:
        """Advertise which features this printer supports.
        
        The frontend can query /api/printers/{id}/capabilities to
        conditionally show/hide UI controls.
        """
        return {
            "status": True,          # get_status() implemented
            "percentage": True,      # get_percentage() implemented
            "filament": False,       # get_filament_info() not supported
            "error_codes": False,
            "home": True,
            "pause": True,
            "resume": True,
            "cancel": True,
            "gcode": True,           # send_gcode() implemented
            "jog_xy": True,          # Can jog X/Y via G-code
            "move_z": True,          # Can move Z via G-code
        }

    # --- Helper Methods (Optional) ---
    async def _api_request(self, method: str, path: str, **kwargs) -> Any:
        """Make authenticated HTTP request to printer API."""
        import aiohttp
        headers = {"X-Api-Key": self.api_key}
        async with aiohttp.ClientSession() as session:
            async with session.request(method, f"{self.url}{path}", headers=headers, **kwargs) as resp:
                resp.raise_for_status()
                return await resp.json()

    def _normalize_status(self, raw_status: str | None) -> str:
        """Normalize printer-specific status to standard phases."""
        if not raw_status:
            return "unknown"
        lower = raw_status.lower()
        if "print" in lower:
            return "printing"
        if "pause" in lower:
            return "paused"
        if "error" in lower or "offline" in lower:
            return "error"
        if "idle" in lower or "operational" in lower:
            return "idle"
        return "unknown"
```

### 2. Register in the Printer Registry

Edit `backend/registry.py` to add your adapter:

```python
def add_from_config(self, printer_id: str, cfg: dict):
    ptype = cfg.get("type")
    if ptype == "bambu":
        self.printers[printer_id] = BambuPrinter(
            cfg["ip"], cfg["access_code"], cfg["serial"]
        )
    elif ptype == "octoprint":
        # ... existing octoprint code ...
    elif ptype == "your_printer":  # Add this block
        try:
            mod = import_module("printers.your_printer")
        except ModuleNotFoundError:
            raise ValueError("YourPrinter adapter not available")
        self.printers[printer_id] = mod.YourPrinterAdapter(
            url=cfg.get("url", ""),
            api_key=cfg.get("api_key", ""),
            **cfg  # Pass all config for flexibility
        )
```

Update the `save()` method to persist your adapter config:

```python
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
        elif ptype == "your_printer":  # Add this block
            serializable[pid] = {
                "type": "your_printer",
                "url": p.url,
                "api_key": p.api_key,
            }
    CONFIG_PATH.write_text(json.dumps(serializable, indent=2))
```

### 3. Add Configuration

Add your printer to `backend/printers.json`:

```json
{
  "bambu1": {
    "type": "bambu",
    "ip": "192.168.1.100",
    "access_code": "12345678",
    "serial": "ABC123"
  },
  "your_printer1": {
    "type": "your_printer",
    "url": "http://printer.local",
    "api_key": "YOUR_API_KEY_HERE"
  }
}
```

### 4. Test Your Adapter

Create a test script `backend/test_adapter.py`:

```python
import asyncio
from printers.your_printer import YourPrinterAdapter

async def test():
    printer = YourPrinterAdapter(
        url="http://printer.local",
        api_key="test_key"
    )
    
    await printer.connect()
    print("✓ Connected")
    
    status = await printer.get_status()
    print(f"Status: {status}")
    
    percentage = await printer.get_percentage()
    print(f"Progress: {percentage}")
    
    caps = printer.capabilities
    print(f"Capabilities: {caps}")

if __name__ == "__main__":
    asyncio.run(test())
```

Run it:
```bash
cd backend
python3 test_adapter.py
```

## Normalization Guidelines

### Status Phases
Normalize printer-specific states to these standard phases:

- `"idle"` - Printer ready, no active job
- `"printing"` - Actively printing
- `"paused"` - Print paused by user or error
- `"preparing"` - Heating, homing, bed leveling, etc.
- `"cooling"` - Post-print cooldown
- `"error"` - Error state requiring attention
- `"calibrating"` - Running calibration routine
- `"filament_change"` - Waiting for filament change
- `"unknown"` - State cannot be determined

### Temperature Units
Always return temperatures in **Celsius** as floats.

### Percentage
Return print progress as an **integer 0-100**, or `None` if not available.

### Error Handling
- Return `{"error": "descriptive message"}` for failures
- Set `"has_error": True` in status when printer reports errors
- Include `"print_error_code"` if the printer provides numeric error codes

## Frontend Integration

Once your adapter is implemented:

1. **No frontend changes required** - existing UI will work automatically
2. **Optional**: Query capabilities to show/hide controls:
   ```typescript
   const { data: caps } = useQuery({
     queryKey: ["printer-capabilities", printerId],
     queryFn: async () => {
       const res = await fetch(`/api/printers/${printerId}/capabilities`)
       return res.json()
     }
   })
   
   // Conditionally render controls
   {caps?.home && <Button onClick={home}>Home</Button>}
   ```

## WebSocket Broadcasting

The status broadcaster in `main.py` automatically works with your adapter. It will:
- Call `get_status()` every 1 second
- Call `get_percentage()` and broadcast changes
- Call `get_filament_info()` every 10 seconds and broadcast material changes

No modifications needed unless you want custom polling intervals.

## Example Adapters for Reference

### OctoPrint
See `backend/printers/octoprint.py` (stub, ready for implementation)

### Bambu Labs
See `backend/bambu_client.py` for a complete working example with:
- High-level library wrapper (`bambulabs_api`) that abstracts MQTT internally
- Status normalization (`print_phase` mapping)
- Error code handling
- G-code passthrough via `send_gcode()`

## Common Patterns

### HTTP-Based API (OctoPrint, Moonraker, Duet)
```python
async def get_status(self):
    data = await self._api_request("GET", "/api/printer")
    return {
        "bed_temperature": data["temperature"]["bed"]["actual"],
        "nozzle_temperatures": data["temperature"]["tool0"]["actual"],
        "print_status": data["state"]["text"],
        "print_phase": self._normalize_status(data["state"]["text"]),
    }
```

### Library Wrapper (Bambu uses `bambulabs_api`, similar to `octorest` for OctoPrint)
```python
from some_printer_library import PrinterClient

def __init__(self, host: str, api_key: str, **kwargs):
    self.client = PrinterClient(host, api_key)
    self.connected = False

async def connect(self):
    if not self.connected:
        self.client.connect()  # Library handles underlying protocol (MQTT, WebSocket, etc.)
        self.connected = True

async def get_status(self):
    # Synchronous library call wrapped in async
    return {
        "bed_temperature": self.client.get_bed_temperature(),
        "nozzle_temperatures": self.client.get_nozzle_temperature(),
        "print_status": self.client.get_current_state().name,
        ...
    }
```

### Raw Socket-Based (Klipper Moonraker WS, custom MQTT)
```python
def __init__(self, host: str, **kwargs):
    self.client = YourSocketClient(host)
    self._state_cache = {}

async def connect(self):
    await self.client.connect()
    # Subscribe to state updates
    self.client.on_message(self._handle_update)

def _handle_update(self, data):
    self._state_cache.update(data)

async def get_status(self):
    return {
        "bed_temperature": self._state_cache.get("bed_temp"),
        ...
    }
```

## Troubleshooting

### "Printer does not support [action]"
Check that your adapter implements the method and `capabilities` includes it.

### WebSocket not updating
Verify your adapter's methods don't block. Use `async`/`await` properly.

### Type errors in registry
Ensure your adapter class has a `type` class attribute set to a unique string.

### Config not persisting
Add your adapter's serialization logic to `registry.py`'s `save()` method.

## Next Steps

1. Implement basic status retrieval first
2. Add control methods (pause, resume, cancel)
3. Test with real printer
4. Add G-code passthrough for advanced controls
5. Implement file upload if your printer supports it
6. Submit a PR to share your adapter with the community!

## Resources

- **Base Protocol**: `backend/printers/base.py`
- **Reference Implementation**: `backend/bambu_client.py`
- **Registry Factory**: `backend/registry.py`
- **API Documentation**: Check your printer's API docs
  - OctoPrint: https://docs.octoprint.org/en/master/api/
  - Moonraker: https://moonraker.readthedocs.io/
  - Duet: https://duet3d.dozuki.com/Wiki/HTTP_requests
  - Prusa Connect: https://connect.prusa3d.com/docs/
