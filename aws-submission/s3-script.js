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

// Example usage:
// (Uncomment to test)
// uploadFile('localfile.txt', 'uploadedfile.txt');
// downloadFile('uploadedfile.txt', 'downloadedfile.txt');
// deleteFile('uploadedfile.txt');

// Add comments above each function for documentation.
