import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

// Allow the browser to PUT files directly to the R2 bucket via presigned URLs
// (needed for large uploads). Presigned URLs are the auth, so a permissive
// origin is fine here. Run once per bucket:
//
//   npm run set:r2-cors   (uses the S3_* env vars from .env)

const client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: req("S3_ENDPOINT"),
  credentials: {
    accessKeyId: req("S3_ACCESS_KEY_ID"),
    secretAccessKey: req("S3_SECRET_ACCESS_KEY"),
  },
});

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function main() {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: req("S3_BUCKET"),
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedOrigins: ["*"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  console.log("R2 CORS set on", process.env.S3_BUCKET);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
