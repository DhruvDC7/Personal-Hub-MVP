import { getDb } from "@/lib/mongo";

export default async function logs(request, message, status, payload) {
  try {
    const db = await getDb();
    await db.collection("logs").insertOne({
      path: request?.url || "",
      method: request?.method || "",
      status,
      message,
      payload: payload ?? null,
      headers: Object.fromEntries(new Headers(request.headers).entries()),
      created_on: new Date(),
    });
  } catch {
    // swallow
  }
}
