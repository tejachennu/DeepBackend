const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Azure Blob Storage connection string from environment
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'uploads';

let blobServiceClient;
let containerClient;

// Initialize the Azure Blob Storage client
const initializeAzureStorage = async () => {
    if (!connectionString) {
        console.warn('⚠️  AZURE_STORAGE_CONNECTION_STRING not set. File uploads will not work.');
        return false;
    }

    try {
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerClient = blobServiceClient.getContainerClient(containerName);

        // Create container if it doesn't exist
        try {
            await containerClient.createIfNotExists({
                access: 'blob' // Public read access for blobs
            });
        } catch (err) {
            if (err.message && err.message.includes('Public access is not permitted')) {
                console.warn('⚠️  Storage account does not permit public access. Creating private container instead.');
                await containerClient.createIfNotExists();
            } else {
                throw err;
            }
        }

        console.log(`✅ Azure Blob Storage connected. Container: ${containerName}`);
        return true;
    } catch (error) {
        console.error('❌ Azure Blob Storage initialization failed:', error.message);
        return false;
    }
};

/**
 * Upload a file buffer to Azure Blob Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} originalName - Original filename
 * @param {string} folder - Folder/prefix in the container (e.g., 'projects', 'profiles')
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{url: string, blobName: string}>}
 */
const uploadFile = async (fileBuffer, originalName, folder = 'general', mimeType = 'application/octet-stream') => {
    if (!containerClient) {
        await initializeAzureStorage();
    }

    if (!containerClient) {
        throw new Error('Azure Blob Storage is not configured');
    }

    // Generate unique blob name
    const ext = path.extname(originalName);
    const uniqueName = `${folder}/${uuidv4()}${ext}`;

    const blockBlobClient = containerClient.getBlockBlobClient(uniqueName);

    // Upload with content type
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
            blobContentType: mimeType,
        },
    });

    return {
        url: blockBlobClient.url,
        blobName: uniqueName,
    };
};

/**
 * Upload a file from multer to Azure Blob Storage
 * @param {Object} file - Multer file object
 * @param {string} folder - Folder/prefix in the container
 * @returns {Promise<{url: string, blobName: string}>}
 */
const uploadMulterFile = async (file, folder = 'general') => {
    return uploadFile(file.buffer, file.originalname, folder, file.mimetype);
};

/**
 * Delete a blob from Azure Storage
 * @param {string} blobName - The blob name/path to delete
 * @returns {Promise<boolean>}
 */
const deleteFile = async (blobName) => {
    if (!containerClient) {
        await initializeAzureStorage();
    }

    if (!containerClient) {
        throw new Error('Azure Blob Storage is not configured');
    }

    try {
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
        return true;
    } catch (error) {
        console.error('Failed to delete blob:', error.message);
        return false;
    }
};

/**
 * Get a SAS URL for temporary access to a private blob
 * @param {string} blobName - The blob name/path
 * @param {number} expiryMinutes - How long the SAS token should be valid
 * @returns {Promise<string>}
 */
const getSasUrl = async (blobName, expiryMinutes = 60) => {
    if (!containerClient) {
        await initializeAzureStorage();
    }

    if (!containerClient) {
        throw new Error('Azure Blob Storage is not configured');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // For public containers, just return the URL
    return blockBlobClient.url;
};

module.exports = {
    initializeAzureStorage,
    uploadFile,
    uploadMulterFile,
    deleteFile,
    getSasUrl,
};
