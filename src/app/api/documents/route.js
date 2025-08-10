import crypto from "crypto";
import { ObjectId } from "mongodb";
import { presignPut, deleteFromS3 } from "@/lib/s3";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import {
  MongoClientFind,
  MongoClientInsertOne,
  MongoClientFindOne,
  MongoClientDeleteOne,
} from "@/helpers/mongo";

const toObjectId = (id) => ({ $oid: String(id) });

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;

// GET /api/documents -> list documents for demo-user (latest first)
export async function GET(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] GET /api/documents - Starting`);
  
  try {
    const user_id = "demo-user";
    const { status, data, message } = await MongoClientFind(
      "documents",
      { user_id },
      { sort: { created_on: -1 } }
    );
    if (!status) throw new Error(message);
    const items = data;

    const mapped = items.map((d) => ({
      id: d.id,
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

    console.log(`[API] [${requestId}] GET /api/documents - Success (${Date.now() - startTime}ms) - Found ${mapped.length} documents`);
    return Response.json({ status: true, data: mapped });
  } catch (e) {
    const errorMsg = e?.message || "GET /documents failed";
    console.error(`[API] [${requestId}] GET /api/documents - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

// POST /api/documents -> create metadata + presigned URL
export async function POST(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] POST /api/documents - Starting`);
  
  try {
    const { filename, contentType, title = "", tags = [] } = await req
      .json()
      .catch(() => ({}));

    if (!filename || !contentType) {
      console.error(`[API] [${requestId}] POST /api/documents - Missing required fields (${Date.now() - startTime}ms)`, { filename: !!filename, contentType: !!contentType });
      return new Response(errorObject("filename and contentType are required", 400), {
        status: 400,
      });
    }

    const user_id = "demo-user";
    const ext = filename.split(".").pop();
    const key = `u/${user_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploadUrl = await presignPut(bucket, key, contentType);

    const doc = {
      user_id,
      title: title || filename,
      tags,
      content_type: contentType,
      storage: { bucket, key, size: 0 },
      status: "pending",
      created_on: new Date(),
    };
    const { status, id, message } = await MongoClientInsertOne("documents", doc);
    if (!status) throw new Error(message);
    console.log(`[API] [${requestId}] POST /api/documents - Created document ${id} (${Date.now() - startTime}ms)`, {
      title: doc.title,
      contentType: doc.content_type,
      size: doc.storage?.size || 0
    });

    return Response.json({
      status: true,
      data: { id, uploadUrl, bucket, key, title: doc.title, tags },
    });
  } catch (e) {
    const errorMsg = e?.message || "POST /documents failed";
    console.error(`[API] [${requestId}] POST /api/documents - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

// DELETE /api/documents?id=<id> OR body { id }
// Deletes from S3 and DB
export async function DELETE(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] DELETE /api/documents - Starting`);
  
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?.id || searchParams.get("id");
    if (!id) {
      console.error(`[API] [${requestId}] DELETE /api/documents - Missing ID (${Date.now() - startTime}ms)`);
      return new Response(errorObject("id is required", 400), { status: 400 });
    }

    try {
      new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }

    const user_id = "demo-user";

    const { status, data, message } = await MongoClientFindOne(
      "documents",
      { _id: toObjectId(id), user_id }
    );
    if (!status) throw new Error(message);
    const doc = data;
    if (!doc) {
      console.error(`[API] [${requestId}] DELETE /api/documents - Document not found (${Date.now() - startTime}ms)`, { documentId: id });
      return new Response(errorObject("document not found", 404), {
        status: 404,
      });
    }

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

    const { status: delStatus, message: delMsg } = await MongoClientDeleteOne(
      "documents",
      { _id: toObjectId(id), user_id }
    );
    if (!delStatus) throw new Error(delMsg);
    console.log(`[API] [${requestId}] DELETE /api/documents - Deleted document ${id} (${Date.now() - startTime}ms)`, {
      title: doc.title,
      storage: doc.storage ? 'has_storage' : 'no_storage'
    });
    return Response.json({ status: true, data: { id } });
  } catch (e) {
    const errorMsg = e?.message || "DELETE /documents failed";
    console.error(`[API] [${requestId}] DELETE /api/documents - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
