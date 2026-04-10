/**
 * Master Data Service
 * 
 * Automatically populates master tables when reports are uploaded:
 * - test_master
 * - test_parameters
 * - test_definitions
 * - lab_centers
 * 
 * Ensures data consistency and linkage across tables
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const testData = require('../prisma/master_test_data.json');

/**
 * Extract lab center information from OCR text
 * @param {string} ocrText - Raw OCR text
 * @returns {Object|null} Lab center data or null
 */
function extractLabCenterFromOCR(ocrText) {
  if (!ocrText) return null;

  const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
  
  // Common lab center name patterns
  const labPatterns = [
    /(?:^|\n)(.*(?:lab|pathology|diagnostic|medical|health|clinic|hospital|center|centre).*)/i,
    /(?:^|\n)([A-Z\s]{3,}(?:LABORATORY|DIAGNOSTICS|PATHOLOGY|MEDICAL))/
  ];

  let centerName = null;
  let location = null;
  let phoneNumber = null;
  let email = null;

  // Extract lab name (usually in first few lines)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip very short lines
    if (line.length < 5) continue;
    
    // Check if line matches lab patterns
    for (const pattern of labPatterns) {
      const match = line.match(pattern);
      if (match && !centerName) {
        centerName = match[1].trim();
        break;
      }
    }
    
    // Extract phone number
    const phoneMatch = line.match(/(?:phone|tel|mobile|contact).*?(\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4})/i);
    if (phoneMatch && !phoneNumber) {
      phoneNumber = phoneMatch[1].replace(/[-.\s]/g, '');
    }
    
    // Extract email
    const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && !email) {
      email = emailMatch[1];
    }
    
    // Extract location (city, state)
    const locationMatch = line.match(/(?:address|location).*?([A-Z][a-zA-Z\s,]+\d{6})/i);
    if (locationMatch && !location) {
      location = locationMatch[1].trim();
    }
  }

  // If no specific lab name found, use first non-empty line as fallback
  if (!centerName && lines.length > 0) {
    centerName = lines[0].trim();
    // Limit length
    if (centerName.length > 100) {
      centerName = centerName.substring(0, 100);
    }
  }

  return centerName ? {
    centerName,
    type: 'lab',
    location: location || 'Unknown',
    phoneNumber: phoneNumber || null,
    email: email || null
  } : null;
}

/**
 * Find or create lab center
 * @param {Object} labData - Lab center data
 * @returns {Promise<Object>} Lab center record
 */
async function findOrCreateLabCenter(labData) {
  if (!labData || !labData.centerName) {
    return null;
  }

  try {
    // Check if lab center already exists (by name)
    let labCenter = await prisma.labCenter.findFirst({
      where: {
        centerName: {
          contains: labData.centerName.substring(0, 50), // First 50 chars for matching
          mode: 'insensitive'
        }
      }
    });

    // Create if not exists
    if (!labCenter) {
      console.log(`📌 Creating new lab center: ${labData.centerName}`);
      labCenter = await prisma.labCenter.create({
        data: {
          centerName: labData.centerName,
          type: labData.type || 'lab',
          location: labData.location,
          phoneNumber: labData.phoneNumber,
          email: labData.email
        }
      });
      console.log(`✅ Lab center created: ${labCenter.id}`);
    } else {
      console.log(`✅ Lab center found: ${labCenter.centerName}`);
    }

    return labCenter;
  } catch (error) {
    console.error('❌ Error creating/finding lab center:', error);
    return null;
  }
}

/**
 * Find or create test definition
 * @param {Object} paramData - Parameter data { parameter, value, unit, referenceRange }
 * @param {string} categoryName - Category name (e.g., "Blood Tests")
 * @returns {Promise<Object|null>} Test definition record
 */
