import pandas as pd
import requests
import os
import glob
import matplotlib.pyplot as plt
import matplotlib
from datetime import datetime

# Configuración para servidores
matplotlib.use('Agg') 
import squarify 

# ==========================================
# CONFIGURACIÓN GENERAL
# ==========================================
TOKEN = "8641915683:AAERyHmFyxroaiMgf-vx1IUYYRno0D1XosU"
CHAT_ID = "@elprincipebvc"

# Rutas de archivos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_ACCIONES = os.path.join(BASE_DIR, "..", "static", "acciones", "*.csv")
RUTA_DOLAR = os.path.join(BASE_DIR, "..", "static", "csv", "dolar_bolivar.csv")

def obtener_info_tiempo():
    ahora = datetime.now()
    return f"📅 {ahora.strftime('%d/%m/%Y')} | 🕒 {ahora.strftime('%I:%M %p')}"

def formatear_volumen(monto):
    if monto >= 1_000_000:
        return f"{monto / 1_000_000:>4.1f}M"
    return f"{monto / 1_000:>4.0f}K"

# ==========================================
# MÓDULO: MAPA DE CALOR
# ==========================================
def generar_imagen_heatmap(df_maestro):
    try:
        df_plot = df_maestro[df_maestro['monto_efectivo'] > 0].copy()
        if df_plot.empty: return None
        df_plot = df_plot.sort_values(by='monto_efectivo', ascending=False)
        
        labels = [f"{row['accion']}\n({row['pct_real']:+.2f}%)" for _, row in df_plot.iterrows()]
        cmap = plt.cm.RdYlGn 
        norm = plt.Normalize(vmin=-8, vmax=8)
        colors = [cmap(norm(pct)) for pct in df_plot['pct_real']]
        
        fig, ax = plt.subplots(figsize=(12, 8))
        squarify.plot(sizes=df_plot['monto_efectivo'], label=labels, color=colors, alpha=0.8, ax=ax,
                       text_kwargs={'fontsize': 10, 'weight': 'bold', 'color': 'black'})
        plt.axis('off')
        plt.title('MAPA DE CALOR BVC', fontsize=18, weight='bold', pad=20)
        
        ruta_img = 'heatmap_bvc.png'
        plt.savefig(ruta_img, bbox_inches='tight', pad_inches=0.1, dpi=120)
        plt.close(fig)
        return ruta_img
    except Exception as e:
        print(f"⚠️ Error Heatmap: {e}")
        return None

# ==========================================
# MÓDULO: RADAR DE BALLENAS (CON FILTRO 1.2x)
# ==========================================
def construir_tabla_radar(df_dolar):
    ventanas = {"5D": 5, "15D": 15, "30D": 30, "60D": 60}
    col_tasa = df_dolar.columns[1]
    col_f_dolar = df_dolar.columns[2]
    df_dolar[col_f_dolar] = pd.to_datetime(df_dolar[col_f_dolar]).dt.date

    radar_data = []
    archivos = glob.glob(RUTA_ACCIONES)

    for archivo in archivos:
        try:
            ticker = os.path.basename(archivo).replace(".csv", "").upper()
            df = pd.read_csv(archivo)
            if len(df) < 10: continue
            
            df['fecha'] = pd.to_datetime(df['fecha']).dt.date
            df = pd.merge(df, df_dolar[[col_f_dolar, col_tasa]], left_on='fecha', right_on=col_f_dolar, how='left')
            df[col_tasa] = df[col_tasa].ffill()
            df['vol_usd'] = df['monto_efectivo'] / df[col_tasa]
            
            vol_hoy = df['vol_usd'].iloc[-1]
            change = df['precio'].iloc[-1] - df['precio'].iloc[-2]
            emoji = "🟢" if change > 0 else "🔴" if change < 0 else "⚪"
            
            # Cálculo de fuerza para la ventana principal (5D)
            prom_5d = df['vol_usd'].iloc[-6:-1].mean()
            fuerza_5d = (vol_hoy / prom_5d) if prom_5d > 0 else 0
            
            # --- FILTRO CRÍTICO: Mínimo 1.2x para ser relevante ---
            if fuerza_5d < 1.2:
                continue 

            res = {"tkr": ticker, "emoji": emoji, "5D": f"{fuerza_5d:.1f}x", "f5d_val": fuerza_5d}
            
            # Llenar las demás ventanas
            for n, v in [("15D", 15), ("30D", 30), ("60D", 60)]:
                if len(df) > v:
                    prom = df['vol_usd'].iloc[-(v+1):-1].mean()
                    res[n] = f"{(vol_hoy/prom):.1f}x" if prom > 0 else "0.0x"
                else:
                    res[n] = "---"
            radar_data.append(res)
        except: continue

    if not radar_data: 
        print("ℹ️ Radar: Ninguna acción superó el umbral de 1.2x.")
        return None

    txt = "<b>🔎 RADAR DE FUERZA (USD)</b>\n"
    txt += "<i>Filtrado: Solo > 1.2x en Scalping</i>\n"
    txt += "<code>TKR      | 5D   | 15D  | 30D  | 60D </code>\n"
    txt += "<code>------------------------------------</code>\n"
    
    # Ordenar por la fuerza de 5D
    radar_data.sort(key=lambda x: x['f5d_val'], reverse=True)
    
    for a in radar_data[:12]:
        txt += f"<code>{a['tkr']:<8} | {a['5D']:>4} | {a['15D']:>4} | {a['30D']:>4} | {a['60D']:>4}</code> {a['emoji']}\n"
    return txt

