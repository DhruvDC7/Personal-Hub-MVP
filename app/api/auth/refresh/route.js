import cookie from 'cookie';
import { verifyToken, signAccess, parseExpires } from '@/lib/jwt';

// Environment detection with default to development
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const isDevelopment = !isProduction;

// Enhanced debug logging
const debugLog = (message, data = {}) => {
  if (isDevelopment) {
    console.log(`[${new Date().toISOString()}] [Refresh Token] ${message}`, Object.keys(data).length ? data : '');
  }
};

export async function POST(req) {
  try {
    debugLog('Refresh token request received');
    
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const token = cookies.refresh_token;
    
    debugLog('Cookies received', { hasRefreshToken: !!token });
    
    if (!token) {
      debugLog('No refresh token found in cookies');
      return new Response(JSON.stringify({ 
        error: 'No refresh token provided',
        ...(isDevelopment && { debug: 'No refresh_token found in cookies' })
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      debugLog('Verifying refresh token');
      const payload = verifyToken(token);
      debugLog('Refresh token verified', { userId: payload.userId });
      
      debugLog('Generating new access token');
      const accessToken = signAccess({ userId: payload.userId });
      
      const maxAge = parseExpires(process.env.JWT_EXPIRES_IN || '15m');
      const headers = {
        'Set-Cookie': cookie.serialize('access_token', accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'strict',
          path: '/',
          maxAge,
        })
      };
      
      debugLog('New access token generated and cookie set');
      
      return new Response(
        JSON.stringify({ 
          ok: true,
          expiresIn: maxAge,
          ...(isDevelopment && { debug: 'Token refreshed successfully' })
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
      debugLog('Error during token refresh', { 
        error: error.message,
        name: error.name,
        ...(isDevelopment && { stack: error.stack })
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired refresh token',
          ...(isDevelopment && { 
            details: error.message,
            ...(error.stack && { stack: error.stack })
          })
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
        ...(isDevelopment && { 
          details: error.message,
          stack: error.stack 
        })
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
