import { verifyToken, signAccess, parseExpires } from '@/lib/jwt';
import log from '@/helpers/logs';

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
    
    await log(req, 'Refresh token request started', 'info', {
      hasRefreshToken: !!token,
      cookieKeys: Object.keys(cookies)
    });
    
    if (!token) {
      await log(req, 'No refresh token provided', 'error');
      return new Response(JSON.stringify({ 
        error: 'No refresh token provided'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const payload = verifyToken(token);
      await log(req, 'Refresh token verified', 'info', {
        userId: payload.userId,
        tokenExp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A'
      });
      
      const accessPayload = {
        userId: payload.userId,
        name: payload.name || null,
        email: payload.email || null,
        role: payload.role || 'user',
      };
      const accessToken = signAccess(accessPayload);
      const maxAge = parseExpires(process.env.JWT_EXPIRES_IN || '15m');
      const isProduction = process.env.NODE_ENV === 'production';
      
      await log(req, 'New access token generated', 'info', {
        tokenLength: accessToken?.length || 0,
        maxAge,
        isProduction
      });
      const headers = {
        'Set-Cookie': [
          `access_token=${encodeURIComponent(accessToken)}`,
          'Path=/',
          'HttpOnly',
          `Max-Age=${maxAge}`,
          `SameSite=${isProduction ? 'Strict' : 'Lax'}`,
          ...(isProduction ? ['Secure'] : []) // Only add Secure in production
        ].filter(Boolean).join('; ')
      };
      
      const responseData = { 
        ok: true,
        expiresIn: maxAge,
        tokenRefreshed: true,
        user: {
          id: payload.userId,
          name: payload.name || null,
          email: payload.email || null,
          role: payload.role || 'user',
        }
      };
      
      await log(req, 'Token refresh successful', 'success', responseData);
      
      return new Response(
        JSON.stringify(responseData), 
        { 
          status: 200, 
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        }
      );
      
    } catch (error) {
      await log(req, 'Token verification failed', 'error', {
        error: error.message,
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired refresh token',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    await log(req, 'Unexpected error in refresh endpoint', 'error', {
      error: error.message,
      errorName: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
