// Two separate identities. An app-user token has type:'user'; an admin token
// has type:'admin' plus a role. requireUser rejects admin tokens and vice
// versa, so the two systems can never cross over.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const SECRET = process.env.JWT_SECRET || 'dev_only_insecure_secret';

export const hashPassword = (p) => bcrypt.hash(p, 10);
export const verifyPassword = (p, h) => bcrypt.compare(p, h);

export const signUserToken = (u) =>
  jwt.sign({ sub: u.id, type: 'user' }, SECRET, { expiresIn: '30d' });

export const signAdminToken = (a) =>
  jwt.sign({ sub: a.id, type: 'admin', role: a.role }, SECRET, { expiresIn: '12h' });

function verify(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

// App routes: only accept a user token.
export function requireUser(req, res, next) {
  const p = verify(req);
  if (!p) return res.status(401).json({ error: 'Not signed in' });
  if (p.type !== 'user') return res.status(403).json({ error: 'Use the app to sign in' });
  req.userId = p.sub;
  next();
}

// Portal routes: only accept an admin token.
export function requireAdmin(req, res, next) {
  const p = verify(req);
  if (!p) return res.status(401).json({ error: 'Not signed in' });
  if (p.type !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  req.adminId = p.sub;
  req.adminRole = p.role;
  next();
}

// Restrict a portal route to admins who can change data (not read_only).
export function requireWriteRole(req, res, next) {
  if (req.adminRole === 'read_only')
    return res.status(403).json({ error: 'Your admin role is read only' });
  next();
}
