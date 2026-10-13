Las pruebas visuales usan el build real, una sesión de `admin@chat-demo.test` en la base demo
local de `127.0.0.1:55439` y respuestas ficticias interceptadas en el navegador. Ningún envío
de esta prueba llega a Meta. Las llamadas del navegador a otros orígenes se bloquean.

Después de `npm run build`, ejecutar desde `web`:

```powershell
# Playwright instalado localmente, o disponible mediante NODE_PATH.
$env:CHAT_BROWSER_CHANNEL = 'msedge' # Opcional; por defecto Chromium.
$env:CHAT_CAPTURAS_DIR = 'D:\ruta\capturas-chat'
npm run test:chat:ui
```

El runner inicia y detiene su servidor en el puerto 3312. Guarda PNGs y
`verificacion-ui.json` con las medidas verificadas. Cubre apertura al final, polling real
de 3 segundos, umbral de 120 px, historial estable, contador sin duplicados, carga diferida
de imagen/audio, cambios de conversación con respuestas tardías, Enter/Shift+Enter,
altura del compositor, búsqueda `?q=`, plantillas, vacío, carga y tema oscuro.

Las capturas usan el 13 de octubre de 2026 y `America/Mexico_City`, con un historial de
104 mensajes en cuatro días y otro con imagen y audio. Los viewports son 390×844,
820×1180, 1180×760 y 1536×864. No sustituyen las pruebas de APIs y permisos:
`npm run test:chat` y `node tests/run-chat-integration.mjs`.
