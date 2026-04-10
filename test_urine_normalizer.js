/**
 * Test Urine Report Normalizer
 * 
 * Demonstrates how to use the normalizer with raw extracted data
 */

const urineNormalizer = require('./services/urineReportNormalizer');

console.log('='.repeat(70));
console.log('🧪 TESTING URINE REPORT NORMALIZER');
console.log('='.repeat(70));
console.log();

// Example 1: Array format (from OCR extractor)
console.log('📋 TEST 1: Array format (from SmartMedicalExtractor)');
console.log('-'.repeat(70));

const rawExtractedData1 = [
  { parameter: 'Quantity', value: '10 ml', unit: 'ml' },
  { parameter: 'Colour', value: 'Yellowish', unit: '' },
  { parameter: 'Appearance', value: 'Clear', unit: '' },
  { parameter: 'pH', value: 'Acidic', unit: '' },
  { parameter: 'Specific Gravity', value: 1.011, unit: '' },
  { parameter: 'Proteins', value: 'Absent', unit: '' },
  { parameter: 'Sugar', value: 'Absent', unit: '' },
  { parameter: 'Ketone', value: 'Absent', unit: '' },
  { parameter: 'Bile Pigment', value: 'Trace', unit: '' },
  { parameter: 'Bile Salts', value: 'Absent', unit: '' },
  { parameter: 'Occult Blood', value: 'Trace', unit: '' },
  { parameter: 'Urobilinogen', value: 'Normal', unit: '' },
  { parameter: 'Pus Cells', value: 'Few Seen', unit: 'cells/hpf' },
  { parameter: 'Epithelial Cells', value: 'Absent', unit: '' },
  { parameter: 'Red Blood Cells', value: 'Absent', unit: '' },
  { parameter: 'Casts', value: 'Absent', unit: '' },
  { parameter: 'Crystals', value: 'Absent', unit: '' }
];

const metadata1 = {
  reportId: 'UR-2026-02-18-001',
  userId: 'user123',
  reportDate: new Date('2026-02-18'),
  labName: 'Crystal Lab',
  rawOcrText: 'ROUTINE URINE EXAMINATION...',
  method: 'OCR'
};

const normalized1 = urineNormalizer.normalize(rawExtractedData1, metadata1);

console.log('Input:', rawExtractedData1.length, 'parameters');
console.log('Output: Normalized report with', Object.keys(normalized1.physical).length, 'physical,', 
            Object.keys(normalized1.chemical).length, 'chemical,', 
            Object.keys(normalized1.microscopic).length, 'microscopic parameters');
console.log();
console.log('Physical Section:', JSON.stringify(normalized1.physical, null, 2));
console.log();
console.log('Chemical Section:', JSON.stringify(normalized1.chemical, null, 2));
console.log();
console.log('Microscopic Section:', JSON.stringify(normalized1.microscopic, null, 2));
console.log();
console.log('Metadata:', JSON.stringify(normalized1.extractionMetadata, null, 2));
console.log();
console.log();

// Example 2: Object format (key-value pairs)
console.log('📋 TEST 2: Object format (key-value pairs)');
console.log('-'.repeat(70));

const rawExtractedData2 = {
  'Color': 'Pale Yellow',
  'Appearance': 'Turbid',
  'pH': '5.5',
  'Specific Gravity': '1.020',
  'Protein': 'Trace',
  'Glucose': 'Negative',
  'Ketones': 'Negative',
  'Bilirubin': 'Negative',
  'Blood': '1+',
  'Nitrite': 'Negative',
  'WBC': '10-15',
  'RBC': '5-8',
  'Epithelial Cells': 'Few',
  'Bacteria': 'Many'
};

const normalized2 = urineNormalizer.normalize(rawExtractedData2, {
  userId: 'user456',
  labName: 'City Hospital Lab'
});

console.log('Input:', Object.keys(rawExtractedData2).length, 'parameters (object format)');
console.log('Output: Normalized report');
console.log();
console.log('Chemical Section:', JSON.stringify(normalized2.chemical, null, 2));
console.log();
console.log('Microscopic Section:', JSON.stringify(normalized2.microscopic, null, 2));
console.log();
console.log('Additional Parameters:', JSON.stringify(normalized2.additionalParameters, null, 2));
console.log();
console.log();

