const lines = `SID NO
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
Lab Inch`.split('\n').map(l => l.trim());

console.log('=== COLUMN STRUCTURE ANALYSIS ===\n');

// Find TEST column entries
console.log('TEST COLUMN (Parameter names):');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('blood sugar') || 
      line.toLowerCase().includes('blood pressure') || 
      (line.length > 2 && i >= 4 && i <= 18 && !line.match(/^[\d\s:]+$/) && !line.match(/@|email|cell/i))) {
    console.log(`  Line ${i}: "${line}"`);
  }
});

// Find RESULT header
console.log('\nRESULT COLUMN:');
const resultIndex = lines.findIndex(l => /^(RESULT|VALUE)$/i.test(l.trim()));
console.log(`  Header at line ${resultIndex}: "${lines[resultIndex]}"`);

// Find all numeric lines after RESULT
console.log('\n  Values after RESULT:');
for (let i = resultIndex + 1; i < lines.length; i++) {
  if (/^\d+$/.test(lines[i]) || /^\d+\.\d+$/.test(lines[i])) {
    console.log(`    Line ${i}: "${lines[i]}"`);
  }
}

console.log('\n\n=== MAPPING ===');
console.log('Parameters we need:');
console.log('  1. Fasting Glucose at line 7: "Blood sugar(Fasting)"');
console.log('  2. Post Prandial at line 9: "Blood sugar (Post Prandial)"');
console.log('\nCorresponding values:');
console.log('  1. Line 18: "138" (Fasting)');
console.log('  2. Line 19: "254" (Post Prandial)');
console.log('\nProblem: How to map line 7→18 and line 9→19?');
