const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const pdfPoppler = require('pdf-poppler');

// pdf-parse - handle both default and direct exports
// Some Node.js versions require { default: function }, others just function
const pdfParseModule = require('pdf-parse');
const pdf = pdfParseModule.default || pdfParseModule;

/**
 * OCR Controller - Handles image upload and text extraction
 * Uses Tesseract.js for OCR processing with Sharp for image optimization
 */

// Image processing constants
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const JPEG_QUALITY = 85;

/**
 * Run OCR on image files only
 * @param {string} imagePath - Path to image file (PNG/JPG)
 * @param {boolean} skipPreprocessing - Skip preprocessing (for already converted images)
 * @returns {Promise<string>} Extracted text from image
 */
async function runOcrOnImage(imagePath, skipPreprocessing = false) {
  try {
    console.log('🔍 Running OCR on image...');
    
    let textPath = imagePath;
    
    // Only preprocess if not skipped
    if (!skipPreprocessing) {
      // Preprocess image for better OCR accuracy
      textPath = await preprocessImage(imagePath);
    } else {
      console.log('   ⚠️  Skipping preprocessing (using pre-converted image)');
    }
    
    // Perform OCR using Tesseract.js ONLY on images
    const { data } = await Tesseract.recognize(
      textPath,
      'eng', // Language (English)
      {
        logger: (info) => {
          // Log progress
          if (info.status === 'recognizing text') {
            console.log(`   OCR Progress: ${(info.progress * 100).toFixed(0)}%`);
          }
        },
        // Tesseract configuration for better accuracy
        tessedit_ocr_engine_mode: 2, // Use LSTM + Legacy engine (best accuracy)
        tessedit_pageseg_mode: 6,    // Assume uniform block of text (best for lab reports)
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()/-:[] \n\r\t',
        preserve_interword_spaces: '1' // Preserve spacing between words
      }
    );
    
    // Clean up processed file
    try {
      if (textPath && textPath !== imagePath) {
        await fs.unlink(textPath);
      }
    } catch (e) {
      console.warn('Could not delete processed file:', e.message);
    }
    
    return data.text.trim();
    
  } catch (error) {
    console.error('❌ OCR error:', error.message);
    throw new Error(`Failed to process image with OCR: ${error.message}`);
  }
}

/**
 * Convert PDF to PNG images and run OCR
 * MANDATORY for scanned PDFs - converts each page to image before OCR
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<string>} Combined text from all pages
 */
async function convertAndRunOCR(pdfPath) {
  let tempDir = null;
  const convertedImages = [];
  
  try {
    console.log('📄 Converting scanned PDF to images for OCR...');
    
    // Create temporary directory for converted images
    tempDir = path.join(__dirname, '../temp/pdf_convert_' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`   📁 Temp directory: ${tempDir}`);
    
    // PDF to PNG conversion options
    const opts = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'page',
      page: null // Convert all pages
    };
    
    // Convert PDF pages to PNG images
    await pdfPoppler.convert(pdfPath, opts);
    console.log('   ✅ PDF converted to PNG images');
    
    // Read all converted PNG files
    const files = await fs.readdir(tempDir);
    const pngFiles = files
      .filter(f => f.endsWith('.png'))
      .sort(); // Sort by page number
    
    console.log(`   📸 Found ${pngFiles.length} page(s) converted to images`);
    
    if (pngFiles.length === 0) {
      throw new Error('No PNG images generated from PDF');
    }
    
    // Run OCR on each converted image
    console.log('🔍 Running OCR on converted images...');
    let combinedText = '';
    
    for (let i = 0; i < pngFiles.length; i++) {
      const imagePath = path.join(tempDir, pngFiles[i]);
      convertedImages.push(imagePath);
      
      console.log(`   📄 Processing page ${i + 1}/${pngFiles.length}`);
      
      // Run OCR (skip preprocessing since image is already generated from PDF)
      const pageText = await runOcrOnImage(imagePath, true);
      combinedText += pageText + '\n';
    }
    
    console.log(`✅ OCR completed. Extracted ${combinedText.length} characters from ${pngFiles.length} page(s)`);
    return combinedText.trim();
    
  } catch (error) {
    console.error('❌ PDF to OCR conversion error:', error.message);
    throw new Error(`Failed to convert and OCR scanned PDF: ${error.message}`);
  } finally {
    // Clean up temporary directory and images
    try {
      if (tempDir) {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file));
        }
        await fs.rmdir(tempDir);
        console.log('   🗑️  Cleaned up temporary files');
      }
    } catch (cleanupError) {
      console.warn('⚠️  Could not fully clean up temp directory:', cleanupError.message);
    }
  }
}

