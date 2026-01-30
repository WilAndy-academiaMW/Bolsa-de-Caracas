

# Acciones a procesar (según lo que quieres ahora)




import pandas as pd
import os

def convertir_acciones():
    RUTA_ACCIONES = "static/csv/acciones/"
    RUTA_SALIDA = "static/csv/accionesusd/"
    ARCHIVO_FX = os.path.join(RUTA_ACCIONES, "bolivar.csv")

    os.makedirs(RUTA_SALIDA, exist_ok=True)

    df_fx = pd.read_csv(ARCHIVO_FX)
    df_fx["Date"] = pd.to_datetime(df_fx["Date"], errors="coerce")
    df_fx = df_fx[["Date", "Precio_Cierre"]].rename(columns={"Precio_Cierre": "Tasa"})
    df_fx.sort_values("Date", inplace=True)
    df_fx["Tasa"] = df_fx["Tasa"].astype(float).replace(0, pd.NA).ffill()

    ACCIONES = ["Banco del Caribe.csv", "provincial.csv","proagro.csv","bolsa.csv","Efe.csv","Siderurgica Venezolana.csv"
            "Telares de Palo Grande.csv","ron.csv","ron2.csv","bnc.csv","grupo quimico.csv","cantv.csv",
            "corimon.csv", "ceramica.csv","Manufacturas de Papel CA.csv","bdv.csv","mercantil.csv","envases.csv",
             "protinal.csv","cemento.csv","INVACAB.csv","Telares de Palo Grande.csv","Montesco.csv" ]


    for archivo in ACCIONES:
        ruta_in = os.path.join(RUTA_ACCIONES, archivo)
        if not os.path.exists(ruta_in):
            continue

        df_bs = pd.read_csv(ruta_in)
        df_bs["Date"] = pd.to_datetime(df_bs["Date"], errors="coerce")

        df = pd.merge(df_bs, df_fx, on="Date", how="inner")

        precios_cols = ["Precio_Inicio", "Alto", "Bajo", "Precio_Cierre"]
        for col in precios_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col + "_USD"] = (df[col] / df["Tasa"]).round(3)

        columnas_salida = ["Date"] + [c + "_USD" for c in precios_cols]
        df_out = df[columnas_salida].copy()

        salida = os.path.join(RUTA_SALIDA, archivo.replace(".csv", "_usd.csv"))
        df_out.to_csv(salida, index=False, float_format="%.3f")

    return "Conversión realizada"
if __name__ == "__main__":
    resultado = convertir_acciones()
    print(resultado)
