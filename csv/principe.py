import pandas as pd

# Ruta del archivo
path = r"static\empresa\ABC.A.csv"

def calcular_indicador_bvc(ruta):
    try:
        # Cargamos los datos
        df = pd.read_csv(ruta)
        
        # Aseguramos que la fecha esté en formato datetime y ordenada (por si acaso)
        df['Fecha'] = pd.to_datetime(df['Fecha'])
        df = df.sort_values(by='Fecha')

        # 1. Fuerza del Dinero: Tamaño Promedio de Ticket (TPT)
        # ¿Cuánto dinero mueve cada operación en promedio?
        df['TPT'] = df['Efectivo'] / df['Operaciones']
        df['TPT_Mean_26'] = df['TPT'].rolling(window=26).mean()

        # 2. Presión del Libro (Intención)
        # Ratio entre volumen de compra y volumen de venta
        df['Presion_Libro'] = (df['Compra'] - df['Venta']) / (df['Compra'] + df['Venta'])

        # 3. Impulso de Volumen
        # Volumen actual vs promedio de 26 días
        df['Vol_Relativo'] = df['Volumen'] / df['Volumen'].rolling(window=26).mean()

        # --- CÁLCULO DEL SCORE "BRUTAL" (0 a 100) ---
        # Combinamos: Variación de precio + Presión de Libro + Volumen Relativo
        # Normalizamos un poco los valores para el Score
        
        last_row = df.iloc[-1]
        
        score = 0
        # Regla 1: Si el precio sube con volumen superior al promedio (+30 puntos)
        if last_row['Var %'] > 0 and last_row['Vol_Relativo'] > 1:
            score += 30
        
        # Regla 2: Si el TPT actual es mayor al promedio de 26 días (Manos fuertes comprando) (+40 puntos)
        if last_row['TPT'] > last_row['TPT_Mean_26']:
            score += 40
            
        # Regla 3: Si la presión del libro es positiva (Más intención de compra) (+30 puntos)
        if last_row['Presion_Libro'] > 0:
            score += 30

        # --- SALIDA POR CONSOLA ---
        print(f"--- Análisis del Ticker: {last_row['Símbolo']} ---")
        print(f"Fecha: {last_row['Fecha'].date()}")
        print(f"Precio Cierre: {last_row['Precio']}")
        print(f"Variación: {last_row['Var %']}%")
        print("-" * 30)
        print(f"TPT Actual: {round(last_row['TPT'], 2)} (Promedio 26d: {round(last_row['TPT_Mean_26'], 2)})")
        print(f"Presión del Libro (Intención): {round(last_row['Presion_Libro'], 2)}")
        print(f"Volumen Relativo: {round(last_row['Vol_Relativo'], 2)}x")
        print("-" * 30)
        print(f"SCORE FINAL DEL INDICADOR: {score}/100")
        
        if score >= 70:
            print("SEÑAL: COMPRA FUERTE (Convergencia de volumen e intención)")
        elif score >= 40:
            print("SEÑAL: NEUTRAL / OBSERVACIÓN")
        else:
            print("SEÑAL: DEBILIDAD / PRECAUCIÓN")

    except Exception as e:
        print(f"Error al procesar el archivo: {e}")

# Ejecutar
calcular_indicador_bvc(path)