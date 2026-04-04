import pandas as pd
import os

def calcular_fvg_data(ruta_csv):
    # Verificamos que el archivo exista realmente
    if not os.path.exists(ruta_csv):
        return {"status": "error", "message": f"Archivo no encontrado: {ruta_csv}"}

    try:
        # 1. Cargar el CSV
        df = pd.read_csv(ruta_csv)
        if len(df) < 3:
            return {"status": "ok", "fvgs": []}

        # 2. Limpieza estricta de columnas (Date, Alto_USD, Bajo_USD)
        # Convertimos a numérico por si hay nulos o errores en el CSV
        df['Alto_USD'] = pd.to_numeric(df['Alto_USD'], errors='coerce')
        df['Bajo_USD'] = pd.to_numeric(df['Bajo_USD'], errors='coerce')
        df = df.dropna(subset=['Alto_USD', 'Bajo_USD']).reset_index(drop=True)

        fvg_validos = []

        # 3. Escaneo desde la última fila (Hoy) hacia atrás (Pasado)
        # i = Vela 3 (Actual), i-1 = Vela 2 (Gap), i-2 = Vela 1 (Pasado)
        for i in range(len(df) - 1, 1, -1):
            if len(fvg_validos) >= 5: # Solo queremos los 5 más recientes
                break
            
            v3 = df.iloc[i]
            v2 = df.iloc[i-1]
            v1 = df.iloc[i-2]
            
            fvg_tipo = None
            top, bottom = 0, 0

            # --- IDENTIFICAR FVG ---
            if v3['Bajo_USD'] > v1['Alto_USD']: # ALCISTA
                fvg_tipo = "ALCISTA"
                top, bottom = float(v3['Bajo_USD']), float(v1['Alto_USD'])
            elif v3['Alto_USD'] < v1['Bajo_USD']: # BAJISTA
                fvg_tipo = "BAJISTA"
                top, bottom = float(v1['Bajo_USD']), float(v3['Alto_USD'])

            if fvg_tipo:
                # --- VERIFICACIÓN DE MITIGACIÓN (RELLENO) ---
                # Revisamos todas las velas desde que se creó (i+1) hasta el final (Hoy)
                esta_rellenado = False
                for j in range(i + 1, len(df)):
                    vela_futura = df.iloc[j]
                    
                    if fvg_tipo == "ALCISTA":
                        # Se anula si el precio BAJA y toca el techo del gap
                        if vela_futura['Bajo_USD'] <= top:
                            esta_rellenado = True
                            break
                    else: # BAJISTA
                        # Se anula si el precio SUBE y toca el suelo del gap
                        if vela_futura['Alto_USD'] >= bottom:
                            esta_rellenado = True
                            break
                
                # 4. Si el hueco sigue abierto, lo guardamos
                if not esta_rellenado:
                    fvg_validos.append({
                        "tipo": fvg_tipo,
                        "fecha": str(v2['Date']), # La fecha de la ineficiencia (Vela 2)
                        "top": top,
                        "bottom": bottom,
                        "rango": f"{bottom:.4f} - {top:.4f}"
                    })

        return {"status": "ok", "fvgs": fvg_validos}

    except Exception as e:
        return {"status": "error", "message": str(e)}