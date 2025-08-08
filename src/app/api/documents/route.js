import { getDb } from "@/lib/mongo";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import { deleteFromS3 } from "@/helpers/s3";

// GET /api/documents -> list documents for demo-user (latest first)
export async function GET(req) {
  try {
    const db = await getDb();
    const user_id = "demo-user";
    const items = await db
      .collection("documents")
      .find({ user_id })
      .sort({ created_on: -1 })
      .toArray();
    return Response.json({ status: true, data: items });
  } catch (e) {
    await logs(req, e?.message || "GET /documents failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

// DELETE /api/documents?id=<id> OR body { _id }
// Deletes from S3 and DB
export async function DELETE(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?._id || searchParams.get("id");
    if (!id) return new Response(errorObject("id is required", 403), { status: 403 });

    const { ObjectId } = await import("mongodb");
    const db = await getDb();
    const user_id = "demo-user";
    const _id = new ObjectId(String(id));

    const doc = await db.collection("documents").findOne({ _id, user_id });
    if (!doc) return new Response(errorObject("document not found", 404), { status: 404 });

    // delete from S3 first
    if (doc.storage?.bucket && doc.storage?.key) {
      try {
        await deleteFromS3(doc.storage.bucket, doc.storage.key);
      } catch (e) {
        // log but continue to avoid orphan DB row if S3 delete fails due to permissions
        await logs(req, `S3 delete failed: ${e?.message || "error"}`, 500, { id, storage: doc.storage });
      }
    }

    await db.collection("documents").deleteOne({ _id, user_id });
    return Response.json({ status: true, data: { _id: id } });
  } catch (e) {
    await logs(req, e?.message || "DELETE /documents failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