/**
 * Extract text from PDF file
 * Strategy:
 * 1. Try direct text extraction using pdf-parse (for text-based PDFs)
 * 2. If text < 50 chars, treat as scanned PDF and convert to images → OCR
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<string>} Extracted text from PDF
 */
async function extractPdfText(pdfPath) {
  try {
    console.log('📄 Attempting direct text extraction from PDF...');
    
    // Read the PDF file as buffer
    const dataBuffer = await fs.readFile(pdfPath);
    
    // Try to parse PDF and extract text using pdf-parse
    const data = await pdf(dataBuffer);
    
    console.log(`   📑 PDF has ${data.numpages} page(s)`);
    console.log(`   ✓ Extracted ${data.text.length} characters`);
    
    // Check if we got meaningful text (text-based PDF)
    const textLength = data.text.trim().length;
    if (textLength >= 50) {
      // Good quality text extraction - return it
      console.log('✅ Text-based PDF: Direct extraction successful');
      return data.text.trim();
    }
    
    // Very little text extracted - likely a scanned PDF
    console.log(`⚠️  Very little text extracted (${textLength} chars < 50 threshold)`);
    console.log('   → Treating as scanned PDF, converting to images for OCR...');
    
    // Fall back to PDF → Image → OCR pipeline
    const ocrText = await convertAndRunOCR(pdfPath);
    console.log('✅ Scanned PDF: OCR conversion successful');
    return ocrText;
    
  } catch (directError) {
    // If direct extraction fails, assume it's a scanned PDF
    console.log('⚠️  Direct text extraction failed:', directError.message);
    console.log('   → Falling back to PDF → Image → OCR conversion...');
    
    try {
      const ocrText = await convertAndRunOCR(pdfPath);
      console.log('✅ Scanned PDF: OCR conversion successful');
      return ocrText;
    } catch (conversionError) {
      console.error('❌ Both text extraction and OCR conversion failed');
      console.error('   - Direct extraction error:', directError.message);
      console.error('   - OCR conversion error:', conversionError.message);
      throw new Error(
        `Failed to extract text from PDF: ${directError.message} | Fallback also failed: ${conversionError.message}`
      );
    }
  }
}

/**
 * Preprocess image for better OCR accuracy
 * Balanced approach: good accuracy without losing text
 */
