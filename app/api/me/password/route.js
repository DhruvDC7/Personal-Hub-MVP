import Joi from 'joi';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { MongoClientFindOne, MongoClientUpdateOne } from '@/helpers/mongo';
import { verifyToken, signAccess, signRefresh, parseExpires } from '@/lib/jwt';
import { serialize } from 'cookie';

dayjs.extend(utc);
dayjs.extend(timezone);

const schema = Joi.object({
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/)
    .required(),
});

export async function POST(req) {
  try {
    // 1) Auth: read and verify access token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = payload?.userId;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) Validate input
    const body = await req.json();
    const { value, error } = schema.validate(body);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3) Load user
    const { found, data: user } = await MongoClientFindOne('users', { _id: userId });
    if (!found || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4) Check old password
    const ok = await bcrypt.compare(value.oldPassword, user.passwordHash || '');
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Old password is incorrect' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5) Ensure new password is different
    const sameAsOld = await bcrypt.compare(value.newPassword, user.passwordHash || '');
    if (sameAsOld) {
      return new Response(JSON.stringify({ error: 'New password must be different from old password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6) Hash and update
    const newHash = await bcrypt.hash(value.newPassword, 10);
    const now = dayjs().tz('Asia/Kolkata').toISOString();

    let filter = { _id: userId };
    try {
      filter = { _id: new ObjectId(userId) };
    } catch {}

    const updateRes = await MongoClientUpdateOne('users', filter, {
      $set: { passwordHash: newHash, updatedAt: now },
    });

    if (!updateRes?.status) {
      return new Response(JSON.stringify({ error: 'Failed to update password' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7) Rotate tokens
    const newPayload = { userId };
    const accessToken = signAccess(newPayload);
    const refreshToken = signRefresh(newPayload);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    };

    const setCookieHeader = [
      serialize('access_token', accessToken, {
        ...cookieOptions,
        maxAge: parseExpires(process.env.JWT_EXPIRES_IN || '15m'),
      }),
      serialize('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: parseExpires(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
      }),
    ];

    // 8) Respond
    return new Response(
      JSON.stringify({ message: 'Password updated successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setCookieHeader,
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
