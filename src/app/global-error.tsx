'use client';

/**
 * Error boundary del layout raíz.
 * Si el layout principal explota (SSR, providers, etc.), esto atrapa el error
 * y muestra una pantalla amigable en vez del white screen crash de Next.js.
 *
 * global-error.tsx reemplaza COMPLETAMENTE el layout, por eso necesita su
 * propio <html> y <body>. Usa estilos inline porque no puede importar nada
 * de la app (la cascada de imports podría reintroducir el error).
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

const styles = {
  html: {
    colorScheme: 'dark' as const,
  },
  body: {
    margin: 0,
    background: '#0A0A0A',
    color: '#FFFFFF',
    fontFamily: 'Lexend, system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    padding: '24px',
  },
  container: {
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center' as const,
  },
  title: {
    fontFamily: 'Lexend, sans-serif',
    fontSize: '82px',
    fontStyle: 'italic',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    lineHeight: '0.85',
    color: '#22C55E',
    margin: 0,
    textShadow: '4px 4px 0px rgba(0,0,0,0.5)',
  },
  subtitle: {
    fontFamily: 'Lexend, sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    color: '#FFFFFF',
    marginTop: '24px',
    lineHeight: '1.3',
  },
  description: {
    fontFamily: 'Space Grotesk, monospace',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.4)',
    marginTop: '12px',
    lineHeight: '1.5',
  },
  button: {
    marginTop: '32px',
    width: '100%',
    height: '56px',
    background: '#22C55E',
    color: '#000000',
    border: 'none',
    fontFamily: 'Lexend, sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    transition: 'filter 0.15s ease',
  },
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-AR">
      <head>
        <title>El Fulbo — Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@700;900&family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.body}>
        <div style={styles.container}>
          <p style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#22C55E', margin: 0 }}>
            El Fulbo
          </p>

          <h1 style={styles.title}>ERROR</h1>

          <p style={styles.subtitle}>Algo salió mal.</p>

          <p style={styles.description}>
            {error.digest
              ? `Código: ${error.digest}. Si el problema persiste, cerra sesión y volvé a entrar.`
              : 'Si el problema persiste, cerra sesión y volvé a entrar.'}
          </p>

          <button
            type="button"
            onClick={reset}
            style={styles.button}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
