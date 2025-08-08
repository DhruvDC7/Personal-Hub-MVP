import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import { getDb } from "@/lib/mongo";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const { filename, contentType } = await req.json();
    
    if (!filename || !contentType) {
      return new Response(
        errorObject("filename and contentType are required", 403), 
        { status: 403 }
      );
    }

    const user_id = "demo-user";
    const ext = filename.split(".").pop();
    const key = `u/${user_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    const db = await getDb();
    await db.collection("documents").insertOne({
      user_id,
      title: filename,
      tags: [],
      storage: { 
        bucket: process.env.S3_BUCKET, 
        key, 
        size: 0 
      },
      enc: null,
      created_on: new Date(),
    });

    return Response.json({ 
      status: true, 
      data: { key, uploadUrl } 
    });
  } catch (e) {
    await logs(req, e?.message || "POST /documents/presign failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
