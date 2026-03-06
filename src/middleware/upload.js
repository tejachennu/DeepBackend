/**
 * Shared upload middleware using Azure Blob Storage
 * Replaces all local disk multer storage with Azure Blob uploads
 */
const multer = require('multer');
const path = require('path');
const { uploadMulterFile } = require('../services/azureBlobService');

// Memory storage - files go to buffer, then upload to Azure
const memoryStorage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
    if (extname || mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
};

// File filter for videos  
const videoFilter = (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
        return cb(null, true);
    }
    cb(new Error('Only video files are allowed'));
};

// File filter for bills (images + PDF)
const billFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
        return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed'));
};

// File filter for documents
const documentFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
        return cb(null, true);
    }
    cb(new Error('Only image, PDF, and document files are allowed'));
};

// Pre-configured multer instances
const imageUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: imageFilter,
});

const videoUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: videoFilter,
});

const billUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: billFilter,
});

const documentUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: documentFilter,
});

const bannerUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter,
});

/**
 * Middleware: Upload a single file to Azure after multer processes it
 * Usage: azureUploadSingle('fieldName', 'folderName')
 * Adds req.azureFile = { url, blobName, originalName, size, mimeType }
 */
const azureUploadSingle = (folder) => {
    return async (req, res, next) => {
        try {
            if (req.file) {
                const result = await uploadMulterFile(req.file, folder);
                req.azureFile = {
                    url: result.url,
                    blobName: result.blobName,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimeType: req.file.mimetype,
                };
                // Also set the file path to the Azure URL for backward compatibility
                req.file.path = result.url;
                req.file.filename = result.blobName;
            }
            next();
        } catch (error) {
            console.error('Azure upload error:', error);
            next(error);
        }
    };
};

/**
 * Middleware: Upload multiple files to Azure after multer processes them
 * Adds req.azureFiles = [{ url, blobName, originalName, size, mimeType }]
 */
const azureUploadMultiple = (folder) => {
    return async (req, res, next) => {
        try {
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map((file) => uploadMulterFile(file, folder));
                const results = await Promise.all(uploadPromises);
                req.azureFiles = results.map((result, index) => ({
                    url: result.url,
                    blobName: result.blobName,
                    originalName: req.files[index].originalname,
                    size: req.files[index].size,
                    mimeType: req.files[index].mimetype,
                }));
                // Also update file paths for backward compatibility
                req.files.forEach((file, index) => {
                    file.path = results[index].url;
                    file.filename = results[index].blobName;
                });
            }
            next();
        } catch (error) {
            console.error('Azure upload error:', error);
            next(error);
        }
    };
};

module.exports = {
    imageUpload,
    videoUpload,
    billUpload,
    documentUpload,
    bannerUpload,
    azureUploadSingle,
    azureUploadMultiple,
};
