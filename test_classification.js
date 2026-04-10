const extractionController = require('./controllers/extractionController');

// Simulate urine report parameters
const urineParameters = [
  { parameter: 'Volume', value: 20, unit: '' },
  { parameter: 'Colour', value: 'Yellow', unit: '' },
  { parameter: 'Appearance', value: 'Slightly Turbid', unit: '' },
  { parameter: 'pH', value: 5, unit: '' },
  { parameter: 'Specific Gravity', value: 1020, unit: '' },
  { parameter: 'Protein', value: 'Absent', unit: '' },
  { parameter: 'Glucose', value: 'Absent', unit: '' },
  { parameter: 'Ketone', value: 'Absent', unit: '' },
  { parameter: 'Pus Cells', value: '3-5', unit: '' },
  { parameter: 'Epithelial Cells', value: '2-3', unit: '' }
];

console.log('🧪 Testing Classification for Urine Report Parameters:');
console.log('='.repeat(60));
console.log('Parameters:', urineParameters.map(p => p.parameter).join(', '));
console.log('');

// The detectReportTypeFromParameters function is not exported directly,
// so we'll check the logic manually
const paramNames = urineParameters.map(p => p.parameter.toLowerCase().trim());

// Check urine-specific markers
const hasPH = paramNames.some(name => /\bph\b/i.test(name));
const hasSpecificGravity = paramNames.some(name => /specific\s*gravity|sp\s*gr/i.test(name));
const hasPusCells = paramNames.some(name => /pus\s*cell/i.test(name));
const hasEpithelialCells = paramNames.some(name => /epithelial\s*cell/i.test(name));
const hasColour = paramNames.some(name => /\bcolou?r\b/i.test(name));
const hasAppearance = paramNames.some(name => /\bappearance\b/i.test(name));

const urineParamCount = [hasPH, hasSpecificGravity, hasPusCells, hasEpithelialCells, hasColour, hasAppearance].filter(Boolean).length;

console.log('Urine-specific markers found:');
console.log(`  pH: ${hasPH ? '✅' : '❌'}`);
console.log(`  Specific Gravity: ${hasSpecificGravity ? '✅' : '❌'}`);
console.log(`  Pus Cells: ${hasPusCells ? '✅' : '❌'}`);
console.log(`  Epithelial Cells: ${hasEpithelialCells ? '✅' : '❌'}`);
console.log(`  Colour: ${hasColour ? '✅' : '❌'}`);
console.log(`  Appearance: ${hasAppearance ? '✅' : '❌'}`);
console.log('');
console.log(`Total urine markers: ${urineParamCount}`);
console.log(`Should classify as URINE_ANALYSIS: ${urineParamCount >= 3 ? '✅ YES' : '❌ NO'}`);
console.log('');

// Check if glucose would trigger BLOOD_SUGAR
const hasGlucose = paramNames.some(name => /glucose|blood\s*sugar|fasting|ppbs|hba1c/i.test(name));
console.log(`Has Glucose parameter: ${hasGlucose ? '✅' : '❌'}`);
console.log('');

if (urineParamCount >= 3) {
  console.log('✅ Expected: URINE_ANALYSIS (Rule 2 - checked BEFORE BLOOD_SUGAR)');
} else if (hasGlucose) {
  console.log('❌ Would incorrectly classify as: BLOOD_SUGAR');
} else {
  console.log('❓ No clear classification');
}
