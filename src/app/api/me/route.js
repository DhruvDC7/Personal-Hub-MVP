import { requireAuth } from '@/middleware/auth';
import { MongoClientFindOne } from '@/helpers/mongo';

export async function GET(req) {
  try {
    const { userId } = requireAuth(req);
    const { status, data: user } = await MongoClientFindOne('users', { _id: userId });
    if (!status || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return Response.json({ user: { id: user.id || user._id?.toString(), email: user.email } });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
