import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

let s3;
export function getS3() {
  if (s3) return s3;
  s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

export async function deleteFromS3(bucket, key) {
  const client = getS3();
  const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  return client.send(cmd);
}