async function findOrCreateTestDefinition(paramData, categoryName) {
  try {
    const parameterName = paramData.parameter;
    
    // Try to find existing definition by parameter name
    let testDef = await prisma.testDefinition.findFirst({
      where: {
        parameterName: {
          equals: parameterName,
          mode: 'insensitive'
        }
      }
    });

    if (testDef) {
      console.log(`  ✓ TestDefinition found for: ${parameterName}`);
      return testDef;
    }

    // Check if definition exists in JSON master data
    const jsonDef = testData.test_definitions.find(def => 
      def.parameter_name.toLowerCase() === parameterName.toLowerCase() ||
      def.test_name.toLowerCase() === parameterName.toLowerCase()
    );

    if (jsonDef) {
      // Create from JSON template
      console.log(`  📝 Creating TestDefinition from JSON for: ${parameterName}`);
      testDef = await prisma.testDefinition.create({
        data: {
          testId: jsonDef.test_id,
          categoryName: jsonDef.category_name || categoryName,
          testName: jsonDef.test_name,
          parameterName: jsonDef.parameter_name,
          unit: jsonDef.unit,
          normalMinValue: jsonDef.normal_min_value,
          normalMaxValue: jsonDef.normal_max_value,
          riskLevelLogic: typeof jsonDef.risk_level_logic === 'string' 
            ? jsonDef.risk_level_logic 
            : JSON.stringify(jsonDef.risk_level_logic || {}),
          isQualitative: jsonDef.is_qualitative || false,
          genderSpecific: jsonDef.gender_specific 
            ? (typeof jsonDef.gender_specific === 'string' 
                ? jsonDef.gender_specific 
                : JSON.stringify(jsonDef.gender_specific))
            : null
        }
      });
      console.log(`  ✅ TestDefinition created: ${testDef.id}`);
      return testDef;
    }

    // Create new definition from extracted data
    console.log(`  📝 Creating new TestDefinition for: ${parameterName}`);
    const testIdPrefix = categoryName.substring(0, 2).toUpperCase();
    const testIdNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    testDef = await prisma.testDefinition.create({
      data: {
        testId: `${testIdPrefix}${testIdNum}`,
        categoryName: categoryName,
        testName: parameterName,
        parameterName: parameterName,
        unit: paramData.unit || 'N/A',
        normalMinValue: extractMinValue(paramData.referenceRange),
        normalMaxValue: extractMaxValue(paramData.referenceRange),
        riskLevelLogic: '{}',
        isQualitative: isQualitativeValue(paramData.value),
        genderSpecific: null
      }
    });
    
    console.log(`  ✅ TestDefinition created: ${testDef.id}`);
    return testDef;
  } catch (error) {
    console.error(`  ❌ Error creating/finding TestDefinition for ${paramData.parameter}:`, error);
    return null;
  }
}

/**
 * Find or create test master
 * @param {string} testName - Test name (e.g., "Complete Blood Count")
 * @param {string} category - Category (e.g., "Lab Reports")
 * @param {string} subcategory - Subcategory (e.g., "Blood Tests")
 * @returns {Promise<Object>} Test master record
 */
async function findOrCreateTestMaster(testName, category, subcategory) {
  try {
    // Try to find existing test master
    let testMaster = await prisma.testMaster.findFirst({
      where: {
        testName: {
          equals: testName,
          mode: 'insensitive'
        }
      }
    });

    if (testMaster) {
      console.log(`✓ TestMaster found: ${testName}`);
      return testMaster;
    }

    // Create new test master
    console.log(`📝 Creating TestMaster: ${testName}`);
    testMaster = await prisma.testMaster.create({
      data: {
        testName: testName,
        category: category,
        subcategory: subcategory,
        description: `Auto-created from report upload on ${new Date().toISOString()}`
      }
    });

    console.log(`✅ TestMaster created: ${testMaster.id}`);
    return testMaster;
  } catch (error) {
    console.error('❌ Error creating/finding TestMaster:', error);
    throw error;
  }
}

/**
 * Find or create test parameter
 * @param {string} testMasterId - Test master ID
 * @param {Object} paramData - Parameter data { parameter, value, unit, referenceRange }
 * @returns {Promise<Object>} Test parameter record
 */
async function findOrCreateTestParameter(testMasterId, paramData) {
  try {
    const parameterName = paramData.parameter;
    
    // Try to find existing parameter
    let testParam = await prisma.testParameter.findFirst({
      where: {
        testId: testMasterId,
        parameterName: {
          equals: parameterName,
          mode: 'insensitive'
        }
      }
    });

    if (testParam) {
      console.log(`  ✓ TestParameter found: ${parameterName}`);
      return testParam;
    }

    // Create new parameter
    console.log(`  📝 Creating TestParameter: ${parameterName}`);
    testParam = await prisma.testParameter.create({
      data: {
        testId: testMasterId,
        parameterName: parameterName,
        unit: paramData.unit || 'N/A',
        normalMin: extractMinValue(paramData.referenceRange),
        normalMax: extractMaxValue(paramData.referenceRange)
      }
    });

    console.log(`  ✅ TestParameter created: ${testParam.id}`);
    return testParam;
  } catch (error) {
    console.error(`  ❌ Error creating/finding TestParameter for ${paramData.parameter}:`, error);
    return null;
  }
}

