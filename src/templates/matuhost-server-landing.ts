/** Página al abrir la IP del servidor (sustituye "Welcome to nginx"). */
export function renderMatuHostServerLandingHtml(serverIp: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MatuHost</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafa; color: #3c4043; margin: 0; padding: 48px 24px; }
    .wrap { max-width: 640px; margin: 0 auto; }
    h1 { font-weight: 400; font-size: 1.75rem; color: #202124; }
    p { line-height: 1.6; }
    code { background: #f3e8ff; color: #5b21b6; padding: 2px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Welcome to MatuHost!</h1>
    <p>Servidor de hosting activo en <code>${serverIp}</code>.</p>
    <p>Abre tu dominio registrado en el panel (por ejemplo <code>tudominio.com</code>) para ver la página de bienvenida de ese sitio.</p>
  </div>
</body>
</html>`;
}
