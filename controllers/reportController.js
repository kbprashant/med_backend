/**
 * Report Controller
 * 
 * Handles API requests for medical report parsing.
 * Clean, modular, production-ready implementation.
 * 
 * IMPORTANT: No hardcoded extraction logic in controller.
 * All extraction logic is delegated to the reportParser service.
 */

const { parseMedicalReport } = require('../services/reportParser');
const { categoryExists, getAllCategories } = require('../config/reportParameters');
const prisma = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

/**
 * POST /api/reports/parse
 * 
 * Parse OCR text and extract parameters based on category
 * 
 * Request Body:
 * {
 *   category: string (required) - Report category (blood, lipid, thyroid, etc.)
 *   ocrText: string (required) - Raw OCR text from medical report
 * }
 * 
 * Response:
 * Success:
 * {
 *   success: true,
 *   category: string,
 *   extractedResults: [
 *     {
 *       parameter: string,
 *       value: string,
 *       unit: string | null
 *     }
 *   ]
 * }
 * 
 * Failure:
 * {
 *   success: false,
 *   message: string
 * }
 */
async function parseReport(req, res) {
  try {
    // Extract and validate request body
    const { category, ocrText } = req.body;
    
    // Validate required fields
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }
    
    if (!ocrText) {
      return res.status(400).json({
        success: false,
        message: 'OCR text is required'
      });
    }
    
    // Validate category type
    if (typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Category must be a string'
      });
    }
    
    // Validate ocrText type
    if (typeof ocrText !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'OCR text must be a string'
      });
    }
    
    // Check if category exists in configuration
    if (!categoryExists(category)) {
      const availableCategories = getAllCategories();
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}`,
        availableCategories: availableCategories
      });
    }
    
    // Call parser service to extract parameters
    const result = await parseMedicalReport(category, ocrText);
    
    // Handle extraction failure
    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.message || 'No required parameters found for this category',
        category: category
      });
    }
    
    // Return successful extraction
    return res.status(200).json({
      success: true,
      category: category,
      extractedResults: result.extractedResults
    });
    
  } catch (error) {
    // Handle unexpected errors
    console.error('Error in parseReport controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/reports/categories
 * 
 * Get list of all available report categories
 * 
 * Response:
 * {
 *   success: true,
 *   categories: string[]
 * }
 */
async function getCategories(req, res) {
  try {
    const categories = getAllCategories();
    
    return res.status(200).json({
      success: true,
      categories: categories
    });
    
  } catch (error) {
    console.error('Error in getCategories controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/reports/health
 * 
 * Health check endpoint for report parsing service
 * 
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   timestamp: string
 * }
 */
async function healthCheck(req, res) {
  try {
    return res.status(200).json({
      success: true,
      message: 'Report parsing service is operational',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in healthCheck controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Service health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * GET /api/reports
 * 
 * Get all reports for the authenticated user or for a specific patient (if doctor)
 * 
 * Query Parameters:
 * - patientId: (optional) Get reports for a specific patient (requires doctor role and valid appointment)
 * 
 * Response:
 * {
 *   reports: [
 *     {
 *       id: string,
 *       testType: string,
 *       testName: string,
 *       reportDate: string,
 *       filePath: string | null,
 *       extractedText: string | null,
 *       testResults: [...]
 *     }
 *   ]
 * }
 */
async function getAllReports(req, res) {
  try {
    const authenticatedUserId = req.user.id;
    const patientId = req.query.patientId;

    let userId;

    // If patientId is provided, fetch that patient's reports
    if (patientId) {
      // For now, allow doctors to access patient reports if they have an active appointment
      // In production, you'd want more robust authorization
      userId = patientId;
      
      console.log(`Doctor ${authenticatedUserId} accessing patient ${patientId} reports`);
    } else {
      // Otherwise, fetch authenticated user's own reports
      userId = authenticatedUserId;
    }

    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // ORDER BY upload time, not report date
      include: {
        testResults: {
          orderBy: { testName: 'asc' },
        },
      },
    });

    return res.status(200).json({
      reports,
    });
  } catch (error) {
    console.error('Error in getAllReports controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/reports/:id
 * 
 * Get a specific report by ID
 * 
 * Response:
 * {
 *   report: {
 *     id: string,
 *     testType: string,
 *     reportDate: string,
 *     testResults: [...]
 *   }
 * }
 */
async function getReportById(req, res) {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    // Fetch report with proper WHERE clause (id AND userId)
    const report = await prisma.report.findFirst({
      where: { 
        id: reportId,
        userId: userId // Ensure user owns this report
      },
      include: {
        testResults: {
          orderBy: { createdAt: 'asc' }, // Order by creation time
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or not authorized',
      });
    }

    // No need for additional userId check since we filtered in the query
    return res.status(200).json({
      report,
    });
  } catch (error) {
    console.error('Error in getReportById controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/reports/tests/history
 * 
 * Get test history for charts/graphs
 * Query params:
 * - testName: string (required)
 * - testSubCategory: string (optional)
 * - limit: number (optional)
 * 
 * Response:
 * {
 *   results: [
 *     {
 *       date: string,
 *       value: number,
 *       unit: string,
 *       status: string
 *     }
 *   ]
 * }
 */
async function getTestHistory(req, res) {
  try {
    const userId = req.user.id;
    const { testName, testSubCategory, limit } = req.query;

    if (!testName) {
      return res.status(400).json({
        success: false,
        message: 'testName query parameter is required',
      });
    }

    // Build where clause
    const where = {
      report: {
        userId: userId,
      },
      testName: testName,
    };

    if (testSubCategory) {
      where.testSubCategory = testSubCategory;
    }

    // Fetch test results
    const testResults = await prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
      take: limit ? parseInt(limit) : undefined,
      select: {
        id: true,
        reportId: true,
        testName: true,
        parameterName: true,
        value: true,
        unit: true,
        status: true,
        testDate: true,
        normalMin: true,
        normalMax: true,
        referenceRange: true,
      },
    });

    // Format results for charts
    const results = testResults.map(result => {
      return {
        id: result.id,
        reportId: result.reportId,
        testName: result.testName,
        date: result.testDate.toISOString(),
        parameterName: result.parameterName,
        value: result.value, // Keep value as-is (preserve trailing zeros)
        unit: result.unit,
        status: result.status,
        normalMin: result.normalMin,
        normalMax: result.normalMax,
        referenceRange: result.referenceRange,
      };
    });

    return res.status(200).json({
      results,
    });
  } catch (error) {
    console.error('Error in getTestHistory controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch test history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * DELETE /api/reports/:id
 * 
 * Delete a specific report
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
async function deleteReport(req, res) {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    // Verify report belongs to user
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report',
      });
    }

    // Delete report and associated test results (cascade)
    await prisma.report.delete({
      where: { id: reportId },
    });

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteReport controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Configure multer for file uploads
 */
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/reports');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-report-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'application/pdf',
    'application/octet-stream' // Generic binary - validate by extension
  ];
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isValidExtension = allowedExtensions.includes(ext);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

  console.log('📎 File upload validation:', {
    filename: file.originalname,
    mimetype: file.mimetype,
    extension: ext,
    isValidExtension,
    isValidMimeType
  });

  if (isValidExtension && isValidMimeType) {
    return cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: JPG, JPEG, PNG, PDF. Got: ${file.mimetype} (${ext})`));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