async function preprocessImage(inputPath) {
  const outputPath = inputPath.replace(/(\.[\w\d_-]+)$/i, '_processed$1');
  
  try {
    console.log('🖼️  Starting image preprocessing...');
    const startTime = Date.now();

    // Load image metadata first
    const metadata = await sharp(inputPath).metadata();
    console.log(`   📐 Original: ${metadata.width}x${metadata.height} (${metadata.format})`);

    // Build processing pipeline
    let pipeline = sharp(inputPath);

    // Resize to high resolution for better digit recognition
    const TARGET_WIDTH = 3000;  // Higher resolution for clearer digits
    const TARGET_HEIGHT = 4000;
    
    // Always upscale if smaller to ensure high quality
    pipeline = pipeline.resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false, // Allow upscaling
      kernel: sharp.kernel.lanczos3 // High-quality resampling
    });
    console.log(`   ✓ Resizing to ${TARGET_WIDTH}x${TARGET_HEIGHT}`);

    // Optimized preprocessing for medical report OCR
    pipeline = pipeline
      .greyscale() // Convert to grayscale
      .normalize() // Auto-adjust brightness/contrast
      .sharpen({ sigma: 1.5 }) // Sharpen for clearer text edges
      .threshold(140); // Binary threshold for clear black/white text

    // Save as high-quality PNG (lossless)
    const pngPath = outputPath.replace(/\.(jpg|jpeg)$/i, '.png');
    await pipeline.png({ 
      compressionLevel: 6,
      quality: 100
    }).toFile(pngPath);

    const duration = Date.now() - startTime;
    const stats = await fs.stat(pngPath);
    console.log(`✅ Preprocessing completed in ${duration}ms`);
    console.log(`   📁 Processed file: ${path.basename(pngPath)}`);
    console.log(`   📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);

    return pngPath;
  } catch (error) {
    console.error('❌ Preprocessing error:', error.message);
    // Return original path if preprocessing fails
    return inputPath;
  }
}

/**
 * Process uploaded image and extract text using OCR
 * POST /api/ocr
 */
const processOCR = async (req, res) => {
  let filePath = null;
  let processedPath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    console.log(`Processing OCR for file: ${req.file.filename}`);
    console.log(`File size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`File type: ${fileExtension}`);

    let extractedText = '';
    let confidence = 0;
    let processedPath = null;

    // Check if file is PDF - try text extraction with OCR fallback
    if (fileExtension === '.pdf') {
      try {
        extractedText = await extractPdfText(filePath);
        confidence = 0.95; // High confidence (text extraction or OCR)
        
        console.log('✅ PDF text extraction successful');
        
        try {
          await fs.unlink(req.file.path);
          console.log('Temporary file deleted');
        } catch (e) {
          console.warn('Could not delete temporary file:', e.message);
        }

        return res.json({
          success: true,
          extractedText: extractedText.trim(),
          confidence: confidence,
          metadata: {
            filename: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            fileType: 'pdf',
            extractionMethod: 'direct_or_ocr'
          }
        });
        
      } catch (pdfError) {
        // Clean up
        try {
          await fs.unlink(req.file.path);
        } catch (e) {
          // ignore
        }
        
        console.error('❌ PDF processing failed:', pdfError.message);
        return res.status(400).json({
          success: false,
          error: 'PDF processing failed',
          message: pdfError.message,
          fileType: 'pdf'
        });
      }
    }

    // For image files, use Tesseract OCR pipeline
    // Preprocess image for better OCR
    processedPath = await preprocessImage(filePath);

    // Perform OCR using Tesseract.js on preprocessed image
    const { data } = await Tesseract.recognize(
      processedPath,
      'eng', // Language (English)
      {
        logger: (info) => {
          // Log progress (optional, can be removed in production)
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${(info.progress * 100).toFixed(0)}%`);
          }
        },
        // Tesseract configuration for better accuracy
        tessedit_ocr_engine_mode: 2, // Use LSTM + Legacy engine (best accuracy)
        tessedit_pageseg_mode: 6,    // Assume uniform block of text (best for lab reports)
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()/-:[] \n\r\t',
        preserve_interword_spaces: '1' // Preserve spacing between words
      }
    );

    // Extract the recognized text
    extractedText = data.text.trim();

    console.log(`OCR completed. Extracted ${extractedText.length} characters`);

    // Clean up: Delete temporary files
    try {
      if (filePath) await fs.unlink(req.file.path);
      if (processedPath && processedPath !== req.file?.path) await fs.unlink(processedPath);
      console.log(`Temporary files deleted`);
    } catch (unlinkError) {
      console.error('Error deleting temporary file:', unlinkError.message);
      // Don't fail the request if file deletion fails
    }

    // Return success response with extracted text
    return res.json({
      success: true,
      extractedText: extractedText,
      confidence: data.confidence,
      metadata: {
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        fileType: fileExtension.substring(1) // Remove the dot
      }
    });

  } catch (error) {
    console.error('OCR Processing Error:', error);

    // Clean up files in case of error
    try {
      if (req.file?.path) await fs.unlink(req.file.path);
      if (processedPath && processedPath !== req.file?.path) await fs.unlink(processedPath);
      console.log('Temporary files cleaned up after error');
    } catch (unlinkError) {
      console.error('Error cleaning up files:', unlinkError.message);
    }

    // Return error response
    return res.status(500).json({
      success: false,
      error: 'Failed to process image',
      message: error.message
    });
  }
};

module.exports = {
  processOCR,
  extractPdfText,
  convertAndRunOCR,
  runOcrOnImage,
  preprocessImage
};
