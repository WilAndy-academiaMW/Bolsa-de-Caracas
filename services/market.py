import pandas as pd
import requests
import urllib3
import os
from io import StringIO
from datetime import date

# Desactivar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://market.bolsadecaracas.com/es"
HEADERS = {"User-Agent": "Mozilla/5.0"}

COLUMNAS = [
    'Nombre', 'Símbolo', 'Compra', 'Precio comp', 'Precio Vent', 'Venta',
    'Precio', 'Apertura', 'Var %', 'Var Abs', 'Volumen', 'Efectivo',
    'Operaciones', 'Máximo', 'Mínimo'
]

def formatear_venezuela(valor):
    if pd.isna(valor) or valor == '-':
        return ""
    try:
        # Formato: 195.0 -> 195,00
        return "{:,.2f}".format(float(valor)).replace(",", "X").replace(".", ",").replace("X", ".")
    except:
        return str(valor)

def guardar_por_empresa(df):
    """Crea un CSV individual por cada empresa dentro de la carpeta 'empresa'"""
    folder = "empresa"
    
    # Crear la carpeta si no existe
    if not os.path.exists(folder):
        os.makedirs(folder)
    
    fecha_hoy = date.today().strftime("%Y-%m-%d")

    # Iterar por cada fila (cada empresa)
    for _, fila in df.iterrows():
        simbolo = str(fila['Símbolo']).strip()
        if not simbolo: continue # Saltar si no hay símbolo
        
        nombre_archivo = os.path.join(folder, f"{simbolo}.csv")
        nueva_fila = pd.DataFrame([fila])

        if os.path.exists(nombre_archivo):
            # Leer el CSV de esta empresa específica
            df_existente = pd.read_csv(nombre_archivo)
            
            # Verificar si la fecha de hoy ya existe en este archivo
            if fecha_hoy in df_existente['Fecha'].astype(str).values:
                print(f"Empresa {simbolo}: Ya registrado hoy. No se hace nada.")
                continue
            else:
                # Añadir la nueva fila al final del CSV de esta empresa
                nueva_fila.to_csv(nombre_archivo, mode='a', index=False, header=False, encoding="utf-8-sig")
                print(f"Empresa {simbolo}: Nueva línea agregada.")
        else:
            # Si el CSV de la empresa no existe, se crea de cero con encabezados
            nueva_fila.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")
            print(f"Empresa {simbolo}: Archivo creado por primera vez.")

def main():
    try:
        resp = requests.get(URL, headers=HEADERS, verify=False)
        # Leer reconociendo el formato de origen (coma decimal, punto miles)
        tablas = pd.read_html(StringIO(resp.text), decimal=',', thousands='.')
        df = tablas[0]

        # Seleccionar columnas
        cols_existentes = [c for c in COLUMNAS if c in df.columns]
        df = df[cols_existentes].copy()

        # Asegurar que los datos sean numéricos antes de formatear
        for col in df.columns:
            if col not in ['Nombre', 'Símbolo']:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # Agregamos la fecha
        df['Fecha'] = date.today().strftime("%Y-%m-%d")

        # Aplicar formato visual venezolano (solo para estética en el CSV final)
        for col in df.columns:
            if col not in ['Nombre', 'Símbolo', 'Fecha']:
                df[col] = df[col].apply(formatear_venezuela)

        # Ejecutar la separación por archivos individuales
        guardar_por_empresa(df)

        print("\n¡Listo! Revisa la carpeta 'empresa'.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()