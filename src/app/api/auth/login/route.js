import Joi from 'joi';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { MongoClientFindOne, MongoClientUpdateOne, MongoClientInsertOne } from '@/helpers/mongo';
import { signAccess, signRefresh, parseExpires } from '@/lib/jwt';
import cookie from 'cookie';

dayjs.extend(utc);
dayjs.extend(timezone);

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(), // Reduced minimum length to 6 for better UX
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { value, error } = schema.validate(body);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    const email = value.email.toLowerCase();
    let user;
    let isNewUser = false;
    
    // Try to find existing user
    const { status, data: existingUser } = await MongoClientFindOne('users', { email });
    
    if (status && existingUser) {
      // Verify password for existing user
      const isPasswordValid = await bcrypt.compare(value.password, existingUser.passwordHash || '');
      if (!isPasswordValid) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
      }
      user = existingUser;
    } else {
      // Create new user if not exists
      const hashedPassword = await bcrypt.hash(value.password, 10);
      const now = dayjs().tz('Asia/Kolkata').toISOString();
      
      const newUser = {
        email,
        passwordHash: hashedPassword,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      };
      
      // Insert new user
      const { status: createStatus, data: createdUser } = await MongoClientInsertOne('users', newUser);
      
      if (!createStatus || !createdUser) {
        return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500 });
      }
      
      user = { ...newUser, _id: createdUser.insertedId };
      isNewUser = true;
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
    return new Response(
      JSON.stringify({ 
        user: { 
          id: payload.userId, 
          email,
          isNewUser 
        } 
      }), 
      { status: isNewUser ? 201 : 200, headers }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), { status: 500 });
  }
}
