import pandas as pd
import glob
import os
from datetime import datetime

def obtener_info_tiempo():
    ahora = datetime.now()
    return f"📅 {ahora.strftime('%d/%m/%Y')} | 🕒 {ahora.strftime('%I:%M %p')}"

def construir_tabla_radar(df_dolar, ruta_acciones):
    # CHIVATO DE DEPURACIÓN: Esto te dirá en consola qué está buscando
    print(f"DEBUG Radar: Buscando archivos en {ruta_acciones}")
    
    fecha_hoy_str = datetime.now().strftime("%Y-%m-%d")
    
    df_dolar.columns = [c.strip() for c in df_dolar.columns]
    col_tasa = df_dolar.columns[1]
    
    radar_data = []
    archivos = glob.glob(ruta_acciones)
    
    print(f"DEBUG Radar: Se encontraron {len(archivos)} archivos CSV")

    for archivo in archivos:
        try:
            ticker = os.path.basename(archivo).replace(".csv", "").upper()
            df = pd.read_csv(archivo)
            
            # Limpiar nombres de columnas por si acaso hay espacios
            df.columns = [c.strip() for c in df.columns]
            
            if len(df) < 2: continue # Bajamos a 2 para que no sea tan estricto
            
            # Asegurar que la columna 'fecha' existe
            df['fecha_str'] = pd.to_datetime(df['fecha']).dt.strftime("%Y-%m-%d")
            
            # Si el último dato no es de hoy, lo ignoramos
            if df['fecha_str'].iloc[-1] != fecha_hoy_str: 
                continue

            tasa_hoy = float(df_dolar[col_tasa].iloc[-1])
            vol_hoy = float(df['monto_efectivo'].iloc[-1]) / tasa_hoy
            
            if vol_hoy <= 0: continue

            # Cálculo de promedios
            prom_5d = (df['monto_efectivo'].iloc[-6:-1].mean()) / tasa_hoy
            fuerza_5d = (vol_hoy / prom_5d) if (prom_5d > 0) else 0

            if fuerza_5d < 2.0: continue

            change = float(df['precio'].iloc[-1]) - float(df['precio'].iloc[-2])
            emoji = "🟢" if change > 0 else "🔴" if change < 0 else "⚪"

            res = {"tkr": ticker, "emoji": emoji, "5D": f"{fuerza_5d:.1f}x", "f5d_val": fuerza_5d}
            
            for n, v in [("15D", 15), ("30D", 30)]:
                if len(df) > v:
                    prom = (df['monto_efectivo'].iloc[-(v+1):-1].mean()) / tasa_hoy
                    res[n] = f"{(vol_hoy/prom):.1f}x" if (prom > 0) else "0.0x"
                else: res[n] = "---"

            radar_data.append(res)
        except Exception as e:
            # Si una acción falla, que nos diga cuál y por qué
            print(f"⚠️ Error procesando {ticker}: {e}")
            continue

    if not radar_data: 
        print("DEBUG Radar: No hay ballenas detectadas hoy.")
        return None

    txt = "<b>🔎 RADAR DE BALLENAS (2.0x+)</b>\n"
    txt += "<code>TKR      | 5D   | 15D  | 30D </code>\n"
    txt += "<code>------------------------------</code>\n"

    radar_data.sort(key=lambda x: x['f5d_val'], reverse=True)
    for a in radar_data[:10]:
        txt += f"<code>{a['tkr']:<8} | {a['5D']:>4} | {a['15D']:>4} | {a['30D']:>4}</code> {a['emoji']}\n"
    return txt