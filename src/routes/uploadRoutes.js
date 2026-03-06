const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { uploadMulterFile, deleteFile } = require('../services/azureBlobService');

// Configure multer for memory storage (we upload to Azure, not disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Allow images, PDFs, and common document types
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }
    },
});

/**
 * @route POST /api/uploads/single
 * @desc Upload a single file to Azure Blob Storage
 * @access Private
 */
router.post('/single', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided',
            });
        }

        const folder = req.body.folder || 'general';
        const result = await uploadMulterFile(req.file, folder);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: result.url,
                blobName: result.blobName,
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype,
            },
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'File upload failed',
        });
    }
});

/**
 * @route POST /api/uploads/multiple
 * @desc Upload multiple files to Azure Blob Storage
 * @access Private
 */
router.post('/multiple', authenticate, upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files provided',
            });
        }

        const folder = req.body.folder || 'general';
        const results = await Promise.all(
            req.files.map((file) => uploadMulterFile(file, folder))
        );

        const uploadedFiles = results.map((result, index) => ({
            url: result.url,
            blobName: result.blobName,
            originalName: req.files[index].originalname,
            size: req.files[index].size,
            mimeType: req.files[index].mimetype,
        }));

        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            data: uploadedFiles,
        });
    } catch (error) {
        console.error('Multiple file upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'File upload failed',
        });
    }
});

/**
 * @route DELETE /api/uploads/*blobName
 * @desc Delete a file from Azure Blob Storage
 * @access Private
 */
router.delete('/*blobName', authenticate, async (req, res) => {
    try {
        const param = req.params.blobName;
        const blobName = Array.isArray(param) ? param.join('/') : param;

        const deleted = await deleteFile(blobName);

        if (deleted) {
            res.json({
                success: true,
                message: 'File deleted successfully',
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'File not found or could not be deleted',
            });
        }
    } catch (error) {
        console.error('File delete error:', error);
        res.status(500).json({
            success: false,
            message: 'File deletion failed',
        });
    }
});

module.exports = router;
