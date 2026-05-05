const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config/app');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: config.aws.accessKeyId
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      }
    : undefined,
});

/**
 * Upload file buffer to S3
 */
const uploadToS3 = async (fileBuffer, originalName, folder = 'avatars') => {
  const ext = path.extname(originalName);
  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: `image/${ext.replace('.', '')}`,
  });

  await s3Client.send(command);
  return key;
};

/**
 * Get a signed URL for a private S3 object
 */
const getSignedS3Url = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Delete an object from S3
 */
const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
  });
  await s3Client.send(command);
};

module.exports = { uploadToS3, getSignedS3Url, deleteFromS3 };
