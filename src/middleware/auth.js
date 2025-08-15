import { verifyToken } from '@/lib/jwt';

/**
 * Parses cookies from request headers
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  
  return cookieHeader
    .split(';')
    .reduce((cookies, cookie) => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (!name || !value) return cookies;
      
      return {
        ...cookies,
        [name.trim()]: value
      };
    }, {});
}

/**
 * Middleware to verify authentication
 */
export function requireAuth(req) {
  try {
    // 1. Get cookies from request
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    
    // 2. Get access token
    const token = cookies.access_token || '';
    if (!token) {
      const err = new Error('No access token provided');
      err.status = 401;
      throw err;
    }

    // 3. Verify token
    try {
      const payload = verifyToken(token);
      if (!payload || !payload.userId) {
        const err = new Error('Invalid token payload');
        err.status = 401;
        throw err;
      }
      return { 
        userId: payload.userId,
        name: payload.name || null,
        email: payload.email || null,
      };
    } catch (error) {
      const err = new Error('Invalid or expired token');
      err.status = 401;
      err.originalError = error.message;
      throw err;
    }
  } catch (error) {
    // Ensure error has status code
    if (!error.status) error.status = 401;
    throw error;
  }
}
