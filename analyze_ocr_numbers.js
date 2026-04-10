const ocrText = `Dr Lat Pathlabs
L44-LPL YAMUNA NAGAR
Pihone: 01732-220984.85
YAMUNA NAGAR
Name
Lab No.
Alc Status
Test Name
Hemoglobin
(Pholometry)
(Cakculated)
cOMPLETE BLOoD COUNT (CBC)
|(Electrical Impelence, Photometric)
RBC Count
Packed Cell VoluIme (PCV)
MCV
(Electrical Impendence)
MCH
ICalculated)
(Electrical Impendence)
MCHC
(Calculated)
(Electrical Impendence)
Red Cell Distribution Width (RDW)
Tolal Leukocyte Count (TLC)
Lymphocytes
(Electrical Impendence)
Monocyles
Muna Nagar
Eosinophils
Mr. SURINDER VERMA
Basophils
272960213
Neutrophils
Lymphocytes
Monocytes
Eosinophils
Absolute Leucocyte Count (Calculated)
Basophils
Piatelet Count
Age
Ref By
Page 1 of2
(Electrical Impendence)
Difterentlal Leucocyte Count (DLC)(VCS Technology)
Segmented Neutrophils
Platelets oross checked manually.
MPV (Mean Platelet Volume)
(Electrical Impedence)
Read, otce/Nalionai Reterence Lab: D: La PaLabs LIa,. Brcck E SKROI- 18. Ronin, New Daty- 11coss
TeK +91-1-3024-910o. 3988-9050, Fax: +91-11-2788-2134, Email: afpathlas@NIpathabs.com`;

console.log('🔢 All numbers found in OCR text:');
console.log('━'.repeat(70));

const numbers = ocrText.match(/\d+(\.\d+)?/g) || [];
numbers.forEach((num, idx) => {
    // Find the context around this number
    const index = ocrText.indexOf(num);
    const before = ocrText.substring(Math.max(0, index - 40), index);
    const after = ocrText.substring(index + num.length, Math.min(ocrText.length, index + num.length + 40));
    
    console.log(`\n${idx + 1}. "${num}"`);
    console.log(`   Context: ...${before}[${num}]${after}...`);
});

console.log('\n');
console.log('━'.repeat(70));
console.log('Total numbers found:', numbers.length);
console.log('');
console.log('🔍 Expected values for CBC test (from image):');
console.log('   Hemoglobin: 14.30 g/dL');
console.log('   RBC Count: 4.80 mill/cumm');
console.log('   PCV: 42.70 %');
console.log('   MCV: 88.90 fL');
console.log('   MCH: 29.80 pg');
console.log('   MCHC: 33.50 g/dL');
console.log('   RDW: 13.20 %');
console.log('   TLC: 7600 cells/cumm');
console.log('   Neutrophils: 49.00 %');
console.log('   Lymphocytes: 42.00 %');
console.log('   Monocytes: 6.00 %');
console.log('   Eosinophils: 3.00 %');
console.log('   Basophils: 0.02 %');
console.log('');
console.log('❌ None of these values appear in the OCR text!');
console.log('');
console.log('💡 Root cause: OCR is reading left-to-right, top-to-bottom');
console.log('   but the table has values in columns to the right.');
console.log('   Google ML Kit is not preserving the table column structure.');
