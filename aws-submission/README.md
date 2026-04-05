# AWS S3 & CloudFront Portfolio Submission

## Files Included
- `s3-cloudfront-policy.json`: IAM policy to restrict S3 access to CloudFront only.
- `s3-lifecycle-policy.json`: Example lifecycle rule to move old versions to Glacier after 30 days.
- `s3-script.js`: Node.js script to upload, retrieve, and delete objects in S3 (with comments).

## Instructions
1. Replace placeholders (YOUR_BUCKET_NAME, YOUR_REGION, etc.) in the files with your actual AWS values.
2. Use the AWS Console to:
   - Enable static website hosting, versioning, and lifecycle rules on your S3 bucket.
   - Attach the IAM policy to your S3 bucket.
   - Set up CloudFront with your S3 bucket as the origin.
3. Run `npm install @aws-sdk/client-s3` before using the script.
4. Demo the script in your video: upload, download, and delete a file.

## Video Checklist
- Show your website live via CloudFront URL.
- Show S3 bucket settings (static hosting, versioning, lifecycle).
- Show IAM policy attached to the bucket.
- Run the script and show results.

---

**Good luck with your submission!**