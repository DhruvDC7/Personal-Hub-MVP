import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import { MongoClientFind } from "@/helpers/mongo";
import { requireAuth } from "@/middleware/auth";

export async function GET(req) {
  try {
    const { userId } = requireAuth(req);
    const { status, data, message } = await MongoClientFind("accounts", { user_id: userId });
    if (!status) throw new Error(message);

    const sumAccounts = data.reduce((sum, account) => {
      const balance = Number(account.balance) || 0;
      if (account.type === 'loan') {
        return sum - balance;
      }
      return sum + balance;
    }, 0);
    
    return Response.json({ 
      status: true, 
      data: { 
        networth: sumAccounts, 
        currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "INR" 
      } 
    });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    await logs(req, e?.message || "GET /metrics/networth failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
