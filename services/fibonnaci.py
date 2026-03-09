import os
import pandas as pd

# Definimos la ruta de la carpeta (desde la raíz del proyecto)
FIBO_FOLDER = os.path.join('static', 'csv', 'fibonacci')

def guardar_fibo_csv(moneda, p1, p2):
    # Asegurar que la carpeta existe
    if not os.path.exists(FIBO_FOLDER):
        os.makedirs(FIBO_FOLDER)
    
    file_path = os.path.join(FIBO_FOLDER, f"{moneda}_fibo.csv")
    
    # Creamos el DataFrame con los puntos
    df = pd.DataFrame([p1, p2])
    df.to_csv(file_path, index=False)
    return {"status": "success", "message": f"Fibo de {moneda} guardado"}

def cargar_fibo_csv(moneda):
    file_path = os.path.join(FIBO_FOLDER, f"{moneda}_fibo.csv")
    
    if os.path.exists(file_path):
        df = pd.read_csv(file_path)
        return {"status": "found", "puntos": df.to_dict(orient='records')}
    
    return {"status": "not_found"}