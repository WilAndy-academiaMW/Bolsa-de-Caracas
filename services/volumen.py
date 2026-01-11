# services/volumen.py

import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import datetime as dt
from io import StringIO
from pathlib import Path

URL = "https://www.bolsadecaracas.com/resumen-mercado/"
CARPETA_BASE_ACCIONES = "static/csv/volumen"

COLUMNAS_BUSCADAS_LISTA = [
    'nombre', 'símbolo', 'último precio (bs)',
    'monto efectivo (bs)', 'variación', 'títulos negociados'
]
COLUMNAS_BUSCADAS = set(COLUMNAS_BUSCADAS_LISTA)

NOMBRES_FINALES_DF = {
    'nombre': 'Nombre',
    'símbolo': 'Símbolo',
    'último precio (bs)': 'Último Precio (Bs)',
    'monto efectivo (bs)': 'Monto Efectivo (Bs)',
    'variación': 'Variación (%)',
    'títulos negociados': 'Títulos Negociados'
}

COLUMNAS_METRICAS = [
    'Último Precio (Bs)', 'Monto Efectivo (Bs)',
    'Variación (%)', 'Títulos Negociados'
]

def aplanar_columna(col):
    if isinstance(col, tuple):
        return ' '.join(str(c) for c in col).lower().strip()
    return str(col).lower().strip()

def actualizar_volumen():
    resultados = {}
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--log-level=3')

    try:
        driver = webdriver.Chrome(options=options)
        driver.get(URL)
        WebDriverWait(driver, 80).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'col-12'))
        )
        html_cargado = driver.page_source
        driver.quit()

        df_listado = pd.read_html(StringIO(html_cargado), thousands='.', decimal=',')
        df_detalle = None
        for df in df_listado:
            columnas_df_actual = set([aplanar_columna(col) for col in df.columns.tolist()])
            if COLUMNAS_BUSCADAS.issubset(columnas_df_actual):
                df_detalle = df
                break

        if df_detalle is None:
            return {"ok": False, "error": "No se encontró la tabla esperada"}

        df_detalle.columns = [aplanar_columna(col) for col in df_detalle.columns]
        df_resultado = df_detalle[COLUMNAS_BUSCADAS_LISTA].copy()
        df_resultado.dropna(how='all', inplace=True)
        df_resultado.rename(columns=NOMBRES_FINALES_DF, inplace=True)

        fecha_hoy = dt.date.today().strftime("%Y-%m-%d")
        Path(CARPETA_BASE_ACCIONES).mkdir(exist_ok=True)

        for _, row in df_resultado.iterrows():
            simbolo = row['Símbolo']
            ruta_carpeta_accion = Path(CARPETA_BASE_ACCIONES) / simbolo
            ruta_archivo_csv = ruta_carpeta_accion / f"{simbolo}.csv"
            ruta_carpeta_accion.mkdir(exist_ok=True)

            nueva_fila = row[COLUMNAS_METRICAS].to_frame().T
            nueva_fila.index = [fecha_hoy]
            nueva_fila.index.name = 'Fecha'

            if ruta_archivo_csv.exists():
                df_antiguo = pd.read_csv(ruta_archivo_csv, index_col='Fecha')
                df_combinado = pd.concat([df_antiguo, nueva_fila])
                df_combinado = df_combinado[~df_combinado.index.duplicated(keep='last')]
                df_combinado.to_csv(ruta_archivo_csv)
                resultados[simbolo] = {"ok": True, "accion": "append"}
            else:
                nueva_fila.to_csv(ruta_archivo_csv)
                resultados[simbolo] = {"ok": True, "accion": "create"}

        return {"ok": True, "acciones": resultados}

    except Exception as e:
        if 'driver' in locals():
            driver.quit()
        return {"ok": False, "error": str(e)}
