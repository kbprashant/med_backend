/**
 * Test Definition Utility for Backend
 * Helper functions to look up test definitions and validate test results
 * Now uses database + JSON fallback for improved performance
 */

const testData = require('../prisma/master_test_data.json');
const prisma = require('../config/database');

class TestDefinitionService {
  constructor() {
    this.definitions = new Map();
    this.dbDefinitions = null;
    this.lastDbSync = null;
    this.DB_SYNC_INTERVAL = 3600000; // 1 hour
    this.loadDefinitions();
  }

  /**
   * Load all test definitions into memory from JSON
   */
  loadDefinitions() {
    testData.test_definitions.forEach((test) => {
      this.definitions.set(test.test_id, test);
    });
    console.log(`✅ Loaded ${this.definitions.size} test definitions from JSON`);
  }

  /**
   * Load test definitions from database
   */
  async loadDefinitionsFromDb() {
    const now = Date.now();
    
    // Use cache if available and fresh
    if (this.dbDefinitions && this.lastDbSync && 
        (now - this.lastDbSync) < this.DB_SYNC_INTERVAL) {
      return this.dbDefinitions;
    }

    try {
      console.log('📚 Loading test definitions from database...');
      const definitions = await prisma.testDefinition.findMany({
        select: {
          id: true,
          testId: true,
          categoryName: true,
          testName: true,
          parameterName: true,
          unit: true,
          normalMinValue: true,
          normalMaxValue: true,
          riskLevelLogic: true,
          isQualitative: true,
          genderSpecific: true,
        }
      });

      this.dbDefinitions = definitions;
      this.lastDbSync = now;
      console.log(`✅ Loaded ${definitions.length} test definitions from database`);
      
      return definitions;
    } catch (error) {
      console.error('❌ Error loading from database, using JSON fallback:', error);
      // Fallback to JSON data
      return Array.from(this.definitions.values());
    }
  }

  /**
   * Get test definition by test ID
   * @param {string} testId - The test ID (e.g., "BT001")
   * @returns {object|null} Test definition or null if not found
   */
  getByTestId(testId) {
    return this.definitions.get(testId) || null;
  }

  /**
   * Find test definition by test name (fuzzy search)
   * @param {string} testName - The test name to search for
   * @returns {object|null} Test definition or null if not found
   */
  findByTestName(testName) {
    if (!testName) return null;
    
    const normalized = testName.trim().toLowerCase();
    
    // Strip content in parentheses for better matching
    // "ALT (SGPT)" → "ALT", "Blood sugar (Post Prandial)" → "Blood sugar"
    const withoutParens = normalized.replace(/\s*\([^)]*\)/g, '').trim();
    
    // Exact match first (with and without parentheses content)
    for (const [id, def] of this.definitions) {
      const defTest = def.test_name.toLowerCase();
      const defParam = def.parameter_name.toLowerCase();
      
      if (defTest === normalized || defParam === normalized ||
          defTest === withoutParens || defParam === withoutParens) {
        return def;
      }
    }
    
    // Common aliases mapping
    const aliases = {
      'fasting blood sugar': 'fasting glucose',
      'fbs': 'fasting glucose',
      'blood sugar fasting': 'fasting glucose',
      'ppbs': 'postprandial glucose',
      'post prandial blood sugar': 'postprandial glucose',
      'blood sugar post prandial': 'postprandial glucose',
      'blood sugar': 'postprandial glucose',
      'rbs': 'random glucose',
      'random blood sugar': 'random glucose',
      'alt': 'alt',
      'sgpt': 'alt',
      'ast': 'ast',
      'sgot': 'ast',
      'hba1c': 'hba1c',
      'glycated hemoglobin': 'hba1c',
      'glycosylated hemoglobin': 'hba1c',
    };
    
    // Check if normalized name or stripped name matches an alias
    const aliasedName = aliases[withoutParens] || aliases[normalized];
    if (aliasedName) {
      for (const [id, def] of this.definitions) {
        if (def.parameter_name.toLowerCase() === aliasedName ||
            def.test_name.toLowerCase() === aliasedName) {
          return def;
        }
      }
    }
    
