const ocrText = `SID NO
REF. BY
PATIENT NAME: Aurora
BIO-CHEMISTRY
TEST
Time
: 01282
Blood sugar(Fasting)
Sys
Blood sugar (Post Prandial)
Dia
.Opp.Govt.Hospital,TNHB, Perumalpattu,Veppampattu-602024
Email : kkclab21@gmail.com | Cell : +91 8939 789 467
:Self
Blood Pressure ( BP)
Pul
KKC LAB
RESULT
138
254
10:35 Am
155
98
85
End of Report.
UNITS
mg/dl
mg/dl
mm of Hg
mm of Hg
GTGyuluur 30,17
Per/mint
Working Hours :7.00 am -8.30 pm
THE GREATTAT WEAL III IS HEALTH
DATE
SEX
AGE
REFERENCE RANGE
70-110
80- 140
Lab Inch`;

console.log('📋 OCR Text Analysis:\n');

const lines = ocrText.split('\n').map(line => line.trim());

console.log('Lines with "Blood sugar":\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('blood sugar')) {
    console.log(`Line ${index}: "${line}"`);
    if (index + 1 < lines.length) {
      console.log(`  Next line: "${lines[index + 1]}"`);
    }
    if (index + 2 < lines.length) {
      console.log(`  Line +2: "${lines[index + 2]}"`);
    }
    console.log();
  }
});

console.log('\nLines with numbers:\n');
lines.forEach((line, index) => {
  if (/\d+/.test(line)) {
    console.log(`Line ${index}: "${line}"`);
  }
});

// Test extractFirstNumber
const extractFirstNumber = (text) => {
  const match = text.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
};

console.log('\n\n🧪 Testing extraction for each parameter:\n');

const fastingLine = lines.findIndex(l => l.toLowerCase().includes('blood sugar(fasting)'));
console.log(`1. Fasting Glucose found at line ${fastingLine}: "${lines[fastingLine]}"`);

const textAfterFasting = lines[fastingLine].substring(lines[fastingLine].toLowerCase().indexOf('blood sugar(fasting)') + 'blood sugar(fasting)'.length);
console.log(`   Text after label: "${textAfterFasting}"`);
console.log(`   Number extracted: ${extractFirstNumber(textAfterFasting)}`);
console.log(`   Next line: "${lines[fastingLine + 1]}"`);
console.log(`   Number from next line: ${extractFirstNumber(lines[fastingLine + 1])}`);

console.log();

const ppLine = lines.findIndex(l => l.toLowerCase().includes('blood sugar (post prandial)'));
console.log(`2. Post Prandial found at line ${ppLine}: "${lines[ppLine]}"`);

const textAfterPP = lines[ppLine].substring(lines[ppLine].toLowerCase().indexOf('blood sugar (post prandial)') + 'blood sugar (post prandial)'.length);
console.log(`   Text after label: "${textAfterPP}"`);
console.log(`   Number extracted: ${extractFirstNumber(textAfterPP)}`);
console.log(`   Next line: "${lines[ppLine + 1]}"`);
console.log(`   Number from next line: ${extractFirstNumber(lines[ppLine + 1])}`);
