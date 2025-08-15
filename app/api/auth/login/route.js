import Joi from 'joi';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ObjectId } from 'mongodb';
import { MongoClientFindOne, MongoClientUpdateOne, MongoClientInsertOne } from '@/helpers/mongo';
import { signAccess, signRefresh, parseExpires } from '@/lib/jwt';
import { serialize } from 'cookie'; // ✅ use named export

dayjs.extend(utc);
dayjs.extend(timezone);

const schema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(), // min 6 for UX
});

export async function POST(req) {
  try {
    // 1) Validate input
    const body = await req.json();
    const { value, error } = schema.validate(body);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const email = value.email.toLowerCase();
    let user;
    let isNewUser = false;

    // 2) Try to find existing user
    const { found, data: existingUser } = await MongoClientFindOne('users', { email });

    if (found && existingUser) {
      // 2a) Verify password for existing user
      const isPasswordValid = await bcrypt.compare(value.password, existingUser.passwordHash || '');
      if (!isPasswordValid) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      user = existingUser;
    } else {
      // 2b) Create new user if not found
      const hashedPassword = await bcrypt.hash(value.password, 10);
      const now = dayjs().tz('Asia/Kolkata').toISOString();

      const newUser = {
        email,
        name: value.name.trim(),
        passwordHash: hashedPassword,
          createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      };

      const userData = await MongoClientInsertOne('users', newUser);
      if (!userData.status || !userData.data) {
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      user = { ...newUser, _id: userData.id };
      isNewUser = true;
    }
    // 3) Sign tokens with user id (string)F
    const userId = user.id || user._id?.toString();
    const payload = { 
      userId,
      name: user.name || value.name || null,
      email,
    };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);

    // 4) Update last login timestamps (ensure proper ObjectId in filter)
    const now = dayjs().tz('Asia/Kolkata').toISOString();
    let filter = { _id: userId }; // fallback if your helper accepts string ids
    try {
      // Prefer ObjectId when possible
      filter = { _id: new ObjectId(userId) };
    } catch {
      // ignore if not a valid ObjectId string; helper may handle string _id
    }

    await MongoClientUpdateOne('users', filter, {
      $set: { lastLoginAt: now, updatedAt: now }
    });

    // 5) Set secure httpOnly cookies
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

    // 6) Respond with minimal user object
    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          email,
          name: user.name || value.name || null,
          isNewUser
        }
      }),
      {
        status: isNewUser ? 201 : 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setCookieHeader
        }
      }
    );
  } catch (e) {
    // Robust error reporting
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
