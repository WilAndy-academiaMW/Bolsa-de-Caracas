import time
import sys
import os

# Agregamos la carpeta actual al path para que reconozca el paquete 'services'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from services.apy import ejecutar as run_apy
    from services.book import ejecutar as run_book
    from services.vela import ejecutar as run_vela
    from services.market import ejecutar as run_market
except ImportError as e:
    print(f"❌ Error al importar servicios: {e}")
    print("Asegúrate de que tus archivos en 'services/' tengan la función 'def ejecutar():'")
    sys.exit(1)

def iniciar_actualizacion(intervalo=30):
    print("🔄 Monitor de Datos Activo (BVC/Crypto)")
    print(f"⏱️ Actualización cada {intervalo} segundos. Presiona Ctrl+C para detener.\n")
    
    contador = 1
    while True:
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] 📦 Ciclo de actualización #{contador} iniciado...")
        
        try:
            # Ejecutamos todos tus scripts
            run_apy()
            run_book()
            run_vela()
            run_market()
            
            print(f"[{timestamp}] ✅ Datos actualizados correctamente.")
        except Exception as e:
            print(f"[{timestamp}] ⚠️ Error en el ciclo: {e}")
        
        print(f"😴 Esperando {intervalo} segundos para el siguiente ciclo...\n")
        contador += 1
        time.sleep(intervalo)

if __name__ == "__main__":
    iniciar_actualizacion(30)