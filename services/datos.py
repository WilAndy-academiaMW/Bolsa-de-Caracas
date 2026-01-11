# services/datos.py

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import os

# --- 1. CONFIGURACIÓN GLOBAL ---
CARPETA_ARCHIVOS = "static/csv/acciones"   # ✅ usa / para evitar problemas en Windows

# Calcular fechas: 3 años exactos hasta hoy
TRES_ANOS_ATRAS = datetime.today() - timedelta(days=3 * 365 + 1)
FECHA_INICIO = TRES_ANOS_ATRAS.strftime('%Y-%m-%d')
FECHA_FIN = datetime.today().strftime('%Y-%m-%d')

# --- 2. DICCIONARIO DE ACTIVOS A DESCARGAR ---
ACTIVOS_A_DESCARGAR = {
    "VES=X": "bolivar.csv",
    "BVCC.CR": "bolsa.csv",
    "CCR.CR": "ceramica.csv",
    "BPV.CR": "provincial.csv",
    "PGR.CR": "proagro.csv",
    "MTC-B.CR": "Montesco.csv",
    "EFE.CR": "Efe.csv",
    "ABC-A.CR": "Banco del Caribe.csv",
    "IVC-B.CR": "INVACA.csv",
    "SVS.CR": "Siderurgica Venezolana.csv",
    "TPG.CR": "Telares de Palo Grande.csv",
    "RST.CR": "ron.csv",
    "RST-B.CR": "ron2.csv",
    "MPA.CR": "Manufacturas de Papel CA.csv",
    "BVL.CR": "bdv.csv",
    "MVZ-A.CR": "mercantil.csv",
    "ENV.CR": "envases.csv",
    "PTN.CR": "protinal.csv",
    "FNC.CR": "cemento.csv",
    "CRM-A.CR": "corimon.csv",
    "BNC.CR": "bnc.csv",
    "CCP-B.CR": "clave capital.csv",
    "CGQ.CR": "grupo quimico.csv",
    "TDV-D.CR": "cantv.csv",
    "IMP-B.CR": "IMPULSA V.C.csv",
    "ICP-B.CR": "Crecepymes.csv",
    "IVC-A.CR": "INVACA.csv",
    "IVC-B.CR": "INVACAB.csv"
}

# --- 3. FUNCIÓN DE DESCARGA ---
def descargar_y_filtrar_datos(ticker, inicio, fin, ruta_completa_archivo):
    """
    Descarga, filtra y guarda datos históricos para un único ticker.
    """
    try:
        datos_completos = yf.download(ticker, start=inicio, end=fin, progress=False)

        if datos_completos.empty:
            return {"ok": False, "error": f"No se encontraron datos para {ticker}"}

        # Filtrar desde la fecha de inicio
        fecha_corte = pd.to_datetime(inicio)
        datos_filtrados = datos_completos[datos_completos.index >= fecha_corte]

        # Seleccionar columnas y renombrar
        columnas_requeridas = ['Open', 'High', 'Low', 'Close', 'Volume']
        datos_filtrados = datos_filtrados[columnas_requeridas]
        datos_filtrados.columns = ['Precio_Inicio', 'Alto', 'Bajo', 'Precio_Cierre', 'Volumen']

        # Guardar CSV
        datos_filtrados.to_csv(ruta_completa_archivo)

        return {"ok": True, "archivo": ruta_completa_archivo, "registros": len(datos_filtrados)}

    except Exception as e:
        return {"ok": False, "error": str(e)}

# --- 4. FUNCIÓN PRINCIPAL PARA FLASK ---
def actualizar_datos():
    """
    Descarga y guarda datos históricos para todos los activos definidos.
    Retorna un diccionario con el estado de cada ticker.
    """
    if not os.path.exists(CARPETA_ARCHIVOS):
        os.makedirs(CARPETA_ARCHIVOS)

    resultados = {}
    for ticker, nombre_archivo in ACTIVOS_A_DESCARGAR.items():
        ruta_completa = os.path.join(CARPETA_ARCHIVOS, nombre_archivo)
        resultados[ticker] = descargar_y_filtrar_datos(ticker, FECHA_INICIO, FECHA_FIN, ruta_completa)

    return resultados
