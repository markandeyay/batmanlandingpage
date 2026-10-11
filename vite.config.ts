import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleSignup } from './api/_lib/signup.ts'

/*
  Serves POST /api/signup during `vite` and `vite preview` with the same core
  the Vercel function uses. With no PHOTON_* vars set it answers with a
  labeled mock so the page can be demoed and screenshotted offline.
*/
function localSignupApi(env: Record<string, string>): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/signup')) return next()
    void serve(req, res)
  }
  const serve = async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    const result = await handleSignup(
      {
        method: req.method ?? 'GET',
        ip: req.socket.remoteAddress ?? 'local',
        headers: { get: (n) => (req.headers[n.toLowerCase()] as string | undefined) ?? null },
        json: async () => JSON.parse(raw),
      },
      {
        PHOTON_PROJECT_ID: env.PHOTON_PROJECT_ID,
        PHOTON_PROJECT_SECRET: env.PHOTON_PROJECT_SECRET,
        onVercel: false,
      },
    )
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    for (const [k, v] of Object.entries(result.headers ?? {})) res.setHeader(k, v)
    res.end(JSON.stringify(result.body))
  }
  return {
    name: 'local-signup-api',
    configureServer: (server) => { server.middlewares.use(middleware) },
    configurePreviewServer: (server) => { server.middlewares.use(middleware) },
  }
}

export default defineConfig(({ mode }) => {
  // Empty prefix loads PHOTON_* for the local API only; nothing is exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [localSignupApi(env)],
    build: {
      target: 'es2022',
      modulePreload: { polyfill: false },
      cssCodeSplit: false,
      assetsInlineLimit: 0,
      reportCompressedSize: true,
    },
  }
})