// Example 3: Handling aliases and variations
console.log('📋 TEST 3: Handling aliases and spelling variations');
console.log('-'.repeat(70));

const rawExtractedData3 = [
  { parameter: 'Colour', value: 'Yellow', unit: '' },  // British spelling
  { parameter: 'Sp Gr', value: 1.015, unit: '' },      // Abbreviation
  { parameter: 'Albumin', value: 'Nil', unit: '' },    // Alternative to Protein
  { parameter: 'Reducing Substances', value: 'ND', unit: '' },  // Alternative to Sugar
  { parameter: 'Acetone Bodies', value: 'Absent', unit: '' },   // Alternative to Ketone
  { parameter: 'WBC', value: '2-4', unit: '/hpf' },    // Alternative to Pus Cells
  { parameter: 'Epi Cells', value: 'Few', unit: '' },  // Abbreviation
  { parameter: 'Leucocyte Esterase', value: 'Negative', unit: '' }  // British spelling
];

const normalized3 = urineNormalizer.normalize(rawExtractedData3, {
  userId: 'user789'
});

console.log('Input: Various aliases and spellings');
console.log('Mappings applied:');
rawExtractedData3.forEach(param => {
  const normalized_param = urineNormalizer.normalizeParameter(param);
  if (normalized_param) {
    console.log(`  "${param.parameter}" → "${normalized_param.parameterData.name}" (${normalized_param.section})`);
  }
});
console.log();
console.log('Full normalized report:', JSON.stringify(normalized3, null, 2));
console.log();
console.log();

// Example 4: Abnormal findings detection
console.log('📋 TEST 4: Abnormal findings detection');
console.log('-'.repeat(70));

const rawExtractedData4 = [
  { parameter: 'pH', value: '9.0', unit: '' },                    // Abnormal - too alkaline
  { parameter: 'Specific Gravity', value: 1.035, unit: '' },      // Abnormal - too high
  { parameter: 'Proteins', value: '2+', unit: '' },               // Abnormal
  { parameter: 'Sugar', value: 'Trace', unit: '' },               // Abnormal
  { parameter: 'Ketone', value: '1+', unit: '' },                 // Abnormal
  { parameter: 'Blood', value: 'Many', unit: '' },                // Abnormal
  { parameter: 'Pus Cells', value: '50-60', unit: '/hpf' },       // Abnormal
  { parameter: 'RBC', value: 'Plenty', unit: '' },                // Abnormal
  { parameter: 'Bacteria', value: '3+', unit: '' },               // Abnormal
  { parameter: 'Casts', value: 'Few', unit: '' }                  // Abnormal
];

const normalized4 = urineNormalizer.normalize(rawExtractedData4, {
  userId: 'user999',
  labName: 'Emergency Lab'
});

console.log('Abnormal findings detected:');
let abnormalCount = 0;

const checkSection = (section, sectionName) => {
  Object.entries(section).forEach(([key, param]) => {
    if (param.isAbnormal) {
      abnormalCount++;
      console.log(`  ❌ ${param.name}: ${param.value} (${sectionName})`);
    }
  });
};

checkSection(normalized4.physical || {}, 'Physical');
checkSection(normalized4.chemical || {}, 'Chemical');
checkSection(normalized4.microscopic || {}, 'Microscopic');

if (normalized4.additionalParameters) {
  normalized4.additionalParameters.forEach(param => {
    if (param.isAbnormal) {
      abnormalCount++;
      console.log(`  ❌ ${param.name}: ${param.value} (Additional)`);
    }
  });
}

console.log();
console.log(`Total abnormal findings: ${abnormalCount}`);
console.log();
console.log();

// Example 5: Database-ready format
console.log('📋 TEST 5: Database-ready format');
console.log('-'.repeat(70));

const dbReady = urineNormalizer.toDatabaseFormat(normalized1);
console.log('Database-ready document:');
console.log(JSON.stringify(dbReady, null, 2));
console.log();

console.log('='.repeat(70));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(70));
