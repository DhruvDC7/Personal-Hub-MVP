import cookie from 'cookie';
import { verifyToken, signAccess, parseExpires } from '@/lib/jwt';

export async function POST(req) {
  const cookies = cookie.parse(req.headers.get('cookie') || '');
  const token = cookies.refresh_token;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  try {
    const payload = verifyToken(token);
    const accessToken = signAccess({ userId: payload.userId });
    const headers = {
      'Set-Cookie': cookie.serialize('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: parseExpires(process.env.JWT_EXPIRES_IN || '15m'),
      })
    };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
}
