# PrusaLink Adapter Implementation

Complete PrusaLink adapter following the PrintFarm adapter pattern.

## Files Created

1. **`printers/prusalink.py`** - Main adapter implementation
2. **`printers/PRUSALINK_CONFIG.md`** - Configuration guide
3. **`test_prusalink.py`** - Test script

## Quick Start

### 1. Add Configuration

Edit `backend/printers.json`:

```json
{
  "my_prusa": {
    "type": "prusalink",
    "url": "http://192.168.1.150",
    "username": "maker",
    "password": "your_password"
  }
}
```

### 2. Test Connection

```bash
cd backend
# Edit test_prusalink.py with your printer's IP and password
python3 test_prusalink.py
```

### 3. Start Server

```bash
cd backend
python3 -m uvicorn main:app --reload
```

The adapter will automatically load and be available via:
- `GET /api/printers` - List all printers
- `GET /api/printers/my_prusa/status` - Get status
- `GET /api/printers/my_prusa/capabilities` - Check features
- `POST /api/printers/my_prusa/pause` - Pause print
- `POST /api/printers/my_prusa/resume` - Resume print
- `POST /api/printers/my_prusa/cancel` - Cancel print

## Implementation Details

### API Endpoints Used

| PrusaLink API | Purpose |
|---------------|---------|
| `GET /api/version` | Connection validation |
| `GET /api/v1/status` | Temperatures, state, position |
| `GET /api/v1/job` | Job progress, filament info |
| `PUT /api/v1/job/{id}/pause` | Pause print |
| `PUT /api/v1/job/{id}/resume` | Resume print |
| `DELETE /api/v1/job/{id}` | Cancel print |

### Status Normalization

PrusaLink states → Standard phases:

```python
"PRINTING" → "printing"
"PAUSED" → "paused"
"BUSY", "READY" → "preparing"
"IDLE", "FINISHED", "STOPPED" → "idle"
"ERROR", "ATTENTION" → "error"
```

### Authentication

Uses **HTTP Digest Authentication**:
- Default username: `maker`
- Password: Set in printer settings
- Automatically handled by `aiohttp.BasicAuth`

### Capabilities

```python
{
    "status": True,         # ✓ Full telemetry
    "percentage": True,     # ✓ Job progress
    "filament": True,       # ✓ From metadata
    "pause": True,          # ✓ Job control
    "resume": True,         # ✓ Job control
    "cancel": True,         # ✓ Job control
    "error_codes": False,   # ✗ Text states only
    "home": False,          # ✗ No G-code API
    "gcode": False,         # ✗ No public endpoint
    "jog_xy": False,        # ✗ Requires G-code
    "move_z": False,        # ✗ Requires G-code
}
```

## Frontend Integration

No changes needed! The existing UI automatically works:

```typescript
// Status updates via WebSocket
const { data: status } = usePrinterStatus("my_prusa", true);

// Control actions
const { mutate: pause } = usePrinterAction();
pause({ id: "my_prusa", action: "pause" });

// Check capabilities (optional)
const { data: caps } = useQuery({
  queryKey: ["printer-capabilities", "my_prusa"],
  queryFn: async () => {
    const res = await fetch("/api/printers/my_prusa/capabilities");
    return res.json();
  }
});
// Conditionally show controls
{caps?.home && <HomeButton />}  // Won't show for PrusaLink
```

## Limitations

1. **No G-code passthrough**: PrusaLink API doesn't expose raw G-code commands
2. **No homing**: Requires G-code support
3. **No manual jogging**: XYZ movement requires G-code
4. **No numeric error codes**: PrusaLink uses text states ("ERROR", "ATTENTION") instead

## Extending

To add G-code support, you would need to:
1. Upload a temporary `.gcode` file via `PUT /api/v1/files/local/temp.gcode`
2. Start execution via `POST /api/v1/files/local/temp.gcode`
3. Monitor and delete after completion

Or use a serial connection library directly.

## Testing Checklist

- [x] Syntax validation passes
- [x] Registry integration complete
- [x] Test script created
- [ ] Live printer tested (requires hardware)
- [ ] Pause/resume verified
- [ ] Cancel verified
- [ ] Frontend compatibility verified

## Dependencies

Requires:
```bash
pip install aiohttp
```

Already included if you have FastAPI installed.

## Resources

- **PrusaLink API**: https://github.com/prusa3d/Prusa-Link-Web/blob/master/spec/openapi.yaml
- **Prusa Help**: https://help.prusa3d.com/article/prusalink-and-prusa-connect_302608
- **Digest Auth**: https://docs.aiohttp.org/en/stable/client_quickstart.html#basic-authentication
