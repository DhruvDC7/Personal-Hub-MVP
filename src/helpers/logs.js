import { MongoClientInsertOne } from "./mongo";

export default async function logs(request, message, status, payload) {
  try {
    await MongoClientInsertOne("logs", {
      path: request?.url || "",
      method: request?.method || "",
      status,
      message,
      payload: payload ?? null,
      headers: Object.fromEntries(new Headers(request.headers).entries()),
      created_on: new Date(),
    });
  } catch (e) {
    console.error(e);
  }
}
