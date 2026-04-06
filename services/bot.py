import pandas as pd
import requests
import os
import glob
import matplotlib.pyplot as plt
import matplotlib
from datetime import datetime

# Configuración para servidores (evita errores de interfaz gráfica)
matplotlib.use('Agg') 
import squarify 

# ==========================================
# CONFIGURACIÓN GENERAL
# ==========================================
TOKEN = "8641915683:AAERyHmFyxroaiMgf-vx1IUYYRno0D1XosU"
CHAT_ID = "@elprincipebvc"

# Rutas dinámicas (Funcionan en Windows y Linux)
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
        norm = plt.Normalize(vmin=-5, vmax=5) # Rango de color
        colors = [cmap(norm(pct)) for pct in df_plot['pct_real']]
        
        fig, ax = plt.subplots(figsize=(12, 8))
        squarify.plot(sizes=df_plot['monto_efectivo'], label=labels, color=colors, alpha=0.8, ax=ax,
                       text_kwargs={'fontsize': 9, 'weight': 'bold', 'color': 'black'})
        plt.axis('off')
        plt.title(f'MAPA DE CALOR BVC - {datetime.now().strftime("%d/%m")}', fontsize=18, weight='bold', pad=20)
        
        ruta_img = os.path.join(BASE_DIR, 'heatmap_bvc.png')
        plt.savefig(ruta_img, bbox_inches='tight', pad_inches=0.1, dpi=120)
        plt.close(fig)
        return ruta_img
    except Exception as e:
        print(f"⚠️ Error Heatmap: {e}")
        return None

# ==========================================
# MÓDULO: RADAR DE BALLENAS (FILTRO 2.0x)
# ==========================================
def construir_tabla_radar(df_dolar):
    col_tasa = df_dolar.columns[1]
    col_f_dolar = df_dolar.columns[2]
    df_dolar[col_f_dolar] = pd.to_datetime(df_dolar[col_f_dolar]).dt.date

    radar_data = []
    archivos = glob.glob(RUTA_ACCIONES)

    for archivo in archivos:
        try:
            ticker = os.path.basename(archivo).replace(".csv", "").upper()
            df = pd.read_csv(archivo)
            if len(df) < 6: continue
            
            df['fecha'] = pd.to_datetime(df['fecha']).dt.date
            df = pd.merge(df, df_dolar[[col_f_dolar, col_tasa]], left_on='fecha', right_on=col_f_dolar, how='left')
            df[col_tasa] = df[col_tasa].ffill()
            df['vol_usd'] = df['monto_efectivo'] / df[col_tasa]
            
            vol_hoy = df['vol_usd'].iloc[-1]
            if vol_hoy <= 0: continue

            # Cálculo de fuerza contra promedio 5 días previos
            prom_5d = df['vol_usd'].iloc[-6:-1].mean()
            fuerza_5d = (vol_hoy / prom_5d) if prom_5d > 0 else 0
            
            # --- FILTRO BALLENA: Mínimo 2.0x ---
            if fuerza_5d < 2.0:
                continue 

            change = df['precio'].iloc[-1] - df['precio'].iloc[-2]
            emoji = "🟢" if change > 0 else "🔴" if change < 0 else "⚪"
            
            res = {"tkr": ticker, "emoji": emoji, "5D": f"{fuerza_5d:.1f}x", "f5d_val": fuerza_5d}
            
            for n, v in [("15D", 15), ("30D", 30)]:
                if len(df) > v:
                    prom = df['vol_usd'].iloc[-(v+1):-1].mean()
                    res[n] = f"{(vol_hoy/prom):.1f}x" if prom > 0 else "0.0x"
                else: res[n] = "---"
            
            radar_data.append(res)
        except: continue

    if not radar_data: return None

    txt = "<b>🔎 RADAR DE BALLENAS (2.0x+)</b>\n"
    txt += "<code>TKR      | 5D   | 15D  | 30D </code>\n"
    txt += "<code>------------------------------</code>\n"
    
    radar_data.sort(key=lambda x: x['f5d_val'], reverse=True)
    for a in radar_data[:10]:
        txt += f"<code>{a['tkr']:<8} | {a['5D']:>4} | {a['15D']:>4} | {a['30D']:>4}</code> {a['emoji']}\n"
    return txt

