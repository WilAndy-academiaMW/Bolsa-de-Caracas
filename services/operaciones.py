import pandas as pd
import os

def procesar_radar_completo(symbol):
    try:
        ruta_csv = os.path.join('static', 'empresa', f'{symbol}.csv')
        
        if not os.path.exists(ruta_csv):
            return {"error": "Archivo no encontrado"}, 404
            
        df = pd.read_csv(ruta_csv)

        # Limpiador de formato venezolano (BVC)
        def clean_num(val):
            if pd.isna(val): return 0.0
            # Quita puntos de miles y cambia coma por punto
            s = str(val).replace('.', '').replace(',', '.')
            try:
                return float(s)
            except:
                return 0.0

        # Procesamos columnas clave
        df['Efectivo'] = df['Efectivo'].apply(clean_num)
        df['Operaciones'] = df['Operaciones'].apply(clean_num)
        
        # Cálculo del Ticket (Dinero por operación)
        # Evitamos división por cero con .replace(0, 1)
        df['Ticket'] = df['Efectivo'] / df['Operaciones'].replace(0, 1)
        
        media_historica = df['Ticket'].mean()

        reportes = []
        # Invertimos para que lo más nuevo salga de primero
        for _, row in df.iloc[::-1].iterrows():
            ratio = row['Ticket'] / media_historica
            
            # Clasificación por tamaño de billetera
            if ratio > 2.0:
                perfil = "🦈 TIBURÓN"
                clase = "shark"
                nota = "Mano fuerte detectada"
            elif ratio < 0.5:
                perfil = "🐟 RETAIL"
                clase = "retail"
                nota = "Inversionista común"
            else:
                perfil = "⚖️ NORMAL"
                clase = "normal"
                nota = "Flujo institucional base"

            reportes.append({
                "fecha": str(row['Fecha']),
                "ops": int(row['Operaciones']),
                "efectivo": round(row['Efectivo'], 2),
                "ticket": round(row['Ticket'], 2),
                "perfil": perfil,
                "clase": clase,
                "ratio": round(ratio, 2),
                "nota": nota
            })

        return reportes

    except Exception as e:
        return {"error": str(e)}