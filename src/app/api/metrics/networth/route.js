import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import { MongoClientFind } from "@/helpers/mongo";

export async function GET(req) {
  try {
    const user_id = "demo-user";
    const { status, data, message } = await MongoClientFind("accounts", { user_id });
    if (!status) throw new Error(message);

    const sumAccounts = data.reduce(
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
