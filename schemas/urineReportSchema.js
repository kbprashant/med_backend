/**
 * URINE REPORT DATABASE SCHEMA
 * 
 * Flexible schema to handle all types of urine analysis reports
 * Supports both qualitative (Absent, Trace, Normal) and quantitative (numeric) values
 */

const mongoose = require('mongoose');

// Sub-schema for individual parameters with flexible value types
const UrineParameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Value can be qualitative (Absent, Trace, Normal) or quantitative (1.011, 5-10)
  value: {
    type: mongoose.Schema.Types.Mixed, // String, Number, or null
    default: null
  },
  // Qualitative description (Absent, Trace, Few, Moderate, Many, Normal)
  qualitative: {
    type: String,
    enum: [
      'Absent', 'Nil', 'Negative', 'Not Detected', 'ND',
      'Trace', 'Trace +', '+', '1+',
      'Few', 'Few Seen', 'Rare',
      'Moderate', '2+', '++',
      'Many', 'Plenty', '3+', '+++', '4+', '++++',
      'Normal', 'Clear', 'Transparent', 'Present',
      'Acidic', 'Alkaline', 'Neutral',
      'Yellow', 'Yellowish', 'Pale Yellow', 'Dark Yellow', 'Amber', 'Straw',
      'Turbid', 'Cloudy', 'Slightly Turbid', 'Hazy',
      'Other'
    ],
    default: null
  },
  // Numeric value (for Specific Gravity, pH ranges, cell counts)
  numericValue: {
    type: Number,
    default: null
  },
  // Range for cell counts (e.g., "5-10 cells/hpf")
  range: {
    min: { type: Number, default: null },
    max: { type: Number, default: null }
  },
  unit: {
    type: String,
    default: '',
    trim: true
  },
  // Standard/Reference range
  referenceRange: {
    type: String,
    default: null
  },
  // Whether the value is abnormal
  isAbnormal: {
    type: Boolean,
    default: false
  },
  // Confidence score from extraction
  confidence: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  }
}, { _id: false });

const UrineReportSchema = new mongoose.Schema({
  // Report metadata
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  labName: {
    type: String,
    default: ''
  },
  
  // PHYSICAL EXAMINATION
  physical: {
    quantity: UrineParameterSchema,
    color: UrineParameterSchema,
    colour: UrineParameterSchema, // Alternative spelling
    appearance: UrineParameterSchema,
    turbidity: UrineParameterSchema,
    deposit: UrineParameterSchema,
    odor: UrineParameterSchema,
    odour: UrineParameterSchema // Alternative spelling
  },
  
  // CHEMICAL EXAMINATION
  chemical: {
    pH: UrineParameterSchema,
    specificGravity: UrineParameterSchema,
    protein: UrineParameterSchema,
    proteins: UrineParameterSchema, // Alternative plural
    albumin: UrineParameterSchema,
    sugar: UrineParameterSchema,
    glucose: UrineParameterSchema, // Alternative name
    ketone: UrineParameterSchema,
    ketones: UrineParameterSchema, // Alternative plural
    acetoneBodies: UrineParameterSchema,
    bilePigment: UrineParameterSchema,
    bilirubin: UrineParameterSchema, // Alternative name
    bileSalts: UrineParameterSchema,
    urobilinogen: UrineParameterSchema,
    occultBlood: UrineParameterSchema,
    blood: UrineParameterSchema, // Alternative name
    nitrite: UrineParameterSchema,
    nitrites: UrineParameterSchema, // Alternative plural
    leukocyteEsterase: UrineParameterSchema,
    leukocytes: UrineParameterSchema // Alternative name
  },
  
  // MICROSCOPIC EXAMINATION
  microscopic: {
    pusCells: UrineParameterSchema,
    pusCell: UrineParameterSchema, // Alternative singular
    whiteCells: UrineParameterSchema, // Alternative name
    wbc: UrineParameterSchema,
    epithelialCells: UrineParameterSchema,
    epithelialCell: UrineParameterSchema, // Alternative singular
    redBloodCells: UrineParameterSchema,
    redBloodCell: UrineParameterSchema, // Alternative singular
    rbc: UrineParameterSchema,
    casts: UrineParameterSchema,
    cast: UrineParameterSchema, // Alternative singular
    hyalineCasts: UrineParameterSchema,
    granularCasts: UrineParameterSchema,
    rbcCasts: UrineParameterSchema,
    wbcCasts: UrineParameterSchema,
    crystals: UrineParameterSchema,
    crystal: UrineParameterSchema, // Alternative singular
    calciumOxalate: UrineParameterSchema,
    uricAcid: UrineParameterSchema,
    triplephosphate: UrineParameterSchema,
    bacteria: UrineParameterSchema,
    yeast: UrineParameterSchema,
    mucus: UrineParameterSchema,
    spermCells: UrineParameterSchema,
    trichomonas: UrineParameterSchema
  },
  
  // Additional/Custom parameters (for unknown or lab-specific parameters)
  additionalParameters: [UrineParameterSchema],
  
  // Raw OCR text for reference
  rawOcrText: {
    type: String,
    default: ''
  },
  
  // Extraction metadata
  extractionMetadata: {
    method: {
      type: String,
      enum: ['OCR', 'Manual', 'API', 'Upload'],
      default: 'OCR'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    extractedAt: {
      type: Date,
      default: Date.now
    },
    processingTimeMs: {
      type: Number,
      default: 0
    }
  },
  
  // Clinical notes
  notes: {
    type: String,
    default: ''
  },
  interpretation: {
    type: String,
    default: ''
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'urine_reports'
});

// Indexes for efficient querying
UrineReportSchema.index({ userId: 1, reportDate: -1 });
UrineReportSchema.index({ reportId: 1 });
UrineReportSchema.index({ createdAt: -1 });

// Virtual for getting all non-null parameters
UrineReportSchema.virtual('allParameters').get(function() {
  const params = [];
  
  const addParams = (section, sectionName) => {
    if (section) {
      Object.keys(section).forEach(key => {
        if (section[key] && section[key].value !== null) {
          params.push({
            section: sectionName,
            ...section[key].toObject()
          });
        }
      });
    }
  };
  
  addParams(this.physical, 'Physical');
  addParams(this.chemical, 'Chemical');
  addParams(this.microscopic, 'Microscopic');
  
  if (this.additionalParameters) {
    this.additionalParameters.forEach(param => {
      params.push({
        section: 'Additional',
        ...param.toObject()
      });
    });
  }
  
  return params;
});

// Method to get summary of abnormal findings
UrineReportSchema.methods.getAbnormalFindings = function() {
  const abnormal = [];
  
  const checkSection = (section) => {
    if (section) {
      Object.entries(section).forEach(([key, param]) => {
        if (param && param.isAbnormal) {
          abnormal.push({
            parameter: param.name,
            value: param.value,
            qualitative: param.qualitative,
            numericValue: param.numericValue
          });
        }
      });
    }
  };
  
  checkSection(this.physical);
  checkSection(this.chemical);
  checkSection(this.microscopic);
  
  if (this.additionalParameters) {
    this.additionalParameters.forEach(param => {
      if (param.isAbnormal) {
        abnormal.push({
          parameter: param.name,
          value: param.value,
          qualitative: param.qualitative,
          numericValue: param.numericValue
        });
      }
    });
  }
  
  return abnormal;
};

module.exports = mongoose.model('UrineReport', UrineReportSchema);
