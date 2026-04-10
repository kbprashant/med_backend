/**
 * Parameter Type Dictionary
 * 
 * Defines the expected data type for each medical parameter:
 * - NUMERIC: Must be a valid number (integer or decimal)
 * - QUALITATIVE: Text values (Positive/Negative, Normal/Abnormal, etc.)
 * - MIXED: Can be either numeric or qualitative
 */

const ParameterTypes = {
  // ========================================
  // BLOOD SUGAR / GLUCOSE
  // ========================================
  'Glucose': 'NUMERIC',
  'Fasting Glucose': 'NUMERIC',
  'Fasting Blood Sugar': 'NUMERIC',
  'Post Prandial Glucose': 'NUMERIC',
  'Post Prandial Blood Sugar': 'NUMERIC',
  'Random Blood Sugar': 'NUMERIC',
  'Random Glucose': 'NUMERIC',
  'HbA1c': 'NUMERIC',
  'Average Blood Glucose': 'NUMERIC',
  'ABG': 'NUMERIC',
  
  // ========================================
  // COMPLETE BLOOD COUNT (CBC)
  // ========================================
  'Hemoglobin': 'NUMERIC',
  'Haemoglobin': 'NUMERIC',
  'Hb': 'NUMERIC',
  'RBC': 'NUMERIC',
  'RBC Count': 'NUMERIC',
  'Red Blood Cell Count': 'NUMERIC',
  'WBC': 'NUMERIC',
  'WBC Count': 'NUMERIC',
  'White Blood Cell Count': 'NUMERIC',
  'Platelets': 'NUMERIC',
  'Platelet Count': 'NUMERIC',
  'Hematocrit': 'NUMERIC',
  'PCV': 'NUMERIC',
  'MCV': 'NUMERIC',
  'MCH': 'NUMERIC',
  'MCHC': 'NUMERIC',
  'RDW': 'NUMERIC',
  'MPV': 'NUMERIC',
  'Neutrophils': 'NUMERIC',
  'Lymphocytes': 'NUMERIC',
  'Monocytes': 'NUMERIC',
  'Eosinophils': 'NUMERIC',
  'Basophils': 'NUMERIC',
  
  // ========================================
  // KIDNEY FUNCTION TEST (KFT/RFT)
  // ========================================
  'Creatinine': 'NUMERIC',
  'Serum Creatinine': 'NUMERIC',
  'Urea': 'NUMERIC',
  'Serum Urea': 'NUMERIC',
  'BUN': 'NUMERIC',
  'Blood Urea Nitrogen': 'NUMERIC',
  'Uric Acid': 'NUMERIC',
  'Serum Uric Acid': 'NUMERIC',
  'eGFR': 'NUMERIC',
  'EGFR': 'NUMERIC',
  'GFR': 'NUMERIC',
  
  // ========================================
  // ELECTROLYTES
  // ========================================
  'Sodium': 'NUMERIC',
  'Serum Sodium': 'NUMERIC',
  'Potassium': 'NUMERIC',
  'Serum Potassium': 'NUMERIC',
  'Chloride': 'NUMERIC',
  'Serum Chloride': 'NUMERIC',
  'Calcium': 'NUMERIC',
  'Serum Calcium': 'NUMERIC',
  'Phosphorus': 'NUMERIC',
  'Serum Phosphorus': 'NUMERIC',
  'Magnesium': 'NUMERIC',
  'Serum Magnesium': 'NUMERIC',
  
  // ========================================
  // URINE ROUTINE / URINE EXAMINATION
  // ========================================
  // Numeric Parameters
  'Volume': 'NUMERIC',
  'Ph': 'NUMERIC',
  'pH': 'NUMERIC',
  'Specific Gravity': 'NUMERIC',
  
  // Qualitative Parameters
  'Colour': 'QUALITATIVE',
  'Color': 'QUALITATIVE',
  'Appearance': 'QUALITATIVE',
  'Urine Protein': 'QUALITATIVE',
  'Protein': 'QUALITATIVE',
  'Urine Glucose': 'QUALITATIVE',
  'Sugar': 'QUALITATIVE',
  'Ketone': 'QUALITATIVE',
  'Ketones': 'QUALITATIVE',
  'Nitrite': 'QUALITATIVE',
  'Blood': 'QUALITATIVE',
  'Urobilinogen': 'QUALITATIVE',
  'Bilirubin': 'QUALITATIVE',
  'Leukocyte': 'QUALITATIVE',
  'Leukocytes': 'QUALITATIVE',
  
  // Microscopic Examination (Qualitative/Range)
  'RBC': 'QUALITATIVE',
  'Red Blood Cells': 'QUALITATIVE',
  'Pus Cells': 'QUALITATIVE',
  'Pus Cell': 'QUALITATIVE',
  'Epithelial Cells': 'QUALITATIVE',
  'Epithelial Cell': 'QUALITATIVE',
  'Casts': 'QUALITATIVE',
  'Crystals': 'QUALITATIVE',
  'Bacteria': 'QUALITATIVE',
  'Budding Yeast Cells': 'QUALITATIVE',
  'Budding Yeast': 'QUALITATIVE',
  'Yeast Cells': 'QUALITATIVE',
  'Others': 'QUALITATIVE',
  
  // ========================================
  // LIVER FUNCTION TEST (LFT)
  // ========================================
  'Bilirubin Total': 'NUMERIC',
  'Total Bilirubin': 'NUMERIC',
  'Bilirubin Direct': 'NUMERIC',
  'Direct Bilirubin': 'NUMERIC',
  'Bilirubin Indirect': 'NUMERIC',
  'Indirect Bilirubin': 'NUMERIC',
  'SGOT': 'NUMERIC',
  'AST': 'NUMERIC',
  'AST (SGOT)': 'NUMERIC',
  'SGPT': 'NUMERIC',
  'ALT': 'NUMERIC',
  'ALT (SGPT)': 'NUMERIC',
  'AST:ALT Ratio': 'NUMERIC',
  'ALP': 'NUMERIC',
  'Alkaline Phosphatase': 'NUMERIC',
  'Alkaline Phosphatase (ALP)': 'NUMERIC',
  'Total Protein': 'NUMERIC',
  'Albumin': 'NUMERIC',
  'Globulin': 'NUMERIC',
  'A/G Ratio': 'NUMERIC',
  'A:G Ratio': 'NUMERIC',
  'GGT': 'NUMERIC',
  'GGTP': 'NUMERIC',
  
  // ========================================
  // LIPID PROFILE
  // ========================================
  'Cholesterol': 'NUMERIC',
  'Total Cholesterol': 'NUMERIC',
  'HDL': 'NUMERIC',
  'HDL Cholesterol': 'NUMERIC',
  'LDL': 'NUMERIC',
  'LDL Cholesterol': 'NUMERIC',
  'VLDL': 'NUMERIC',
  'VLDL Cholesterol': 'NUMERIC',
  'Triglycerides': 'NUMERIC',
  'TC/HDL Ratio': 'NUMERIC',
  'LDL/HDL Ratio': 'NUMERIC',
  'Non-HDL Cholesterol': 'NUMERIC',
  
  // ========================================
  // THYROID FUNCTION TEST
  // ========================================
  'TSH': 'NUMERIC',
  'T3': 'NUMERIC',
  'T4': 'NUMERIC',
  'Free T3': 'NUMERIC',
  'Free T4': 'NUMERIC',
  'FT3': 'NUMERIC',
  'FT4': 'NUMERIC',
  'TT3': 'NUMERIC',
  'TT4': 'NUMERIC',
  
  // ========================================
  // VITALS
  // ========================================
  'Blood Pressure Systolic': 'NUMERIC',
  'Blood Pressure Diastolic': 'NUMERIC',
  'Heart Rate': 'NUMERIC',
  'Pulse Rate': 'NUMERIC',
  'Temperature': 'NUMERIC',
  'Weight': 'NUMERIC',
  'Height': 'NUMERIC',
  'BMI': 'NUMERIC',
  
  // ========================================
  // VITAMINS & MINERALS
  // ========================================
  'Vitamin D': 'NUMERIC',
  'Vitamin B12': 'NUMERIC',
  'Vitamin B9': 'NUMERIC',
  'Folate': 'NUMERIC',
  'Iron': 'NUMERIC',
  'Ferritin': 'NUMERIC',
  'TIBC': 'NUMERIC',
  
  // ========================================
  // CARDIAC MARKERS
  // ========================================
  'Troponin I': 'NUMERIC',
  'Troponin T': 'NUMERIC',
  'CK-MB': 'NUMERIC',
  'CPK': 'NUMERIC',
  'LDH': 'NUMERIC',
  
  // ========================================
  // COAGULATION TESTS
  // ========================================
  'PT': 'NUMERIC',
  'INR': 'NUMERIC',
  'APTT': 'NUMERIC',
  'D-Dimer': 'NUMERIC',
  
  // ========================================
  // QUALITATIVE PARAMETERS
  // ========================================
  'HBsAg': 'QUALITATIVE',
  'Anti-HCV': 'QUALITATIVE',
  'HIV': 'QUALITATIVE',
  'VDRL': 'QUALITATIVE',
  'Widal': 'QUALITATIVE',
  'Blood Group': 'QUALITATIVE',
  'Rh Factor': 'QUALITATIVE',
  'Malaria': 'QUALITATIVE',
  'Dengue NS1': 'QUALITATIVE',
  'Dengue IgG': 'QUALITATIVE',
  'Dengue IgM': 'QUALITATIVE',
  'COVID-19': 'QUALITATIVE',
  'Pregnancy Test': 'QUALITATIVE',
  
  // ========================================
  // URINE ANALYSIS (MIXED TYPES)
  // ========================================
  'Urine Color': 'QUALITATIVE',
  'Urine Colour': 'QUALITATIVE',
  'Urine Appearance': 'QUALITATIVE',
  'Urine pH': 'NUMERIC',
  'Specific Gravity': 'NUMERIC',
  'Urine Protein': 'QUALITATIVE',
  'Urine Glucose': 'QUALITATIVE',
  'Urine Sugar': 'QUALITATIVE',
  'Ketones': 'QUALITATIVE',
  'Urine Blood': 'QUALITATIVE',
  'Bilirubin': 'QUALITATIVE',
  'Urobilinogen': 'QUALITATIVE',
  'Nitrite': 'QUALITATIVE',
  'Leukocytes': 'QUALITATIVE',
  'Pus Cells': 'MIXED',
  'Epithelial Cells': 'MIXED',
  'RBC in Urine': 'MIXED',
  'Crystals': 'QUALITATIVE',
  'Casts': 'QUALITATIVE',
  'Bacteria': 'QUALITATIVE',
};

