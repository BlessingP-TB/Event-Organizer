const { storage } = require('../configs/environment.config');
const { BlobServiceClient } = require('@azure/storage-blob');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

function sanitize(name) {
    return String(name).replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function buildS3Url(endpoint, region, bucket, key) {
    if (endpoint) {
        const base = endpoint.replace(/\/$/, '');
        return `${base}/${bucket}/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBuffer(buffer, filename, contentType) {
    if (storage.strategy !== 'BLOB') {
        throw new Error('Blob storage is not enabled');
    }
    const key = `${uuidv4()}-${sanitize(filename)}`;
    if (storage.blob.handler === 'azure') {
        const client = BlobServiceClient.fromConnectionString(storage.blob.azure.connectionString);
        const container = client.getContainerClient(storage.blob.azure.containerName);
        const blob = container.getBlockBlobClient(key);
        await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
        return { url: blob.url, key };
    }
    if (storage.blob.handler === 'aws') {
        const s3 = new S3Client({
            region: storage.blob.aws.region,
            endpoint: storage.blob.aws.endpoint,
            credentials: {
                accessKeyId: storage.blob.aws.accessKeyId,
                secretAccessKey: storage.blob.aws.secretAccessKey
            },
            forcePathStyle: !!storage.blob.aws.endpoint
        });
        await s3.send(
            new PutObjectCommand({
                Bucket: storage.blob.aws.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType
            })
        );
        const url = buildS3Url(storage.blob.aws.endpoint, storage.blob.aws.region, storage.blob.aws.bucket, key);
        return { url, key };
    }
    throw new Error('Unsupported blob handler');
}

module.exports = { uploadBuffer };
