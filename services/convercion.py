

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

    ACCIONES = ["ABC.A.csv", "BPV.csv","PGR.csv","BCVV.csv","BVL.csv","CCP.B.csv","CCR.csv","EFE.csv","SVS.csv",
            "TGP","ICP.B.csv","CGQ.csv","RST.csv","RST.B.csv","BNC.csv","DOM.csva","TDV.D.csv",
            "CRM.A.csv","MPA.csv","bdv.csv","MVZ.A.csv","MVZ.B.csv","ENV.csv",
             "PTN.csv","FNC.csv","IVC.A.csv","Telares de Palo Grande.csv","MTC.B.csv","Zulia.csv" ]


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

        salida = os.path.join(RUTA_SALIDA, archivo.replace(".csv", ".csv"))
        df_out.to_csv(salida, index=False, float_format="%.3f")

    return "Conversión realizada"
if __name__ == "__main__":
    resultado = convertir_acciones()
    print(resultado)
