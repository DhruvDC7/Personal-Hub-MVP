import { verifyToken, signAccess, parseExpires } from '@/lib/jwt';

// Simple cookie parser for Next.js 13+ route handlers
const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    if (name) {
      cookies[name] = decodeURIComponent(value || '');
    }
    return cookies;
  }, {});
};

export async function POST(req) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies.refresh_token;
    
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'No refresh token provided'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const payload = verifyToken(token);
      const accessToken = signAccess({ userId: payload.userId });
      
      const maxAge = parseExpires(process.env.JWT_EXPIRES_IN || '15m');
      const headers = {
        'Set-Cookie': [
          `access_token=${encodeURIComponent(accessToken)}`,
          'Path=/',
          'HttpOnly',
          `Max-Age=${maxAge}`,
          'SameSite=Strict',
          'Secure'
        ].join('; ')
      };
      
      return new Response(
        JSON.stringify({ 
          ok: true,
          expiresIn: maxAge
        }), 
        { 
          status: 200, 
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        }
      );
      
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired refresh token'
        }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('Unexpected error in refresh token endpoint:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
