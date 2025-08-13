import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
const accessExp = process.env.JWT_EXPIRES_IN || '15m';
const refreshExp = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function signAccess(payload) {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: accessExp });
}

export function signRefresh(payload) {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: refreshExp });
}

export function verifyToken(token) {
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

export function parseExpires(str) {
  const match = /^([0-9]+)([smhd])$/.exec(str);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const map = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * map[unit];
}
