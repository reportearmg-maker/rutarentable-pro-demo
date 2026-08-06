# Cómo publicar RutaRentable en GitHub Pages

## Opción sencilla: usando la página web de GitHub

### 1. Crear el repositorio

1. Inicia sesión en GitHub.
2. Presiona el símbolo **+** de la parte superior.
3. Selecciona **New repository**.
4. Nombre recomendado: `rutarentable-pro-demo`.
5. Selecciona **Public**.
6. Presiona **Create repository**.

No agregues archivos automáticos si GitHub te ofrece README, licencia o .gitignore,
porque esta carpeta ya contiene lo necesario.

### 2. Subir los archivos

1. Dentro del repositorio, selecciona **uploading an existing file** o:
   **Add file > Upload files**.
2. Descomprime el ZIP de RutaRentable.
3. Selecciona y sube directamente estos archivos y carpetas:

- `index.html`
- `style.css`
- `app.js`
- `.nojekyll`
- `README.md`

Los archivos deben quedar directamente en la página principal del repositorio.
No deben quedar encerrados dentro de otra carpeta.

4. En la parte inferior escribe:
   `Primera versión de RutaRentable`
5. Presiona **Commit changes**.

### 3. Activar GitHub Pages

1. Abre **Settings** dentro del repositorio.
2. En el menú lateral, entra en **Pages**.
3. En **Build and deployment**, busca **Source**.
4. Selecciona **Deploy from a branch**.
5. En **Branch**, selecciona:
   - Rama: `main`
   - Carpeta: `/(root)`
6. Presiona **Save**.

GitHub mostrará la dirección cuando termine la publicación.

La dirección normalmente será:

`https://TU_USUARIO.github.io/rutarentable-pro-demo/`

## Actualizar la página

Para reemplazar archivos desde GitHub:

1. Entra al repositorio.
2. Selecciona **Add file > Upload files**.
3. Sube las versiones nuevas con los mismos nombres.
4. Confirma el reemplazo.
5. Presiona **Commit changes**.

GitHub Pages publicará la actualización automáticamente.

## Opción con Git instalado

Abre una terminal dentro de esta carpeta y ejecuta:

```bash
git init
git add .
git commit -m "Primera versión de RutaRentable"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/rutarentable-pro-demo.git
git push -u origin main
```

Luego activa GitHub Pages desde **Settings > Pages**.

## Importante

- No subas contraseñas, tokens ni secretos de APIs.
- Esta versión no contiene claves de Uber o InDrive.
- La información se guarda en `localStorage`, no en GitHub.
- Cada navegador tendrá sus propios registros.


## Archivos nuevos para la versión celular

También debes subir y reemplazar:

- `manifest.webmanifest`
- `service-worker.js`
- La carpeta `icons` completa

Después de publicar, abre la página en Chrome y actualiza una vez. Luego podrás instalarla desde **Configuración > Modo celular**.
