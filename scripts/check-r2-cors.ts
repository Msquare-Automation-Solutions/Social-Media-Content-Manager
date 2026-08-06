import { S3Client, GetBucketCorsCommand } from "@aws-sdk/client-s3";

// Read back the bucket's current CORS rules — the counterpart to set-r2-cors.ts.
// Worth checking after a host move: browser uploads go straight to R2 via presigned
// URLs, so if the new site's origin isn't allowed, every upload fails with a CORS
// error that looks like an application bug.
//
//   npx tsx --env-file=.env scripts/check-r2-cors.ts

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
  const r = await client.send(new GetBucketCorsCommand({ Bucket: req("S3_BUCKET") }));
  console.log("bucket:", process.env.S3_BUCKET);
  console.log(JSON.stringify(r.CORSRules, null, 2));
}

main().catch((e) => {
  console.error(`${e.name}: ${e.message}`);
  process.exit(1);
});
