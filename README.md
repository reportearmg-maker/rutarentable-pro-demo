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


## Uso en el celular como aplicación

RutaRentable ahora funciona como una PWA:

- Puede instalarse desde Chrome en Android.
- Se abre en una ventana independiente, sin la barra normal del navegador.
- La interfaz de jornada activa queda fija en la parte inferior del celular.
- Puede mantener la pantalla encendida durante una jornada activa, cuando el navegador y el ahorro de batería lo permitan.
- Los archivos principales quedan disponibles sin conexión después de la primera carga.

### Instalar en Android

1. Abre la página en Chrome.
2. Entra en **Configuración > Modo celular**.
3. Presiona **Instalar en el celular**.
4. También puedes usar el menú de Chrome y seleccionar **Instalar aplicación** o **Agregar a pantalla principal**.

### Seguridad

No manipules la aplicación mientras el vehículo esté en movimiento. Registra ingresos, kilometraje y gastos cuando estés estacionado.


## Guardado automático en el celular

La jornada activa ahora se guarda en dos registros locales y se vuelve a guardar cada 30 segundos.
Además, todos los campos del formulario **Finalizar jornada** se guardan como borrador mientras escribes.
Si Chrome cierra o suspende la página, al volver a abrir el cierre de jornada se recuperan los datos ingresados.

Se recomienda instalar RutaRentable como aplicación y evitar usar el modo incógnito. La opción **Descargar respaldo JSON** sigue disponible para una copia adicional.

## Comisión opcional de InDrive

La comisión de InDrive está desactivada al abrir un cierre nuevo. Solo se descuenta cuando activas **Aplicar comisión**.
Al activarla puedes modificar el porcentaje para esa jornada. Si no la activas:

- La comisión queda en $0.00.
- No se resta de la ganancia.
- No se calcula saldo pendiente por recargar.

Las jornadas históricas que ya tenían comisión conservan su cálculo anterior.

## Corredores reembolsados

Los corredores y peajes quedan registrados como información reembolsada, pero no se descuentan de la ganancia neta.


## Nuevas pestañas

### Gastos

Permite agregar manualmente:

- Recarga de InDrive.
- Lavado de carro.
- Gasolina.
- Mantenimiento.
- Reparación.
- Estacionamiento.
- Comida.
- Seguro.
- Otros.

La **recarga de InDrive** no se descuenta nuevamente de la ganancia. Se utiliza para reducir el saldo pendiente de recarga, porque la comisión ya se contabiliza cuando se activa en el cierre de la jornada.

Los demás gastos sí reducen la ganancia neta.

### Mantenimiento

Cada vehículo puede tener un recordatorio opcional por kilometraje.

Puedes configurar:

- Activar o desactivar el recordatorio.
- Intervalo libre, por ejemplo 5,000 o 7,000 km.
- Kilometraje del último mantenimiento.
- Nota del servicio.
- Marcar el mantenimiento como realizado con el kilometraje actual.
- Registrar el costo como gasto de mantenimiento.