    // Partial match (test name contains search or vice versa)
    for (const [id, def] of this.definitions) {
      const defTest = def.test_name.toLowerCase();
      const defParam = def.parameter_name.toLowerCase();
      
      if (defTest.includes(withoutParens) || withoutParens.includes(defTest) ||
          defParam.includes(withoutParens) || withoutParens.includes(defParam)) {
        return def;
      }
    }
    
    return null;
  }

  /**
   * Get all tests in a specific category
   * @param {string} categoryName - The category name
   * @returns {array} Array of test definitions
   */
  getByCategory(categoryName) {
    return Array.from(this.definitions.values())
      .filter(test => test.category_name === categoryName);
  }

  /**
   * Get all unique categories
   * @returns {array} Array of category names
   */
  getAllCategories() {
    const categories = new Set();
    this.definitions.forEach(test => {
      categories.add(test.category_name);
    });
    return Array.from(categories).sort();
  }

  /**
   * Determine risk status for a test value
   * @param {string} testId - The test ID
   * @param {number|string} value - The test value
   * @param {string} gender - Optional gender for gender-specific tests ("male" or "female")
   * @returns {string} "LOW" | "NORMAL" | "HIGH"
   */
  getRiskStatus(testId, value, gender = null) {
    const def = this.getByTestId(testId);
    if (!def) {
      throw new Error(`Test definition not found: ${testId}`);
    }

    // Handle qualitative tests
    if (def.is_qualitative) {
      return this.getRiskStatusQualitative(def, value);
    }

    // Handle quantitative tests
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }

    // Check gender-specific ranges
    if (gender && def.gender_specific) {
      const range = def.gender_specific[gender.toLowerCase()];
      if (range) {
        if (numValue < range.min) return 'LOW';
        if (numValue > range.max) return 'HIGH';
        return 'NORMAL';
      }
    }

    // Check general ranges
    if (def.normal_min_value !== null && numValue < def.normal_min_value) {
      return 'LOW';
    }
    if (def.normal_max_value !== null && numValue > def.normal_max_value) {
      return 'HIGH';
    }
    return 'NORMAL';
  }

  /**
   * Determine risk status for qualitative tests
   * @param {object} def - Test definition
   * @param {string} value - The test value
   * @returns {string} "NORMAL" | "HIGH"
   */
  getRiskStatusQualitative(def, value) {
    const normalizedValue = value.trim().toLowerCase();
    const normalLogic = def.risk_level_logic.normal.toLowerCase();
    
    // Check if value indicates normal
    if (normalLogic.includes(normalizedValue) ||
        normalizedValue.includes('negative') ||
        normalizedValue.includes('non-reactive') ||
        normalizedValue.includes('absent') ||
        normalizedValue.includes('normal')) {
      return 'NORMAL';
    }
    
    return 'HIGH';
  }

  /**
   * Get reference range as a string
   * @param {string} testId - The test ID
   * @param {string} gender - Optional gender for gender-specific ranges
   * @returns {string} Reference range string (e.g., "12.0 - 17.0 g/dL")
   */
  getReferenceRange(testId, gender = null) {
    const def = this.getByTestId(testId);
    if (!def) {
      throw new Error(`Test definition not found: ${testId}`);
    }

    if (def.is_qualitative) {
      return def.risk_level_logic.normal;
    }

    // Use gender-specific ranges if available
    if (gender && def.gender_specific) {
      const range = def.gender_specific[gender.toLowerCase()];
      if (range) {
        return `${range.min} - ${range.max} ${def.unit || ''}`.trim();
      }
    }

    // Use general ranges
    if (def.normal_min_value !== null && def.normal_max_value !== null) {
      return `${def.normal_min_value} - ${def.normal_max_value} ${def.unit || ''}`.trim();
    }

    return def.risk_level_logic.normal;
  }

  /**
   * Validate and enrich test result data
   * @param {object} testResult - Test result object with at minimum: testName, value
   * @returns {object} Enriched test result with status, referenceRange, etc.
   */
  enrichTestResult(testResult, gender = null) {
    const def = this.findByTestName(testResult.testName || testResult.parameterName);
    
    if (!def) {
      console.warn(`⚠️  Test definition not found for: ${testResult.testName}`);
      return {
        ...testResult,
        status: 'UNKNOWN',
        referenceRange: 'Not available',
        testCategory: testResult.testCategory || 'Unknown',
      };
    }

    const status = this.getRiskStatus(def.test_id, testResult.value, gender);
    const referenceRange = this.getReferenceRange(def.test_id, gender);

    return {
      ...testResult,
      testCategory: def.category_name,
      testName: def.test_name,
      parameterName: def.parameter_name,
      unit: def.unit,
      status: status,
      referenceRange: referenceRange,
      normalMin: def.normal_min_value,
      normalMax: def.normal_max_value,
    };
  }

  /**
   * Get all test definitions
   * @returns {array} Array of all test definitions
   */
  getAll() {
    return Array.from(this.definitions.values());
  }

  /**
   * Get test count
   * @returns {number} Total number of test definitions
   */
  getCount() {
    return this.definitions.size;
  }

  /**
   * Match a single test parameter to a test definition (from database)
   * @param {string} parameterName - The parameter name to match
   * @param {string} categoryHint - Optional category hint
   * @returns {object|null} Matched test definition or null
   */
  async matchParameter(parameterName, categoryHint = null) {
    const definitions = await this.loadDefinitionsFromDb();
    
    if (!parameterName) return null;

    // Normalize the parameter name
    const normalizedParam = this.normalizeParameterName(parameterName);
    
    // Strategy 1: Exact match on parameter name (case-insensitive)
    let match = definitions.find(def => 
      this.normalizeParameterName(def.parameterName) === normalizedParam
    );
    
    if (match) {
      console.log(`✅ Exact match: ${parameterName} → ${match.testId}`);
      return match;
    }

    // Strategy 2: Match with category hint
    if (categoryHint) {
      match = definitions.find(def => 
        this.normalizeParameterName(def.parameterName) === normalizedParam &&
        this.categoryMatches(def.categoryName, categoryHint)
      );
      
      if (match) {
        console.log(`✅ Category match: ${parameterName} → ${match.testId}`);
        return match;
      }
    }

    // Strategy 3: Fuzzy match
    match = definitions.find(def => {
      const defNorm = this.normalizeParameterName(def.parameterName);
      return normalizedParam.includes(defNorm) || defNorm.includes(normalizedParam);
    });

    if (match) {
      console.log(`✅ Fuzzy match: ${parameterName} → ${match.testId}`);
      return match;
    }

    // Strategy 4: Common aliases
    const aliasMatch = this.matchByAlias(normalizedParam, definitions);
    if (aliasMatch) {
      console.log(`✅ Alias match: ${parameterName} → ${aliasMatch.testId}`);
      return aliasMatch;
    }

    console.log(`⚠️  No match found for: ${parameterName}`);
    return null;
  }

  /**
   * Match multiple test results to definitions
   * @param {Array} testResults - Array of test result objects
   * @param {string} categoryHint - Optional category hint
   * @returns {Array} Test results with testDefinitionId added
   */
  async matchMultipleParameters(testResults, categoryHint = null) {
    if (!testResults || testResults.length === 0) return [];
    
    console.log(`🔍 Matching ${testResults.length} parameters to definitions...`);
    
    const enrichedResults = await Promise.all(
      testResults.map(async (result) => {
        const match = await this.matchParameter(
          result.parameterName, 
          categoryHint || result.testCategory
        );

        return {
          ...result,
          testDefinitionId: match?.id || null,
          // If match found, use its normalized values
          unit: match?.unit || result.unit,
          normalMin: match?.normalMinValue ?? result.normalMin,
          normalMax: match?.normalMaxValue ?? result.normalMax,
        };
      })
    );

    const matchedCount = enrichedResults.filter(r => r.testDefinitionId).length;
    console.log(`✅ Matched ${matchedCount}/${testResults.length} parameters`);

    return enrichedResults;
  }

  /**
   * Normalize parameter name for comparison
   */
  normalizeParameterName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')  // Normalize spaces
      .replace(/[()]/g, '')  // Remove parentheses
      .replace(/[^\w\s]/g, '') // Remove special characters except spaces
      .trim();
  }

  /**
   * Check if category matches hint
   */
  categoryMatches(definitionCategory, categoryHint) {
    if (!definitionCategory || !categoryHint) return false;
    const defCat = definitionCategory.toLowerCase();
    const hint = categoryHint.toLowerCase();
    return defCat.includes(hint) || hint.includes(defCat);
  }

  /**
   * Match by common aliases
   */
  matchByAlias(normalizedParam, definitions) {
    const aliases = {
      'bun': ['blood urea nitrogen', 'blood urea'],
      'urea': ['blood urea', 'blood urea nitrogen', 'bun'],
      'creatinine': ['serum creatinine', 'creat'],
      'egfr': ['gfr', 'estimated gfr', 'estimated glomerular filtration rate'],
      'hba1c': ['glycated hemoglobin', 'hemoglobin a1c', 'glycohemoglobin'],
      'tsh': ['thyroid stimulating hormone', 'thyrotropin'],
      't3': ['triiodothyronine', 'total t3'],
      't4': ['thyroxine', 'total t4'],
      'hdl': ['hdl cholesterol', 'high density lipoprotein', 'hdl c'],
      'ldl': ['ldl cholesterol', 'low density lipoprotein', 'ldl c'],
      'vldl': ['vldl cholesterol', 'very low density lipoprotein', 'vldl c'],
      'cholesterol': ['total cholesterol', 'serum cholesterol'],
      'triglycerides': ['triglyceride', 'tg', 'trigs'],
      'rbc': ['red blood cell', 'red blood cells', 'rbc count', 'erythrocytes'],
      'wbc': ['white blood cell', 'white blood cells', 'wbc count', 'leukocytes'],
      'hb': ['hemoglobin', 'haemoglobin', 'hgb'],
      'hct': ['hematocrit', 'haematocrit'],
      'esr': ['erythrocyte sedimentation rate', 'sed rate'],
      'sodium': ['serum sodium', 'na', 'na+'],
      'potassium': ['serum potassium', 'k', 'k+'],
      'calcium': ['serum calcium', 'ca', 'ca++'],
      'chloride': ['serum chloride', 'cl', 'cl-'],
      'albumin': ['serum albumin', 'alb'],
      'protein': ['total protein', 'serum protein'],
      'bilirubin': ['total bilirubin', 'serum bilirubin'],
      'alp': ['alkaline phosphatase', 'alk phos', 'alkp'],
      'alt': ['alanine aminotransferase', 'sgpt', 'alanine transaminase'],
      'ast': ['aspartate aminotransferase', 'sgot', 'aspartate transaminase'],
      'ggt': ['gamma glutamyl transferase', 'gamma gt'],
      'glucose': ['blood glucose', 'blood sugar', 'fasting glucose', 'random glucose'],
      'uric acid': ['urate', 'serum uric acid', 'urate'],
    };

    for (const [alias, variations] of Object.entries(aliases)) {
      const allVariations = [alias, ...variations];
      
      // Check if input matches any variation
      if (allVariations.some(v => normalizedParam === v || normalizedParam.includes(v) || v.includes(normalizedParam))) {
        // Find definition matching any of these variations
        for (const variation of allVariations) {
          const match = definitions.find(def => {
            const defNorm = this.normalizeParameterName(def.parameterName);
            return defNorm === variation || 
                   defNorm.includes(variation) || 
                   variation.includes(defNorm);
          });
          if (match) return match;
        }
      }
    }

    return null;
  }

  /**
   * Clear database cache
   */
  clearCache() {
    this.dbDefinitions = null;
    this.lastDbSync = null;
    console.log('🧹 Test definitions database cache cleared');
  }
}

// Export singleton instance
const testDefinitionService = new TestDefinitionService();
module.exports = testDefinitionService;
