import cookie from 'cookie';

export async function POST() {
  const headers = {
    'Set-Cookie': [
      cookie.serialize('access_token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      }),
      cookie.serialize('refresh_token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      }),
    ]
  };
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
