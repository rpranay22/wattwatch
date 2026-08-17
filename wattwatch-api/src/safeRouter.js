// A drop-in replacement for express.Router() that automatically catches a
// rejected promise from every route handler and forwards it to Express's
// error middleware, instead of letting it become an unhandled promise
// rejection.
//
// Root cause this closes: not one route handler in this API had a
// try/catch. An async handler that throws (a bad DB read, an unexpected
// value, anything) becomes an unhandled rejection with nothing attached to
// it. On Node 15+, an unhandled rejection TERMINATES THE PROCESS by
// default. So a single bug in one endpoint (e.g. /usage) was capable of
// crashing the entire server, taking down every other feature — including
// completely unrelated ones like ticket creation — until it was restarted
// by hand. This wraps every handler registered through it, including any
// route added later, so that class of bug can never take the whole API
// down again; the failing request gets a clean 500, everything else keeps
// running.
import { Router } from 'express';

function wrap(handler) {
  if (typeof handler !== 'function') return handler; // path strings pass through untouched
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function safeRouter() {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
    const original = router[method].bind(router);
    router[method] = (...args) => original(...args.map(wrap));
  }
  return router;
}
