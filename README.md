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


## Cálculo actualizado de InDrive

En el cierre de jornada debes escribir el **total completo cobrado a los pasajeros de InDrive**.

La aplicación calcula automáticamente:

- Comisión de InDrive = total cobrado × porcentaje configurado.
- Ingreso de InDrive después de comisión.
- Total de gastos de la jornada.
- Ganancia neta.
- Saldo pendiente por recargar.

La comisión predeterminada es **13.69%** y puede modificarse en Configuración.

### Recarga de InDrive

El campo **Recarga de saldo realizada** indica cuánto de la comisión ya recargaste.

La recarga no se descuenta nuevamente de la ganancia, porque la comisión ya está incluida en los gastos. Se utiliza para calcular:

`Pendiente de recarga = comisión calculada - recarga realizada`

### Otros gastos

El cierre de jornada permite registrar:

- Gasolina inicial y adicional.
- Corredores y peajes.
- Otros gastos de aplicaciones.
- Otros gastos generales.
- Comisión automática de InDrive.


## Protección de datos

Se eliminó el botón **Reiniciar demostración** para evitar borrar accidentalmente:

- Vehículos.
- Jornadas.
- Configuración.
- Metas y datos guardados en el navegador.

Para respaldar la información utiliza **Configuración > Descargar respaldo JSON**.