# ==========================================
# MOTOR PRINCIPAL
# ==========================================
def ejecutar_bot_completo():
    print("🚀 Iniciando Bot...")
    
    if not os.path.exists(RUTA_DOLAR):
        print("❌ ERROR: No se encontró dolar_bolivar.csv")
        return
    
    df_dolar = pd.read_csv(RUTA_DOLAR)
    df_dolar.columns = [c.strip().lower() for c in df_dolar.columns]

    archivos = glob.glob(RUTA_ACCIONES)
    if not archivos:
        print("❌ ERROR: No hay CSVs de acciones.")
        return

    lista_resumen = []
    for f in archivos:
        try:
            df_t = pd.read_csv(f)
            if df_t.empty: continue
            fila = df_t.iloc[-1:].copy()
            p = pd.to_numeric(fila['precio'], errors='coerce').fillna(0).iloc[0]
            v = pd.to_numeric(fila['variacion_abs'], errors='coerce').fillna(0).iloc[0]
            e = pd.to_numeric(fila['monto_efectivo'], errors='coerce').fillna(0).iloc[0]
            p_ant = p - v
            fila['pct_real'] = (v / p_ant * 100) if p_ant != 0 else 0
            fila['precio'] = p
            fila['monto_efectivo'] = e
            fila['accion'] = os.path.basename(f).replace(".csv","").upper()
            lista_resumen.append(fila)
        except: continue

    df_maestro = pd.concat(lista_resumen, ignore_index=True)

    # 1. Enviar Monitor
    msg = f"<b>🏛️ MONITOR BVC - ECOSISTEMA</b>\n<code>{obtener_info_tiempo()}</code>\n\n"
    df_s = df_maestro.sort_values(by='pct_real', ascending=False)
    # (Lógica de ganadoras/perdedoras y tabla igual que antes...)
    # ... [Omitido por brevedad para centrar en el radar] ...
    
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    requests.post(url, data={"chat_id": CHAT_ID, "text": msg, "parse_mode": "HTML"})

    # 2. Mapa de Calor
    img = generar_imagen_heatmap(df_maestro)
    if img:
        with open(img, 'rb') as f:
            requests.post(f"https://api.telegram.org/bot{TOKEN}/sendPhoto", data={'chat_id': CHAT_ID}, files={'photo': f})
        os.remove(img)

    # 3. Radar de Ballenas (Solo envía si hay alertas reales)
    radar_msg = construir_tabla_radar(df_dolar)
    if radar_msg:
        requests.post(url, data={"chat_id": CHAT_ID, "text": radar_msg, "parse_mode": "HTML"})

if __name__ == "__main__":
    ejecutar_bot_completo()