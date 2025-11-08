from bambulabs_api import Printer

# Bambulab printer class and associated methods
class BambuPrinter:
    def __init__(self,ip:str,access_code:str, serial:str):
        # Persist credentials and identifiers for saving/serialization
        self.ip = ip
        self.access_code = access_code
        self.serial = serial
        self.client = Printer(ip, access_code, serial)
        self.connected = False

    async def connect(self):
        if not self.connected:
            self.client.connect()
            self.connected = True
    
    async def get_status(self):
        try:
            await self.connect()
            status = {}
            status['bed_temperature'] = self.client.get_bed_temperature()
            status['nozzle_temperatures'] = self.client.get_nozzle_temperature()
            status['print_status'] = self.client.get_state()
            #status['current_state'] = self.client.get_current_state()
            return status
        except Exception as e:
            return {"error": str(e)}
        
    async def get_filament_info(self):
        try:
            await self.connect()
            filament_info = self.client.vt_tray()
            return filament_info
        except Exception as e:
            return {"error": str(e)}