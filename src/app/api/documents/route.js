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

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;

// GET /api/documents -> list documents for demo-user (latest first)
export async function GET(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
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

    return Response.json({ status: true, data: mapped });
  } catch (e) {
    const errorMsg = e?.message || "GET /documents failed";
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

// POST /api/documents -> create metadata + presigned URL
export async function POST(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
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
    return Response.json({
      status: true,
      data: { id, uploadUrl, bucket, key, title: doc.title, tags },
    });
  } catch (e) {
    const errorMsg = e?.message || "POST /documents failed";
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

// DELETE /api/documents?id=<id> OR body { id }
// Deletes from S3 and DB
export async function DELETE(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?.id || searchParams.get("id");
    if (!id) {
      return new Response(errorObject("Missing ID", 400), { status: 400 });
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
      return new Response(errorObject("Document not found", 404), { status: 404 });
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
    return Response.json({ status: true, data: { id } });
  } catch (e) {
    const errorMsg = e?.message || "DELETE /documents failed";
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
