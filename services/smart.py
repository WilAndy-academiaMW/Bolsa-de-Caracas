import pandas as pd
import os
from flask import jsonify

def obtener_movimientos_multi_radar():
    # Lista de acciones a monitorear
    monedas = ["BPV", "BVCC", "MPA", "BDV", "EFE", "ENV", "TDA", "FNC", "BNC", "ABC.A","DOM","MVZ.A","RST","TDV.D","RST.B","PTN",
               "MTC.B","IVC.A","IVC.B"]
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Configuración de Radares
    radares = {
        "scalping": {"ventana": 5, "umbral": 1.10, "alertas": []},
        "day": {"ventana": 15, "umbral": 1.20, "alertas": []},
        "swing": {"ventana": 30, "umbral": 1.40, "alertas": []},
        "institucional": {"ventana": 60, "umbral": 1.60, "alertas": []}
    }

    for crypto in monedas:
        csv_path = os.path.join(base_dir, 'static', 'acciones', f"{crypto.lower()}.csv")
        
        if not os.path.exists(csv_path):
            continue

        try:
            # Leemos el CSV con tus columnas reales
            df = pd.read_csv(csv_path, names=['fecha', 'accion', 'precio', 'variacion_abs', 'monto_efectivo', 'hora'], header=0)
            df = df.tail(105)
            
            if len(df) < 2: continue 

            vol_actual = float(df['monto_efectivo'].iloc[-1])
            precio_actual = float(df['precio'].iloc[-1])
            precio_anterior = float(df['precio'].iloc[-2])

            # --- LÓGICA DE DETECCIÓN INTELIGENTE ---
            if precio_actual > precio_anterior:
                tipo = "ACUMULACIÓN"
                color = "#00ff00"  # Verde
            elif precio_actual < precio_anterior:
                tipo = "DISTRIBUCIÓN"
                color = "#ff4444"  # Rojo
            else:
                # El precio es igual: ABSORCIÓN
                tipo = "ABSORCIÓN"
                color = "#ebebeb"  # Blanco/Gris claro para resaltar en fondo oscuro

            for nombre, config in radares.items():
                v = config["ventana"]
                
                if len(df) >= v + 1:
                    # Promedio excluyendo el dato actual
                    vol_promedio = df['monto_efectivo'].iloc[-(v+1):-1].mean()
                    
                    if vol_promedio > 0:
                        fuerza = vol_actual / vol_promedio

                        if fuerza > config["umbral"]:
                            config["alertas"].append({
                                "symbol": crypto,
                                "fuerza": round(fuerza, 2),
                                "tipo": tipo,
                                "color": color,
                                "precio": precio_actual
                            })
                            print(f"🔥 Radar {nombre} detectó {crypto}: {fuerza}x como {tipo}")

        except Exception as e:
            print(f"❌ Error procesando {crypto}: {e}")
            continue

    # Ordenar resultados por fuerza de mayor a menor
    for nombre in radares:
        radares[nombre]["alertas"] = sorted(
            radares[nombre]["alertas"], 
            key=lambda x: x['fuerza'], 
            reverse=True
        )

    return radares