/**
 * Get the expected type for a parameter
 * @param {string} parameterName - The parameter name
 * @returns {string} - "NUMERIC", "QUALITATIVE", or "MIXED"
 */
function getParameterType(parameterName) {
  if (!parameterName) return null;
  
  // Normalize the parameter name
  const normalized = parameterName.trim();
  
  // Exact match
  if (ParameterTypes[normalized]) {
    return ParameterTypes[normalized];
  }
  
  // Case-insensitive match
  const lowerParam = normalized.toLowerCase();
  for (const [key, value] of Object.entries(ParameterTypes)) {
    if (key.toLowerCase() === lowerParam) {
      return value;
    }
  }
  
  // Default to NUMERIC for unknown parameters
  // (most lab parameters are numeric)
  return 'NUMERIC';
}

/**
 * Check if a parameter should only accept numeric values
 * @param {string} parameterName - The parameter name
 * @returns {boolean} - True if parameter must be numeric
 */
function isNumericParameter(parameterName) {
  const type = getParameterType(parameterName);
  return type === 'NUMERIC';
}

/**
 * Check if a parameter should only accept qualitative values
 * @param {string} parameterName - The parameter name
 * @returns {boolean} - True if parameter must be qualitative
 */
function isQualitativeParameter(parameterName) {
  const type = getParameterType(parameterName);
  return type === 'QUALITATIVE';
}

/**
 * Check if a parameter can accept either numeric or qualitative values
 * @param {string} parameterName - The parameter name
 * @returns {boolean} - True if parameter can be mixed
 */
function isMixedParameter(parameterName) {
  const type = getParameterType(parameterName);
  return type === 'MIXED';
}

module.exports = {
  ParameterTypes,
  getParameterType,
  isNumericParameter,
  isQualitativeParameter,
  isMixedParameter,
};
