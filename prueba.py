import pandas as pd

def analizar_estructura_smc(ruta_csv):
    try:
        df = pd.read_csv(ruta_csv, names=['Date', 'Open', 'High', 'Low', 'Close'])
        for col in ['Open', 'High', 'Low', 'Close']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna().reset_index(drop=True)

        # --- 1. DETECTAR FRACTALES (SWINGS) ---
        swings = []
        for i in range(2, len(df) - 2):
            # Swing High (Pico)
            if df.iloc[i]['High'] > df.iloc[i-1]['High'] and df.iloc[i]['High'] > df.iloc[i+1]['High']:
                swings.append({'tipo': 'HIGH', 'precio': df.iloc[i]['High'], 'fecha': df.iloc[i]['Date'], 'idx': i})
            # Swing Low (Valle)
            if df.iloc[i]['Low'] < df.iloc[i-1]['Low'] and df.iloc[i]['Low'] < df.iloc[i+1]['Low']:
                swings.append({'tipo': 'LOW', 'precio': df.iloc[i]['Low'], 'fecha': df.iloc[i]['Date'], 'idx': i})

        # --- 2. RASTREO DE ESTRUCTURA (BOS / CHoCH) ---
        # Analizamos desde los últimos hacia atrás
        ultimo_precio = df.iloc[-1]['Close']
        estructura = "ALCISTA" # Asumimos inicio alcista por los datos de dic
        puntos_clave = []
        
        # Necesitamos los últimos Swings para comparar
        if len(swings) < 4: return print("No hay suficientes fractales.")

        # Tomamos los últimos para el análisis de hoy
        last_low = [s for s in swings if s['tipo'] == 'LOW'][-1]
        last_high = [s for s in swings if s['tipo'] == 'HIGH'][-1]
        prev_low = [s for s in swings if s['tipo'] == 'LOW'][-2]
        prev_high = [s for s in swings if s['tipo'] == 'HIGH'][-2]

        print("\n" + "═"*60)
        print(f" DIAGNÓSTICO DE ESTRUCTURA (BOS / CHoCH) ".center(60, "█"))
        print("═"*60)

        # LÓGICA DE DETECCIÓN
        # 1. ¿Rompimos el último piso? -> CHoCH Bajista
        if ultimo_precio < last_low['precio']:
            print(f"⚠️ ¡CHoCH BAJISTA DETECTADO!")
            print(f"Causa: El precio ({ultimo_precio}) rompió el último piso de {last_low['precio']} ({last_low['fecha']})")
            print(f"Estado: El carácter cambió. Estamos en un RETROCESO o CAMBIO DE TENDENCIA.")
            
            # Buscamos el BOS previo (el último máximo superado)
            if last_high['precio'] > prev_high['precio']:
                print(f"✅ Último BOS Alcista previo en: {last_high['fecha']} (Nivel {prev_high['precio']})")

        # 2. ¿Rompimos el último techo? -> BOS Alcista (Tendencia Sana)
        elif ultimo_precio > last_high['precio']:
            print(f"🚀 BOS ALCISTA DETECTADO")
            print(f"Estado: Tendencia alcista fuerte y sana.")
            print(f"Confirmación: Superamos el máximo de {last_high['precio']} del día {last_high['fecha']}")

        # 3. ¿Estamos dentro del rango?
        else:
            print(f"🔄 MERCADO EN RANGO (Internal Structure)")
            print(f"Techo: {last_high['precio']} | Piso: {last_low['precio']}")
            print(f"Nota: Esperando rotura de alguno de estos niveles.")

        print("═"*60)
        print(" ÚLTIMOS PUNTOS DE REFERENCIA ".center(60, "─"))
        print(f" • Alto más alto (HH): {max([s['precio'] for s in swings if s['tipo'] == 'HIGH']):.3f}")
        print(f" • Bajo más bajo (LL): {min([s['precio'] for s in swings if s['tipo'] == 'LOW']):.3f}")
        print("═"*60)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    ruta = r'static\csv\accionesusd\ABC.A.csv'
    analizar_estructura_smc(ruta)