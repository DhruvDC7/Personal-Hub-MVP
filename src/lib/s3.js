import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3;

function getS3() {
  if (s3) return s3;
  const region = process.env.AWS_REGION;
  if (!region) throw new Error("AWS_REGION is not defined");
  s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

export async function presignPut(bucket, key, contentType) {
  const client = getS3();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: "AES256",
  });
  return getSignedUrl(client, cmd, { expiresIn: 600 });
}

export async function deleteFromS3(bucket, key) {
  const client = getS3();
  const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  return client.send(cmd);
}

export { getS3 };