# ==========================================
# MOTOR PRINCIPAL
# ==========================================
def ejecutar_bot_completo():
    print("🚀 Bot el Príncipe BVC Iniciando...")
    
    if not os.path.exists(RUTA_DOLAR):
        print(f"❌ ERROR: No se encontró {RUTA_DOLAR}")
        return

    df_dolar = pd.read_csv(RUTA_DOLAR)
    df_dolar.columns = [c.strip() for c in df_dolar.columns]

    archivos = glob.glob(RUTA_ACCIONES)
    lista_resumen = []
    
    for f in archivos:
        try:
            df_t = pd.read_csv(f)
            if df_t.empty or len(df_t) < 2: continue
            
            # Procesar última fila
            fila = df_t.iloc[-1:].copy()
            p = float(fila['precio'].iloc[0])
            v = float(fila['variacion_abs'].iloc[0])
            e = float(fila['monto_efectivo'].iloc[0])
            
            p_ant = p - v
            pct = (v / p_ant * 100) if p_ant != 0 else 0
            
            fila_res = {
                'accion': os.path.basename(f).replace(".csv","").upper(),
                'precio': p,
                'pct': pct,
                'monto': e
            }
            lista_resumen.append(fila_res)
        except: continue

    if not lista_resumen:
        print("❌ No hay datos suficientes para procesar.")
        return

    df_maestro = pd.DataFrame(lista_resumen)
    df_maestro['pct_real'] = df_maestro['pct'] # Para el Heatmap
    df_maestro['monto_efectivo'] = df_maestro['monto']

    # 1. GENERAR TABLA MONITOR (GANADORAS/PERDEDORAS)
    msg = f"<b>🏛️ MONITOR BVC - ECOSISTEMA</b>\n<code>{obtener_info_tiempo()}</code>\n\n"
    
    # Ganadoras (Top 5)
    ganadoras = df_maestro[df_maestro['pct'] > 0].sort_values('pct', ascending=False).head(5)
    if not ganadoras.empty:
        msg += "<b>🚀 GANADORAS</b>\n"
        for _, r in ganadoras.iterrows():
            msg += f"<code>{r['accion']:<8} | {r['precio']:>7.2f} | +{r['pct']:.2f}%</code>\n"
    
    # Perdedoras (Top 5)
    perdedoras = df_maestro[df_maestro['pct'] < 0].sort_values('pct', ascending=True).head(5)
    if not perdedoras.empty:
        msg += "\n<b>📉 PERDEDORAS</b>\n"
        for _, r in perdedoras.iterrows():
            msg += f"<code>{r['accion']:<8} | {r['precio']:>7.2f} | {r['pct']:.2f}%</code>\n"

    # Volumen Total
    vol_total = df_maestro['monto'].sum()
    msg += f"\n💰 <b>Volumen Total:</b> Bs {vol_total:,.2f}\n"

    # Enviar Mensaje Monitor
    requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", 
                  data={"chat_id": CHAT_ID, "text": msg, "parse_mode": "HTML"})

    # 2. ENVIAR HEATMAP
    img_path = generar_imagen_heatmap(df_maestro)
    if img_path:
        with open(img_path, 'rb') as f_img:
            requests.post(f"https://api.telegram.org/bot{TOKEN}/sendPhoto", 
                          data={'chat_id': CHAT_ID}, files={'photo': f_img})
        if os.path.exists(img_path): os.remove(img_path)

    # 3. ENVIAR RADAR DE BALLENAS (2.0x+)
    radar_msg = construir_tabla_radar(df_dolar)
    if radar_msg:
        requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", 
                      data={"chat_id": CHAT_ID, "text": radar_msg, "parse_mode": "HTML"})

if __name__ == "__main__":
    ejecutar_bot_completo()