# Producción · Invitaciones de Amor

Tablero de producción (PWA) en produccion.eleganciadeamor.com. Solo el código de la app: los datos viven en
Supabase (tablas `prod_*`, con RLS: solo la cuenta de Jay) y los llena el sincronizador del servidor
(`cerebro/proyectos/invitaciones-de-amor/agente/tablero/sincronizador.py`). La llave de este repo es la
publicable (pública por diseño). Nada de datos de clientas ni llaves privadas aquí.
