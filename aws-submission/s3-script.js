// AWS S3 Script: Upload, Retrieve, and Delete Objects
// Requires: npm install @aws-sdk/client-s3
// Configure your AWS credentials (env vars or ~/.aws/credentials)

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Update these values:
const BUCKET_NAME = "balentine-tech-portfolio-ok-2026db-708499049952-us-east-2-an";
const REGION = "us-east-2";

const s3 = new S3Client({ region: REGION });

// Upload a file to S3
async function uploadFile(filePath, key) {
  const fileStream = fs.createReadStream(filePath);
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileStream,
  };
  await s3.send(new PutObjectCommand(uploadParams));
  console.log(`Uploaded ${key} to ${BUCKET_NAME}`);
}

// Retrieve (download) a file from S3
async function downloadFile(key, downloadPath) {
  const getParams = {
    Bucket: BUCKET_NAME,
    Key: key,
  };
  const data = await s3.send(new GetObjectCommand(getParams));
  const writeStream = fs.createWriteStream(downloadPath);
  data.Body.pipe(writeStream);
  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`Downloaded ${key} to ${downloadPath}`);
}

// Delete a file from S3
async function deleteFile(key) {
  const deleteParams = {
    Bucket: BUCKET_NAME,
    Key: key,
  };
  await s3.send(new DeleteObjectCommand(deleteParams));
  console.log(`Deleted ${key} from ${BUCKET_NAME}`);
}

// Run the full upload → retrieve → delete demo
async function runDemo() {
  const TEST_FILE  = path.join(__dirname, "test-upload.txt");
  const S3_KEY     = "demo/test-upload.txt";
  const DOWNLOADED = path.join(__dirname, "test-downloaded.txt");

  // Step 1: Create a local test file to upload
  fs.writeFileSync(TEST_FILE, "Hello from Balentine Tech Solutions — AWS S3 demo file.");
  console.log("Created local test file:", TEST_FILE);

  // Step 2: Upload the file to S3
  await uploadFile(TEST_FILE, S3_KEY);

  // Step 3: Retrieve (download) the file back from S3
  await downloadFile(S3_KEY, DOWNLOADED);

  // Step 4: Print the retrieved file content to confirm success
  const content = fs.readFileSync(DOWNLOADED, "utf-8");
  console.log("Retrieved file content:", content);

  // Step 5: Delete the object from S3
  await deleteFile(S3_KEY);

  // Cleanup local temp files
  fs.unlinkSync(TEST_FILE);
  fs.unlinkSync(DOWNLOADED);
  console.log("Demo complete — upload, retrieve, and delete all successful.");
}

runDemo().catch(console.error);
