# Activar récords con Supabase

1. Abrí tu proyecto de Supabase.
2. Entrá a SQL Editor y elegí New query.
3. Abrí el archivo supabase/schema.sql de este repositorio, copiá todo su contenido y ejecutalo con Run.
4. Abrí cualquiera de los juegos, ingresá un nombre y elegí Guardar puntaje de sesión.

El ranking por juego muestra el mejor puntaje histórico de cada nombre. El ranking general del mes suma el mejor puntaje mensual de cada jugador en cada juego.

La app usa únicamente la Publishable key pública. No agregues una service_role key ni una contraseña de base de datos al repositorio.




## Agregar Cofre Rush

Si ya ejecutaste el esquema antes de que se agregara Cofre Rush, ejecutá también el archivo supabase/maze-migration.sql en SQL Editor para permitir guardar sus puntajes.
