/**
 * OCR Service - Handles text extraction from medical reports
 * This service processes images and PDFs to extract medical report data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class OcrService {
  /**
   * Process OCR text from medical report
   * @param {string} ocrText - Raw OCR text extracted from image/PDF
   * @returns {Object} Structured data extracted from OCR text
   */
  async processOcrText(ocrText) {
    if (!ocrText) {
      throw new Error('OCR text is required');
    }

    try {
      const extractedData = {
        reportDate: this.extractReportDate(ocrText),
        labCenter: this.extractLabCenter(ocrText),
        category: null,
        subcategory: null,
        testParameters: [],
      };

      // Classify report
      const classification = this.classifyReport(ocrText);
      extractedData.category = classification.category;
      extractedData.subcategory = classification.subcategory;

      // Extract test parameters (only for lab reports)
      if (classification.category === 'Lab Reports') {
        extractedData.testParameters = this.extractTestParameters(ocrText, classification.subcategory);
      }

      return extractedData;
    } catch (error) {
      console.error('Error processing OCR text:', error);
      throw error;
    }
  }

  /**
   * Extract report date from OCR text
   */
  extractReportDate(text) {
    // Date patterns to match
    const patterns = [
      /(?:date|report date|test date)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(?:date|report date|test date)[:\s]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseDate(match[1] || match[0]);
      }
    }

    return new Date(); // Default to current date if not found
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateString) {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Extract lab/scan center name from OCR text
   */
  extractLabCenter(text) {
    const lines = text.split('\n');
    // Usually lab name is in the first few lines
    const potentialNames = [];
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && line.length < 100) {
        // Check if line contains common lab/hospital keywords
        if (this.isLikelyLabName(line)) {
          potentialNames.push(line);
        }
      }
    }

    return potentialNames.length > 0 ? potentialNames[0] : 'Unknown Lab';
  }

  /**
   * Check if text is likely a lab/center name
   */
  isLikelyLabName(text) {
    const keywords = [
      'lab', 'laboratory', 'diagnostics', 'hospital', 'clinic',
      'medical', 'health', 'pathology', 'imaging', 'scan', 'center', 'centre'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Classify report into category and subcategory
   */
  classifyReport(text) {
    const lowerText = text.toLowerCase();

    // Lab Reports Classification
    const labPatterns = {
      'Blood Tests': [
        'hemoglobin', 'hb', 'rbc', 'wbc', 'platelet', 'blood count', 'cbc', 
        'complete blood', 'hematocrit', 'mcv', 'mch', 'rdw'
      ],
      'Urine Tests': [
        'urine', 'urinalysis', 'albumin', 'creatinine clearance', 'microalbumin',
        'urine culture', 'urinary'
      ],
      'Liver Function Tests': [
        'liver', 'lft', 'sgot', 'sgpt', 'alt', 'ast', 'alkaline phosphatase',
        'alp', 'bilirubin', 'total bilirubin', 'direct bilirubin'
      ],
      'Kidney / Renal Tests': [
        'kidney', 'renal', 'kft', 'urea', 'creatinine', 'uric acid',
        'blood urea nitrogen', 'bun', 'egfr'
      ],
      'Thyroid Tests': [
        'thyroid', 'tsh', 't3', 't4', 'free t3', 'free t4', 'total t3',
        'total t4', 'thyroid stimulating'
      ],
      'Heart / Cardiac Tests': [
        'cardiac', 'heart', 'troponin', 'cpk', 'cpk-mb', 'ck-mb', 'ldh',
        'lipid', 'cholesterol', 'triglyceride', 'hdl', 'ldl', 'vldl'
      ],
      'Hormone Tests': [
        'hormone', 'testosterone', 'estrogen', 'progesterone', 'prolactin',
        'cortisol', 'lh', 'fsh', 'growth hormone'
      ],
      'Diabetes Tests': [
        'diabetes', 'glucose', 'blood sugar', 'hba1c', 'fasting blood sugar',
        'fbs', 'ppbs', 'random blood sugar', 'insulin'
      ],
      'Vitamin & Deficiency Tests': [
        'vitamin', 'vit d', 'vitamin d', 'vitamin b12', 'b12', 'folate',
        'folic acid', 'iron', 'ferritin', 'calcium', 'magnesium'
      ],
      'Infection & Immunity Tests': [
        'infection', 'covid', 'hiv', 'hepatitis', 'antibody', 'antigen',
        'immunity', 'igm', 'igg', 'crp', 'esr', 'widal'
      ],
      'Cancer Markers': [
        'cancer', 'tumor', 'ca 125', 'cea', 'psa', 'afp', 'ca 19-9',
        'marker', 'oncology'
      ],
    };

    // Imaging Reports Classification
    const imagingPatterns = {
      'X-Ray': ['x-ray', 'xray', 'radiograph', 'chest x-ray', 'skeletal'],
      'CT Scan': ['ct scan', 'computed tomography', 'cat scan'],
      'MRI': ['mri', 'magnetic resonance', 'mr imaging'],
      'Ultrasound': ['ultrasound', 'sonography', 'usg', 'doppler'],
      'ECG / ECHO': ['ecg', 'ekg', 'electrocardiogram', 'echo', 'echocardiogram', 'tmt'],
      'Mammography': ['mammography', 'mammogram', 'breast imaging'],
      'PET Scan': ['pet scan', 'pet-ct', 'positron emission'],
    };

    // Check Lab Reports
    for (const [subcategory, keywords] of Object.entries(labPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return { category: 'Lab Reports', subcategory };
      }
    }

    // Check Imaging Reports
    for (const [subcategory, keywords] of Object.entries(imagingPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return { category: 'Imaging Reports', subcategory };
      }
    }

    // Default to Lab Reports - Blood Tests if no match
    return { category: 'Lab Reports', subcategory: 'Blood Tests' };
  }

  /**
   * Extract test parameters from OCR text
   */
  extractTestParameters(text, subcategory) {
    const parameters = [];
    const lines = text.split('\n');

    // Common parameter patterns
    const parameterPatterns = [
      // Pattern: Parameter Name <spaces/tabs> Value <spaces/tabs> Unit [Reference Range]
      /^([A-Za-z\s\(\)\/\-]+?)\s{2,}([\d\.\,]+)\s+([A-Za-z\/%]+)?(?:\s+(.+))?$/,
      // Pattern: Parameter: Value Unit
      /^([A-Za-z\s\(\)\/\-]+?):\s*([\d\.\,]+)\s*([A-Za-z\/%]+)?/,
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      for (const pattern of parameterPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const parameterName = match[1].trim();
          const value = match[2].replace(',', '.');
          const unit = match[3] ? match[3].trim() : null;
          const referenceRange = match[4] ? match[4].trim() : null;

          // Filter out non-parameter lines
          if (this.isValidParameter(parameterName)) {
            parameters.push({
              parameterName,
              value,
              unit,
              referenceRange,
              status: this.determineStatus(value, referenceRange),
            });
          }
        }
      }
    }

    return parameters.length > 0 ? parameters : this.getDefaultParameters(subcategory);
  }

  /**
   * Check if extracted text is a valid parameter name
   */
  isValidParameter(text) {
    // Must be between 3-50 characters
    if (text.length < 3 || text.length > 50) return false;
    
    // Should not contain these keywords (common headers/labels)
    const excludeKeywords = [
      'test', 'report', 'date', 'patient', 'name', 'age', 'gender',
      'doctor', 'ref', 'lab', 'page', 'specimen', 'collected'
    ];
    
    const lowerText = text.toLowerCase();
    return !excludeKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Determine test status based on value and reference range
   */
  determineStatus(value, referenceRange) {
    if (!referenceRange) return 'NORMAL';

    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 'NORMAL';

      // Parse reference range (e.g., "12-16" or "< 10" or "> 5")
      const rangeMatch = referenceRange.match(/([\d\.]+)\s*[-–]\s*([\d\.]+)/);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        
        if (numValue < min) return 'LOW';
        if (numValue > max) return 'HIGH';
        return 'NORMAL';
      }

      // Handle "<" or ">" ranges
      const lessThanMatch = referenceRange.match(/[<≤]\s*([\d\.]+)/);
      if (lessThanMatch) {
        const threshold = parseFloat(lessThanMatch[1]);
        return numValue <= threshold ? 'NORMAL' : 'HIGH';
      }

      const greaterThanMatch = referenceRange.match(/[>≥]\s*([\d\.]+)/);
      if (greaterThanMatch) {
        const threshold = parseFloat(greaterThanMatch[1]);
        return numValue >= threshold ? 'NORMAL' : 'LOW';
      }

      return 'NORMAL';
    } catch (error) {
      return 'NORMAL';
    }
  }

  /**
   * Get default parameters for subcategory (when extraction fails)
   */
  getDefaultParameters(subcategory) {
    const defaults = {
      'Blood Tests': [
        { parameterName: 'Hemoglobin', unit: 'g/dL' },
        { parameterName: 'RBC Count', unit: 'million/µL' },
        { parameterName: 'WBC Count', unit: 'cells/µL' },
        { parameterName: 'Platelets', unit: 'lakhs/µL' },
      ],
      'Thyroid Tests': [
        { parameterName: 'TSH', unit: 'µIU/mL' },
        { parameterName: 'T3', unit: 'ng/dL' },
        { parameterName: 'T4', unit: 'µg/dL' },
      ],
      'Diabetes Tests': [
        { parameterName: 'Fasting Blood Sugar', unit: 'mg/dL' },
        { parameterName: 'HbA1c', unit: '%' },
      ],
    };

    return defaults[subcategory] || [];
  }

  /**
   * Find or create lab center in database
   */
  async findOrCreateLabCenter(centerName, type = 'lab') {
    try {
      // Check if center exists
      let center = await prisma.labCenter.findFirst({
        where: { centerName: { contains: centerName, mode: 'insensitive' } }
      });

      if (!center) {
        // Create new center
        center = await prisma.labCenter.create({
          data: {
            centerName,
            type,
          }
        });
      }

      return center;
    } catch (error) {
      console.error('Error finding/creating lab center:', error);
      return null;
    }
  }
}

module.exports = new OcrService();
