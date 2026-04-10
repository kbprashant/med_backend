/**
 * Report Parameters Configuration
 * 
 * Defines all extractable parameters for each medical report category.
 * Each parameter includes multiple aliases for flexible matching.
 * 
 * IMPORTANT: Test name/category is NOT detected from OCR.
 * Category is strictly taken from request.body.category.
 */

const REPORT_PARAMETERS = {
  blood: [
    { 
      name: "Hemoglobin", 
      aliases: ["hemoglobin", "hb", "haemoglobin", "hgb"] 
    },
    { 
      name: "WBC", 
      aliases: ["wbc", "white blood cells", "white blood cell", "leucocytes", "leukocytes", "total wbc", "tc"] 
    },
    { 
      name: "RBC", 
      aliases: ["rbc", "red blood cells", "red blood cell", "erythrocytes", "total rbc"] 
    },
    { 
      name: "Platelet", 
      aliases: ["platelet", "platelets", "platelet count", "plt"] 
    },
    { 
      name: "Hematocrit", 
      aliases: ["hematocrit", "hct", "haematocrit", "pcv", "packed cell volume"] 
    },
    { 
      name: "MCV", 
      aliases: ["mcv", "mean corpuscular volume", "mean cell volume"] 
    },
    { 
      name: "MCH", 
      aliases: ["mch", "mean corpuscular hemoglobin", "mean cell hemoglobin"] 
    },
    { 
      name: "MCHC", 
      aliases: ["mchc", "mean corpuscular hemoglobin concentration"] 
    },
    { 
      name: "Neutrophils", 
      aliases: ["neutrophils", "neutrophil", "polymorphs", "pmn"] 
    },
    { 
      name: "Lymphocytes", 
      aliases: ["lymphocytes", "lymphocyte", "lymphs"] 
    },
    { 
      name: "Monocytes", 
      aliases: ["monocytes", "monocyte", "monos"] 
    },
    { 
      name: "Eosinophils", 
      aliases: ["eosinophils", "eosinophil", "eos"] 
    },
    { 
      name: "Basophils", 
      aliases: ["basophils", "basophil", "basos"] 
    },
    { 
      name: "ESR", 
      aliases: ["esr", "erythrocyte sedimentation rate", "sed rate"] 
    }
  ],

  lipid: [
    { 
      name: "Total Cholesterol", 
      aliases: ["total cholesterol", "cholesterol", "total chol", "chol"] 
    },
    { 
      name: "HDL", 
      aliases: ["hdl", "hdl cholesterol", "high density lipoprotein", "good cholesterol"] 
    },
    { 
      name: "LDL", 
      aliases: ["ldl", "ldl cholesterol", "low density lipoprotein", "bad cholesterol"] 
    },
    { 
      name: "Triglycerides", 
      aliases: ["triglycerides", "triglyceride", "trig", "tg"] 
    },
    { 
      name: "VLDL", 
      aliases: ["vldl", "vldl cholesterol", "very low density lipoprotein"] 
    },
    { 
      name: "Non-HDL Cholesterol", 
      aliases: ["non-hdl cholesterol", "non hdl", "nonhdl"] 
    },
    { 
      name: "Cholesterol/HDL Ratio", 
      aliases: ["cholesterol/hdl ratio", "chol/hdl ratio", "tc/hdl"] 
    }
  ],

  thyroid: [
    { 
      name: "TSH", 
      aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin"] 
    },
    { 
      name: "T3", 
      aliases: ["t3", "triiodothyronine", "total t3", "t3 total"] 
    },
    { 
      name: "T4", 
      aliases: ["t4", "thyroxine", "total t4", "t4 total"] 
    },
    { 
      name: "Free T3", 
      aliases: ["free t3", "ft3", "free triiodothyronine"] 
    },
    { 
      name: "Free T4", 
      aliases: ["free t4", "ft4", "free thyroxine"] 
    }
  ],

  kidney: [
    { 
      name: "Urea", 
      aliases: ["urea", "blood urea", "bun", "blood urea nitrogen"] 
    },
    { 
      name: "Creatinine", 
      aliases: ["creatinine", "serum creatinine", "creat"] 
    },
    { 
      name: "Uric Acid", 
      aliases: ["uric acid", "urate", "serum uric acid"] 
    },
    { 
      name: "Sodium", 
      aliases: ["sodium", "na", "serum sodium"] 
    },
    { 
      name: "Potassium", 
      aliases: ["potassium", "k", "serum potassium"] 
    },
    { 
      name: "Chloride", 
      aliases: ["chloride", "cl", "serum chloride"] 
    },
    { 
      name: "eGFR", 
      aliases: ["egfr", "estimated gfr", "gfr"] 
    },
    { 
      name: "BUN/Creatinine Ratio", 
      aliases: ["bun/creatinine ratio", "bun creatinine ratio", "bun:creat"] 
    }
  ],

  liver: [
    { 
      name: "ALT", 
      aliases: ["alt", "sgpt", "alanine aminotransferase", "alanine transaminase"] 
    },
    { 
      name: "AST", 
      aliases: ["ast", "sgot", "aspartate aminotransferase", "aspartate transaminase"] 
    },
    { 
      name: "Bilirubin", 
      aliases: ["bilirubin", "total bilirubin", "bilirubin total"] 
    },
    { 
      name: "Direct Bilirubin", 
      aliases: ["direct bilirubin", "conjugated bilirubin", "bilirubin direct"] 
    },
    { 
      name: "Indirect Bilirubin", 
      aliases: ["indirect bilirubin", "unconjugated bilirubin", "bilirubin indirect"] 
    },
    { 
      name: "Alkaline Phosphatase", 
      aliases: ["alkaline phosphatase", "alp", "alk phos"] 
    },
    { 
      name: "GGT", 
      aliases: ["ggt", "gamma gt", "gamma glutamyl transferase"] 
    },
    { 
      name: "Total Protein", 
      aliases: ["total protein", "protein total", "serum protein"] 
    },
    { 
      name: "Albumin", 
      aliases: ["albumin", "serum albumin"] 
    },
    { 
      name: "Globulin", 
      aliases: ["globulin", "serum globulin"] 
    },
    { 
      name: "A/G Ratio", 
      aliases: ["a/g ratio", "albumin/globulin ratio", "albumin globulin ratio"] 
    }
  ],

  bp: [
    { 
      name: "Systolic", 
      aliases: ["systolic", "systolic pressure", "sbp"] 
    },
    { 
      name: "Diastolic", 
      aliases: ["diastolic", "diastolic pressure", "dbp"] 
    },
    { 
      name: "Pulse", 
      aliases: ["pulse", "heart rate", "hr", "pulse rate"] 
    }
  ],

  diabetes: [
    { 
      name: "Fasting Blood Sugar", 
      aliases: ["fasting blood sugar", "fbs", "fasting glucose", "fasting blood glucose"] 
    },
    { 
      name: "Random Blood Sugar", 
      aliases: ["random blood sugar", "rbs", "random glucose", "random blood glucose"] 
    },
    { 
      name: "Postprandial Blood Sugar", 
      aliases: ["postprandial blood sugar", "ppbs", "post prandial", "pp blood sugar", "2 hour pp"] 
    },
    { 
      name: "HbA1c", 
      aliases: ["hba1c", "glycated hemoglobin", "glycosylated hemoglobin", "a1c"] 
    }
  ],

  vitamin: [
    { 
      name: "Vitamin D", 
      aliases: ["vitamin d", "vit d", "25 oh vitamin d", "25-hydroxyvitamin d"] 
    },
    { 
      name: "Vitamin B12", 
      aliases: ["vitamin b12", "vit b12", "b12", "cobalamin"] 
    },
    { 
      name: "Folate", 
      aliases: ["folate", "folic acid", "vitamin b9"] 
    },
    { 
      name: "Vitamin A", 
      aliases: ["vitamin a", "vit a", "retinol"] 
    },
    { 
      name: "Vitamin E", 
      aliases: ["vitamin e", "vit e", "tocopherol"] 
    }
  ],

  urine: [
    { 
      name: "Color", 
      aliases: ["color", "colour", "urine color"] 
    },
    { 
      name: "Appearance", 
      aliases: ["appearance", "clarity", "turbidity"] 
    },
    { 
      name: "pH", 
      aliases: ["ph", "p h", "urine ph"] 
    },
    { 
      name: "Specific Gravity", 
      aliases: ["specific gravity", "sp gr", "sp. gr", "spgr"] 
    },
    { 
      name: "Protein", 
      aliases: ["protein", "albumin", "urine protein"] 
    },
    { 
      name: "Glucose", 
      aliases: ["glucose", "sugar", "urine glucose"] 
    },
    { 
      name: "Ketones", 
      aliases: ["ketones", "ketone bodies", "acetone"] 
    },
    { 
      name: "Blood", 
      aliases: ["blood", "occult blood", "hematuria"] 
    },
    { 
      name: "Bilirubin", 
      aliases: ["bilirubin", "urine bilirubin"] 
    },
    { 
      name: "Urobilinogen", 
      aliases: ["urobilinogen", "urine urobilinogen"] 
    },
    { 
      name: "Nitrite", 
      aliases: ["nitrite", "nitrites"] 
    },
    { 
      name: "Leukocyte Esterase", 
      aliases: ["leukocyte esterase", "le", "wbc esterase"] 
    }
  ],

  cardiac: [
    { 
      name: "Troponin I", 
      aliases: ["troponin i", "troponin-i", "trop i", "tni"] 
    },
    { 
      name: "Troponin T", 
      aliases: ["troponin t", "troponin-t", "trop t", "tnt"] 
    },
    { 
      name: "CK-MB", 
      aliases: ["ck-mb", "ck mb", "creatine kinase mb", "cpk-mb"] 
    },
    { 
      name: "BNP", 
      aliases: ["bnp", "b-type natriuretic peptide", "brain natriuretic peptide"] 
    },
    { 
      name: "NT-proBNP", 
      aliases: ["nt-probnp", "nt probnp", "n-terminal pro bnp"] 
    }
  ],

  hormone: [
    { 
      name: "Testosterone", 
      aliases: ["testosterone", "total testosterone", "serum testosterone"] 
    },
    { 
      name: "Estrogen", 
      aliases: ["estrogen", "estradiol", "e2"] 
    },
    { 
      name: "Progesterone", 
      aliases: ["progesterone", "p4"] 
    },
    { 
      name: "LH", 
      aliases: ["lh", "luteinizing hormone"] 
    },
    { 
      name: "FSH", 
      aliases: ["fsh", "follicle stimulating hormone"] 
    },
    { 
      name: "Prolactin", 
      aliases: ["prolactin", "prl"] 
    },
    { 
      name: "Cortisol", 
      aliases: ["cortisol", "serum cortisol"] 
    }
  ]
};

/**
 * Get parameters for a specific category
 * @param {string} category - The report category
 * @returns {Array|null} Array of parameter definitions or null if category doesn't exist
 */
function getParametersForCategory(category) {
  if (!category) return null;
  
  const normalizedCategory = category.toLowerCase().trim();
  return REPORT_PARAMETERS[normalizedCategory] || null;
}

/**
 * Get all available categories
 * @returns {Array} Array of category names
 */
function getAllCategories() {
  return Object.keys(REPORT_PARAMETERS);
}

/**
 * Check if a category exists
 * @param {string} category - The category to check
 * @returns {boolean} True if category exists
 */
function categoryExists(category) {
  if (!category) return false;
  const normalizedCategory = category.toLowerCase().trim();
  return REPORT_PARAMETERS.hasOwnProperty(normalizedCategory);
}

module.exports = {
  REPORT_PARAMETERS,
  getParametersForCategory,
  getAllCategories,
  categoryExists
};
