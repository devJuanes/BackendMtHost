export interface DefaultSiteOptions {
  fqdn: string;
  panelUrl: string;
  docsUrl?: string;
}

/** Página por defecto (estilo Firebase) cuando el dominio está OK pero no hay despliegue. */
export function renderDefaultSiteHtml(options: DefaultSiteOptions): string {
  const { fqdn, panelUrl, docsUrl = `${panelUrl.replace(/\/$/, "")}/dashboard/hosting` } = options;
  const year = new Date().getFullYear();

  return `<!-- matuhost-default-site -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${fqdn} — MatuHost</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
      background: #fafafa;
      color: #3c4043;
      line-height: 1.6;
      min-height: 100vh;
    }
    .wrap {
      max-width: 640px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 400;
      color: #202124;
      letter-spacing: -0.02em;
      margin-bottom: 32px;
    }
    h2 {
      font-size: 1.125rem;
      font-weight: 500;
      color: #5f6368;
      margin: 28px 0 12px;
    }
    p, li { font-size: 0.9375rem; }
    ol {
      margin: 8px 0 0 1.25rem;
      padding: 0;
    }
    li { margin-bottom: 6px; }
    a {
      color: #7c3aed;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    .domain {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      background: #f3e8ff;
      color: #5b21b6;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
      font-size: 0.875rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      padding: 6px 12px;
      background: #ede9fe;
      color: #6d28d9;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 500;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }
    footer {
      margin-top: 56px;
      padding-top: 24px;
      border-top: 1px solid #e8eaed;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }
    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: #202124;
      letter-spacing: -0.03em;
    }
    .logo-text span {
      background: linear-gradient(135deg, #7c3aed, #d946ef);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .muted { color: #80868b; font-size: 0.8125rem; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge"><span class="badge-dot"></span> Conectado a MatuHost</div>
    <h1>Tu dominio ya está enlazado</h1>
    <p>
      Si ves esta página, el hosting de <strong>${escapeHtml(fqdn)}</strong> está activo en el servidor MatuHost.
      <span class="domain">${escapeHtml(fqdn)}</span>
    </p>

    <h2>¿Por qué veo esta página?</h2>
    <p>Es la página de bienvenida por defecto. Significa que DNS y Nginx en tu VPS están configurados; aún no has subido tu propia web.</p>
    <ol>
      <li>El dominio está registrado en MatuHost y el servidor responde.</li>
      <li>Cuando reemplaces <code>index.html</code> en <code>public_html</code>, verás tu sitio.</li>
      <li>Si el navegador muestra error DNS al abrir solo el nombre del dominio, usa el enlace de vista previa del panel hasta que el DNS global termine de propagar.</li>
    </ol>

    <h2>¿Cómo publico mi sitio?</h2>
    <p>
      Entra al <a href="${escapeAttr(panelUrl)}">panel de MatuHost</a>, crea una cuenta de hosting
      o sube tus archivos a <code>public_html</code>.
      Consulta la <a href="${escapeAttr(docsUrl)}">guía de hosting</a> para empezar.
    </p>

    <footer>
      <svg class="logo-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="36" height="36" rx="8" fill="url(#g)"/>
        <path d="M10 24V12h4.5l3 8.2L21 12H25v12h-3.2v-7.1l-3.2 5.6h-2.2l-3.2-5.6V24H10z" fill="white"/>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stop-color="#7c3aed"/>
            <stop offset="1" stop-color="#d946ef"/>
          </linearGradient>
        </defs>
      </svg>
      <div>
        <div class="logo-text"><span>Matu</span>Host</div>
        <div class="muted">© ${year} · Página por defecto</div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
