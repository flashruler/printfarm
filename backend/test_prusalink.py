#!/usr/bin/env python3
"""Test script for PrusaLink adapter."""

import asyncio
import sys
from printers.prusalink import PrusaLinkAdapter


async def test_prusalink():
    """Test PrusaLink adapter with a real printer."""
    
    # Configuration - update these values for your printer
    PRINTER_URL = "http://192.168.1.150"  # Change to your printer's IP
    USERNAME = "maker"
    PASSWORD = "your_password_here"       # Change to your password
    
    print("=== PrusaLink Adapter Test ===\n")
    print(f"Connecting to: {PRINTER_URL}")
    print(f"Username: {USERNAME}\n")
    
    adapter = PrusaLinkAdapter(
        url=PRINTER_URL,
        username=USERNAME,
        password=PASSWORD
    )
    
    try:
        # Test 1: Connection
        print("1. Testing connection...")
        await adapter.connect()
        print("✓ Connected successfully\n")
        
        # Test 2: Capabilities
        print("2. Checking capabilities...")
        caps = adapter.capabilities
        print(f"✓ Capabilities: {caps}\n")
        
        # Test 3: Status
        print("3. Getting printer status...")
        status = await adapter.get_status()
        if "error" in status:
            print(f"✗ Error: {status['error']}\n")
        else:
            print(f"✓ State: {status.get('print_status')} ({status.get('print_phase')})")
            print(f"  Bed: {status.get('bed_temperature')}°C → {status.get('target_bed_temperature')}°C")
            print(f"  Nozzle: {status.get('nozzle_temperatures')}°C → {status.get('target_nozzle_temperature')}°C")
            if status.get('axis_z') is not None:
                print(f"  Position: X={status.get('axis_x')} Y={status.get('axis_y')} Z={status.get('axis_z')}")
            print()
        
        # Test 4: Raw status
        print("4. Getting raw status...")
        raw = await adapter.get_print_status_raw()
        print(f"✓ Raw status: {raw.get('print_status')}\n")
        
        # Test 5: Job progress
        print("5. Getting job progress...")
        progress = await adapter.get_percentage()
        if progress.get("print_percentage") is not None:
            print(f"✓ Progress: {progress['print_percentage']}%\n")
        else:
            print("✓ No active job\n")
        
        # Test 6: Filament info
        print("6. Getting filament info...")
        filament = await adapter.get_filament_info()
        if filament.get("tray_type"):
            print(f"✓ Material: {filament['tray_type']}\n")
        else:
            print("✓ No filament info available\n")
        
        # Test 7: Control commands (only if printing)
        if status.get("print_status") in ("PRINTING", "PAUSED"):
            print("7. Testing control commands...")
            user_input = input("Printer is active. Test pause/resume? (y/N): ")
            if user_input.lower() == 'y':
                if status.get("print_status") == "PRINTING":
                    print("  Pausing...")
                    result = await adapter.pause()
                    print(f"  {result}")
                    await asyncio.sleep(2)
                    print("  Resuming...")
                    result = await adapter.resume()
                    print(f"  {result}")
                elif status.get("print_status") == "PAUSED":
                    print("  Resuming...")
                    result = await adapter.resume()
                    print(f"  {result}")
            print()
        else:
            print("7. Control commands skipped (no active job)\n")
        
        print("=== All Tests Complete ===")
        
    except ConnectionError as e:
        print(f"✗ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Verify printer IP address is correct")
        print("2. Check printer is powered on and connected to network")
        print("3. Verify PrusaLink is enabled in printer settings")
        print("4. Confirm username/password are correct")
        sys.exit(1)
    except PermissionError as e:
        print(f"✗ Authentication failed: {e}")
        print("\nCheck your username and password.")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Clean up
        await adapter.close()


if __name__ == "__main__":
    asyncio.run(test_prusalink())
