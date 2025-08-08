import { getDb } from "@/lib/mongo";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";

export async function GET(req) {
  try {
    const db = await getDb();
    const user_id = "demo-user";
    
    const accounts = await db.collection("accounts")
      .find({ user_id })
      .toArray();
      
    const sumAccounts = accounts.reduce(
      (sum, account) => sum + (Number(account.balance) || 0), 
      0
    );
    
    return Response.json({ 
      status: true, 
      data: { 
        networth: sumAccounts, 
        currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "INR" 
      } 
    });
  } catch (e) {
    await logs(req, e?.message || "GET /metrics/networth failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
