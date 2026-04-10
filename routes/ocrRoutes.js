const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processOCR } = require('../controllers/ocrController');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + random string + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'ocr-' + uniqueSuffix + ext);
  }
});

// File filter - Accept only image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  
  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check MIME type OR file extension (more lenient)
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, and PNG images are allowed'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/ocr
 * Upload an image and extract text using OCR
 * 
 * Request:
 *   - multipart/form-data
 *   - Field name: 'image'
 *   - Accepted formats: JPG, JPEG, PNG
 *   - Max size: 10MB
 * 
 * Response:
 *   {
 *     success: true,
 *     extractedText: "...",
 *     confidence: 85.5,
 *     metadata: {
 *       filename: "report.jpg",
 *       size: 1234567,
 *       mimeType: "image/jpeg"
 *     }
 *   }
 */
router.post('/', upload.single('image'), processOCR);

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must not exceed 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: error.message
    });
  } else if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file',
      message: error.message
    });
  }
  next();
});

module.exports = router;
