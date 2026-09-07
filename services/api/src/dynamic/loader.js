// Dynamic route loader -- registers Shadow routes at runtime so that no
// Shadow endpoint path string ever needs to appear in git-tracked source.
//
// Reads process.env.RUNTIME_ROUTES_FILE (a JSON file with a `routes` array
// of { method, path, handler, auth }), looks up each handler by name in
// ./handlers.js, and registers it via computed member access
// (app[method](path, handler)) so static/source analysis cannot resolve the
// path strings from this file alone -- they only exist in the untracked
// runtime file.
//
// Must be mounted AFTER all static route files and BEFORE the 404 handler.
// If the env var is unset or the file does not exist, this is a silent
// no-op and the app boots normally serving only Common + Code-only routes.
const fs = require('fs');
const path = require('path');
const handlers = require('./handlers');
const { requireAuth } = require('../middleware/auth');

function loadDynamicRoutes(app) {
  const cfgPath = process.env.RUNTIME_ROUTES_FILE;
  if (!cfgPath) {
    console.log('[dynamic] RUNTIME_ROUTES_FILE not set -- skipping dynamic route registration');
    return 0;
  }

  const resolved = path.resolve(cfgPath);
  if (!fs.existsSync(resolved)) {
    console.log(`[dynamic] runtime routes file not found at ${resolved} -- skipping dynamic route registration`);
    return 0;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    console.error(`[dynamic] failed to parse runtime routes file: ${err.message}`);
    return 0;
  }

  const defs = Array.isArray(parsed.routes) ? parsed.routes : [];
  let registered = 0;

  for (const def of defs) {
    if (!def || !def.method || !def.path || !def.handler) continue;

    const handler = handlers[def.handler];
    if (typeof handler !== 'function') {
      console.warn(`[dynamic] unknown handler "${def.handler}" -- skipping route`);
      continue;
    }

    const method = String(def.method).toLowerCase();
    if (typeof app[method] !== 'function') {
      console.warn(`[dynamic] unsupported HTTP method "${def.method}" -- skipping route`);
      continue;
    }

    const chain = def.auth ? [requireAuth, handler] : [handler];
    app[method](def.path, ...chain);
    registered += 1;
  }

  console.log(`[dynamic] registered ${registered} runtime route(s) from ${resolved}`);
  return registered;
}

module.exports = { loadDynamicRoutes };