/**
 * Auto-populate all master tables for a report
 * @param {Object} reportData - Report data
 * @param {string} ocrText - OCR text
 * @param {Array} parameters - Extracted parameters
 * @returns {Promise<Object>} Master data IDs
 */
async function autoPopulateMasterTables(reportData, ocrText, parameters) {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 AUTO-POPULATING MASTER TABLES');
  console.log('='.repeat(70));

  try {
    // 1. Extract and save lab center
    console.log('\n1️⃣  Processing Lab Center...');
    const labData = extractLabCenterFromOCR(ocrText);
    const labCenter = await findOrCreateLabCenter(labData);
    const labCenterId = labCenter ? labCenter.id : null;
    console.log(labCenter ? `   ✅ Lab Center ID: ${labCenterId}` : '   ⚠️  No lab center extracted');

    // 2. Create test master
    console.log('\n2️⃣  Processing Test Master...');
    const testMaster = await findOrCreateTestMaster(
      reportData.testName,
      reportData.category,
      reportData.subcategory
    );
    console.log(`   ✅ Test Master ID: ${testMaster.id}`);

    // 3. Create test definitions and parameters
    console.log('\n3️⃣  Processing Test Definitions and Parameters...');
    const processedParams = [];
    
    for (const param of parameters) {
      console.log(`\n   Processing: ${param.parameter}`);
      
      // Create/find test definition
      const testDef = await findOrCreateTestDefinition(param, reportData.subcategory);
      
      // Create/find test parameter
      const testParam = await findOrCreateTestParameter(testMaster.id, param);
      
      processedParams.push({
        parameter: param,
        testDefinitionId: testDef ? testDef.id : null,
        testParameterId: testParam ? testParam.id : null
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ AUTO-POPULATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Lab Centers:       ${labCenterId ? '1 linked' : '0 (none found)'}`);
    console.log(`Test Masters:      1 linked`);
    console.log(`Test Definitions:  ${processedParams.filter(p => p.testDefinitionId).length} linked`);
    console.log(`Test Parameters:   ${processedParams.filter(p => p.testParameterId).length} linked`);
    console.log('='.repeat(70) + '\n');

    return {
      labCenterId,
      testMasterId: testMaster.id,
      processedParams
    };
  } catch (error) {
    console.error('❌ Error in autoPopulateMasterTables:', error);
    throw error;
  }
}

/**
 * Helper: Extract minimum value from reference range
 * @param {string} referenceRange - Reference range string (e.g., "10-20", "<5")
 * @returns {number|null}
 */
function extractMinValue(referenceRange) {
  if (!referenceRange || typeof referenceRange !== 'string') return null;
  
  // Pattern: "10-20" or "10 - 20"
  const rangeMatch = referenceRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    return parseFloat(rangeMatch[1]);
  }
  
  // Pattern: ">10" means min is 10
  const greaterMatch = referenceRange.match(/>(\d+\.?\d*)/);
  if (greaterMatch) {
    return parseFloat(greaterMatch[1]);
  }
  
  return null;
}

/**
 * Helper: Extract maximum value from reference range
 * @param {string} referenceRange - Reference range string (e.g., "10-20", "<5")
 * @returns {number|null}
 */
function extractMaxValue(referenceRange) {
  if (!referenceRange || typeof referenceRange !== 'string') return null;
  
  // Pattern: "10-20" or "10 - 20"
  const rangeMatch = referenceRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    return parseFloat(rangeMatch[2]);
  }
  
  // Pattern: "<10" means max is 10
  const lessMatch = referenceRange.match(/<(\d+\.?\d*)/);
  if (lessMatch) {
    return parseFloat(lessMatch[1]);
  }
  
  return null;
}

/**
 * Helper: Check if value is qualitative (non-numeric)
 * @param {string} value - Test value
 * @returns {boolean}
 */
function isQualitativeValue(value) {
  if (!value) return false;
  
  // Common qualitative values
  const qualitativePatterns = [
    /^(positive|negative|detected|not\s*detected|reactive|non-reactive)$/i,
    /^(present|absent|normal|abnormal)$/i,
    /^(nil|trace|\+|\+\+|\+\+\+)$/i
  ];
  
  return qualitativePatterns.some(pattern => pattern.test(value.toString().trim()));
}

module.exports = {
  extractLabCenterFromOCR,
  findOrCreateLabCenter,
  findOrCreateTestDefinition,
  findOrCreateTestMaster,
  findOrCreateTestParameter,
  autoPopulateMasterTables
};
