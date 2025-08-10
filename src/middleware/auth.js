import cookie from 'cookie';
import { verifyToken } from '@/lib/jwt';

export function requireAuth(req) {
  const cookies = cookie.parse(req.headers.get('cookie') || '');
  const token = cookies.access_token;
  if (!token) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  try {
    const payload = verifyToken(token);
    return { userId: payload.userId };
  } catch {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
}
