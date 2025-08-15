import Joi from 'joi';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { MongoClientFindOne, MongoClientInsertOne } from '@/helpers/mongo';

dayjs.extend(utc);
dayjs.extend(timezone);

const schema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
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
    const { found } = await MongoClientFindOne('users', { email });
    if (found) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 });
    }
    const hash = await bcrypt.hash(value.password, 10);
    const now = dayjs().tz('Asia/Kolkata').toISOString();
    const doc = {
      email,
      name: value.name.trim(),
      passwordHash: hash,
      role: 'user',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    const { status: insertStatus, message } = await MongoClientInsertOne('users', doc);
    if (!insertStatus) throw new Error(message);
    return Response.json({ user: { email: doc.email, name: doc.name } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), { status: 500 });
  }
}
