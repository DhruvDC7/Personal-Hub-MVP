import Joi from 'joi';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { MongoClientFindOne, MongoClientUpdateOne } from '@/helpers/mongo';
import { signAccess, signRefresh, parseExpires } from '@/lib/jwt';
import cookie from 'cookie';

dayjs.extend(utc);
dayjs.extend(timezone);

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { value, error } = schema.validate(body);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    const email = value.email.toLowerCase();
    const { status, data: user } = await MongoClientFindOne('users', { email });
    if (!status || !user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }
    const ok = await bcrypt.compare(value.password, user.passwordHash || '');
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }
    const payload = { userId: user.id || user._id?.toString() };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);
    const now = dayjs().tz('Asia/Kolkata').toISOString();
    await MongoClientUpdateOne('users', { _id: payload.userId }, { $set: { lastLoginAt: now, updatedAt: now } });
    const headers = {
      'Set-Cookie': [
        cookie.serialize('access_token', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: parseExpires(process.env.JWT_EXPIRES_IN || '15m'),
        }),
        cookie.serialize('refresh_token', refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: parseExpires(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
        }),
      ]
    };
    return new Response(JSON.stringify({ user: { id: payload.userId, email } }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), { status: 500 });
  }
}