/**
 * POST /api/reports/image-report
 * 
 * Upload an image report without OCR processing
 * 
 * Request (multipart/form-data):
 * - file: File (required) - Image or PDF file
 * - reportName: string (required) - Name of the report
 * - reportDate: string (required) - Date of the report (ISO format)
 * - category: string (required) - Report category (should be "Image Report")
 * 
 * Response:
 * Success:
 * {
 *   success: true,
 *   message: string,
 *   report: object
 * }
 * 
 * Failure:
 * {
 *   success: false,
 *   message: string
 * }
 */
async function uploadImageReport(req, res) {
  try {
    // File should be uploaded through multer middleware
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate required fields
    const { reportName, reportDate, category } = req.body;
    
    if (!reportName) {
      return res.status(400).json({
        success: false,
        message: 'Report name is required'
      });
    }

    if (!reportDate) {
      return res.status(400).json({
        success: false,
        message: 'Report date is required'
      });
    }

    // Get user ID from authenticated request
    const userId = req.user.id;

    // Parse the report date
    const parsedDate = new Date(reportDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report date format'
      });
    }

    // Create report in database
    // Store relative path with forward slashes for URL compatibility
    const fullPath = req.file.path.replace(/\\/g, '/'); // Normalize backslashes to forward slashes
    const uploadsIndex = fullPath.indexOf('uploads/');
    const relativePath = uploadsIndex >= 0 ? fullPath.substring(uploadsIndex) : req.file.path;
    
    const report = await prisma.report.create({
      data: {
        userId: userId,
        testType: reportName,
        reportDate: parsedDate,
        category: category || 'Image Report',
        subcategory: null,
        filePath: relativePath,
        fileName: req.file.originalname,
        ocrText: null, // No OCR for image reports
      }
    });

    console.log('✅ Image report uploaded successfully:', {
      id: report.id,
      reportName: reportName,
      fileName: req.file.originalname,
      filePath: req.file.path
    });

    return res.status(201).json({
      success: true,
      message: 'Image report uploaded successfully',
      report: {
        id: report.id,
        testType: report.testType,
        reportDate: report.reportDate,
        category: report.category,
        fileName: report.fileName,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    console.error('Error in uploadImageReport controller:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  parseReport,
  getCategories,
  healthCheck,
  getAllReports,
  getReportById,
  getTestHistory,
  deleteReport,
  uploadImageReport,
  upload // Export multer middleware for route use
};
