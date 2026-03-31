import pandas as pd
import numpy as np
import re
from datetime import date
from dateutil.relativedelta import relativedelta

def limpiar_numero(s):
    if pd.isna(s): return np.nan
    # Limpiamos posibles comillas, espacios y cambiamos coma por punto
    t = str(s).strip().replace('"', '').replace(",", ".")
    t = re.sub(r"[^0-9\.\-]", "", t)
    try: return float(t)
    except: return np.nan

def ejecutar_logica_fg(df_window):
    """ Mantiene tu lógica de cálculo de sentimiento intacta """
    if len(df_window) < 2:
        return {"indice": "--", "momentum": "--", "volumen": "--", "volatilidad": "--", "sentimiento": "--"}

    # 1. MOMENTUM
    p_ini = df_window['precio_usd'].iloc[0]
    p_fin = df_window['precio_usd'].iloc[-1]
    cambio_pct = ((p_fin - p_ini) / p_ini) * 100 if p_ini != 0 else 0
    momentum_norm = min(100, max(0, 50 + (cambio_pct * 3.33)))

    # 2. VOLUMEN
    cierres = df_window['precio_usd'].values
    vols = df_window['monto_efectivo'].values
    v_pos, v_neg = 0, 0
    for i in range(1, len(cierres)):
        if cierres[i] > cierres[i-1]: v_pos += vols[i]
        elif cierres[i] < cierres[i-1]: v_neg += vols[i]
    
    volumen_norm = (v_pos / (v_pos + v_neg)) * 100 if (v_pos + v_neg) > 0 else 50

    # 3. VOLATILIDAD
    retornos_diarios = df_window['precio_usd'].pct_change().dropna() * 100
    std_pct = np.std(retornos_diarios) if len(retornos_diarios) > 0 else 0
    vol_base = min(100, (std_pct / 10.0) * 100)
    volatilidad_norm = vol_base if p_fin >= p_ini else 100 - vol_base

    indice = (momentum_norm + volumen_norm + volatilidad_norm) / 3.0
    
    # Sentimiento labels
    if indice >= 75: sent = "Codicia extrema"
    elif indice >= 60: sent = "Codicia"
    elif indice <= 25: sent = "Miedo extremo"
    elif indice <= 40: sent = "Miedo"
    else: sent = "Neutral"

    return {
        "indice": round(indice, 2),
        "momentum": f"{round(momentum_norm, 1)}%",
        "volumen": f"{round(volumen_norm, 1)}%",
        "volatilidad": f"{round(volatilidad_norm, 1)}%",
        "sentimiento": sent
    }

def calcular_fear_greed(csv_accion, csv_dolar='static/csv/dolar_bolivar.csv'):
    try:
        df = pd.read_csv(csv_accion)
        df_dolar = pd.read_csv(csv_dolar)
        
        # Normalizar nombres de columnas a minúsculas y sin espacios
        df.columns = [c.strip().lower() for c in df.columns]
        df_dolar.columns = [c.strip().lower() for c in df_dolar.columns]

        # Limpieza de datos numéricos
        df['precio'] = df['precio'].apply(limpiar_numero)
        df['monto_efectivo'] = df['monto_efectivo'].apply(limpiar_numero)
        
        col_tasa = df_dolar.columns[1] # Tasa (generalmente segunda columna)
        df_dolar[col_tasa] = df_dolar[col_tasa].apply(limpiar_numero)
        
        # Manejo de fechas
        df['fecha_dt'] = pd.to_datetime(df['fecha'])
        df_dolar['fecha_dt'] = pd.to_datetime(df_dolar[df_dolar.columns[2]]) # Fecha en dólar (tercera col)

        # Merge para dolarizar precios
        df = pd.merge_asof(df.sort_values('fecha_dt'), 
                           df_dolar[['fecha_dt', col_tasa]].sort_values('fecha_dt'), 
                           on='fecha_dt', direction='backward')
        
        df['precio_usd'] = df['precio'] / df[col_tasa]
        df = df.dropna(subset=['precio_usd']).sort_values('fecha_dt')

        # --- ACTUAL (Últimas 21 líneas / ~1 mes de trading actual) ---
        actual_data = ejecutar_logica_fg(df.tail(21).copy())

        # --- HISTORIAL (Meses Calendario) ---
        hoy = date.today()
        historico = {}
        
        # El bucle genera:
        # i=1 -> hoy - 1 mes (h1)
        # i=2 -> hoy - 2 meses (h2)
        # i=3 -> hoy - 3 meses (h3)
        for i in range(1, 4):
            target = hoy - relativedelta(months=i)
            # Filtramos estrictamente por mes y año
            df_mes = df[(df['fecha_dt'].dt.month == target.month) & 
                        (df['fecha_dt'].dt.year == target.year)].copy()
            
            # Guardamos el resultado en la posición correcta (h1, h2 o h3)
            historico[f"h{i}"] = ejecutar_logica_fg(df_mes)

        return {
            "actual": actual_data,
            "h1": historico["h1"], # Mes anterior
            "h2": historico["h2"], # Hace 2 meses
            "h3": historico["h3"]  # Hace 3 meses
        }
        
    except Exception as e:
        print(f"Error en Fear & Greed Engine: {e}")
        return {
            "actual": {"indice": 0, "sentimiento": "Error"},
            "h1": {"indice": "--"}, "h2": {"indice": "--"}, "h3": {"indice": "--"}
        }