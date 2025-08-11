import { requireAuth } from '@/middleware/auth';
import { MongoClientFindOne, MongoClientUpdateOne } from '@/helpers/mongo';

export async function GET(req) {
  try {
    const { userId } = requireAuth(req);
    const { status, data } = await MongoClientFindOne('users', { _id: userId });
    if (!status || !data) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return Response.json({ user: { id: data.id || data._id?.toString(), email: data.email, name: data.name, phone: data.phone } }, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function PUT(req) {
  try {
    const { userId } = requireAuth(req);
    const { name, phone, address } = await req.json();

    if (!name && !phone && !address) {
      return new Response(JSON.stringify({ error: 'Name, phone or address is required' }), { status: 400 });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

        const { status, data } = await MongoClientUpdateOne('users', { _id: userId }, { $set: updateData });

    if (!status) {
      return new Response(JSON.stringify({ error: 'Failed to update user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return Response.json({ success: true, user: { id: data.id || data._id?.toString(), email: data.email, name: data.name, phone: data.phone } }, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
