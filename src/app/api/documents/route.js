import crypto from "crypto";
import { getDb } from "@/lib/mongo";
import { presignPut, deleteFromS3 } from "@/lib/s3";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;

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

    const mapped = items.map((d) => ({
      _id: d._id,
      title: d.title,
      tags: d.tags || [],
      contentType: d.content_type || null,
      size: d.storage?.size || 0,
      uploadedAt: d.created_on,
      url:
        d.storage?.bucket && d.storage?.key
          ? `https://${d.storage.bucket}.s3.${region}.amazonaws.com/${d.storage.key}`
          : null,
    }));

    return Response.json({ status: true, data: mapped });
  } catch (e) {
    await logs(req, e?.message || "GET /documents failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

// POST /api/documents -> create metadata + presigned URL
export async function POST(req) {
  try {
    const { filename, contentType, title = "", tags = [] } = await req
      .json()
      .catch(() => ({}));

    if (!filename || !contentType) {
      return new Response(errorObject("filename and contentType are required", 400), {
        status: 400,
      });
    }

    const user_id = "demo-user";
    const ext = filename.split(".").pop();
    const key = `u/${user_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await presignPut(bucket, key, contentType);

    const db = await getDb();
    const doc = {
      user_id,
      title: title || filename,
      tags,
      content_type: contentType,
      storage: { bucket, key, size: 0 },
      status: "pending",
      created_on: new Date(),
    };
    const r = await db.collection("documents").insertOne(doc);

    return Response.json({
      status: true,
      data: { _id: r.insertedId, uploadUrl, bucket, key, title: doc.title, tags },
    });
  } catch (e) {
    await logs(req, e?.message || "POST /documents failed", 500);
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
    if (!id)
      return new Response(errorObject("id is required", 400), { status: 400 });

    const { ObjectId } = await import("mongodb");
    let _id;
    try {
      _id = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }

    const db = await getDb();
    const user_id = "demo-user";

    const doc = await db.collection("documents").findOne({ _id, user_id });
    if (!doc)
      return new Response(errorObject("document not found", 404), {
        status: 404,
      });

    if (doc.storage?.bucket && doc.storage?.key) {
      try {
        await deleteFromS3(doc.storage.bucket, doc.storage.key);
      } catch (e) {
        await logs(
          req,
          `S3 delete failed: ${e?.message || "error"}`,
          500,
          { id, storage: doc.storage },
        );
      }
    }

    await db.collection("documents").deleteOne({ _id, user_id });
    return Response.json({ status: true, data: { _id: id } });
  } catch (e) {
    await logs(req, e?.message || "DELETE /documents failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
