import matplotlib.pyplot as plt
import matplotlib
import squarify
import os
from datetime import datetime

matplotlib.use('Agg')

def generar_imagen_heatmap(df_maestro, base_dir):
    try:
        df_plot = df_maestro[df_maestro['monto_efectivo'] > 0].copy()
        if df_plot.empty: return None
        
        df_plot = df_plot.sort_values(by='monto_efectivo', ascending=False)
        labels = [f"{row['accion']}\n({row['pct']:+.2f}%)" for _, row in df_plot.iterrows()]
        
        cmap = plt.cm.RdYlGn
        norm = plt.Normalize(vmin=-5, vmax=5) 
        colors = [cmap(norm(pct)) for pct in df_plot['pct']]

        fig, ax = plt.subplots(figsize=(12, 8))
        squarify.plot(sizes=df_plot['monto_efectivo'], label=labels, color=colors, alpha=0.8, ax=ax,
                       text_kwargs={'fontsize': 9, 'weight': 'bold', 'color': 'black'})
        
        plt.axis('off')
        plt.title(f'MAPA DE CALOR BVC - {datetime.now().strftime("%d/%m")}', fontsize=18, weight='bold', pad=20)

        ruta_img = os.path.join(base_dir, 'heatmap_bvc.png')
        plt.savefig(ruta_img, bbox_inches='tight', pad_inches=0.1, dpi=120)
        plt.close(fig)
        return ruta_img
    except Exception as e:
        print(f"⚠️ Error Heatmap: {e}")
        return None