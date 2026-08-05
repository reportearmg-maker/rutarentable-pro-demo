# RutaRentable PRO — Demo web

Aplicación estática para probar el control de jornadas de trabajo en:

- Uber
- InDrive
- Viajes fuera de aplicaciones

## Funciones

- Agregar y eliminar vehículos.
- Inicio de jornada con kilometraje inicial y gasolina.
- Cierre de jornada con kilometraje final obligatorio.
- Registro separado de ingresos y viajes de Uber, InDrive y particulares.
- Cálculo de kilómetros recorridos.
- Horas trabajadas.
- Gastos y ganancia neta.
- Ganancia por hora y por kilómetro.
- Evaluación de rentabilidad.
- Reportes y exportación CSV.
- Respaldo en JSON.

## Publicación

Este repositorio está preparado para GitHub Pages.

En GitHub:

1. Abre **Settings**.
2. Entra en **Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Selecciona la rama **main** y la carpeta **/(root)**.
5. Guarda los cambios.

La dirección tendrá este formato:

`https://TU_USUARIO.github.io/rutarentable-pro-demo/`

## Almacenamiento

La demostración utiliza `localStorage`.

Esto significa que:

- Los datos quedan guardados únicamente en el navegador y dispositivo donde se registran.
- Otro teléfono o computadora no verá los mismos datos.
- Borrar los datos del navegador puede eliminar los registros.
- Se recomienda descargar respaldos JSON.

La siguiente etapa comercial necesitará inicio de sesión, backend y base de datos en internet.


## Eliminación de vehículos

Desde la pantalla **Vehículos** puedes usar el botón de papelera. Si el vehículo tiene jornadas asociadas, la aplicación pedirá confirmación y eliminará también esas jornadas. No se puede eliminar un vehículo mientras tenga una jornada activa.
