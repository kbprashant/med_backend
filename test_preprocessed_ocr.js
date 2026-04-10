const SmartMedicalExtractorV2 = require('./services/smartMedicalExtractorV2');

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

console.log('📝 Testing OCR text from preprocessed image:');
console.log('━'.repeat(70));
console.log('OCR Text Length:', ocrText.length, 'chars');
console.log('Numbers found:', (ocrText.match(/\d+(\.\d+)?/g) || []).length);
console.log('');

// Test extraction (async function)
async function runTest() {
const result = await SmartMedicalExtractorV2(ocrText);

console.log('📊 Extraction Results:');
console.log('━'.repeat(70));
console.log('Report Type:', result.reportType);
console.log('Report Type Name:', result.reportTypeName);
console.log('Parameters Extracted:', result.extractedParameters);
console.log('Total Parameters:', result.totalParameters);
console.log('Confidence:', result.confidence);
console.log('');

if (result.parameters && result.parameters.length > 0) {
    console.log('✅ Extracted Parameters:');
    result.parameters.forEach(param => {
        console.log(`   ${param.name}: ${param.value} ${param.unit || ''} [${param.method}]`);
    });
} else {
    console.log('❌ No parameters extracted');
    console.log('');
    console.log('🔍 Debugging - Check if report type was detected:');
    console.log('   Contains "Dr Lal":', ocrText.toLowerCase().includes('dr lal'));
    console.log('   Contains "Dr Lat":', ocrText.toLowerCase().includes('dr lat'));
    console.log('   Contains "CBC":', ocrText.toLowerCase().includes('cbc'));
    console.log('   Contains "Complete Blood Count":', ocrText.toLowerCase().includes('complete blood count'));
    console.log('');
    console.log('🔍 Check if parameter labels exist:');
    console.log('   Contains "Hemoglobin":', ocrText.includes('Hemoglobin'));
    console.log('   Contains "RBC":', ocrText.includes('RBC'));
    console.log('   Contains "Basophils":', ocrText.includes('Basophils'));
    console.log('');
    console.log('🔍 Looking for values near labels:');
    const lines = ocrText.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('Hemoglobin') || line.includes('Basophils') || line.includes('RBC Count')) {
            console.log(`   Line ${idx}: "${line}"`);
            if (idx > 0) console.log(`   Previous: "${lines[idx-1]}"`);
            if (idx < lines.length - 1) console.log(`   Next: "${lines[idx+1]}"`);
        }
    });
}
}

// Run the test
runTest().catch(err => console.error('Error:', err));
