import Joi from 'joi';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ObjectId } from 'mongodb';
import { MongoClientFindOne, MongoClientInsertOne } from '@/helpers/mongo';
import { clientPromise } from '@/lib/mongo';

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
    const { status } = await MongoClientFindOne('users', { email });
    if (status) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 });
    }
    const hash = await bcrypt.hash(value.password, 10);
    const now = dayjs().tz('Asia/Kolkata').toISOString();
    const _id = new ObjectId();
    const doc = {
      _id,
      id: _id.toString(),
      email,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    const { status: insertStatus, message } = await MongoClientInsertOne('users', doc);
    if (!insertStatus) throw new Error(message);
    const client = await clientPromise;
    await client.db(process.env.MONGODB_DB).collection('users').createIndex({ email: 1 }, { unique: true });
    return Response.json({ user: { id: doc.id, email: doc.email } }, { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), { status: 500 });
  }
}
