const smartExtractor = require('./services/smartMedicalExtractor');

// Simulated OCR text from the CBC report (based on typical OCR output)
const cbcOcrText = `
Dr. Lal PathLabs  
L44-LPL YAMUNA NAGAR
67 A/L Model Town Yamuna Nagar
Phone: 01732-220084,85
YAMUNA NAGAR

Name : Mr. SURINDER VERMA                    Collected : 29-Oct-2019 12:37 PM
Lab No. : 27296218   Age : 47 Years Gender : Male  Received : 29-Oct-2019 12:37 PM
A/c Status : P       Ref By : SELF          Reported : 28-Oct-2019 02:16 PM
                                            Report Status : Final

Test Name                                  Results    Units       Bio. Ref. Interval
COMPLETE BLOOD COUNT (CBC)
(Electrical Impedence, Photometric)
Hemoglobin                                  14.30      g/dL        13.00 - 17.00
(Photometry)
Packed Cell Volume (PCV)                    40.80      %           40.00 - 50.00
(Calculated)
RBC Count                                    4.41      mill/mm3    4.50 - 5.50
(Electrical Impendence)
MCV                                         92.00      fL          80.00 - 100.00
(Electrical Impendence)
MCH                                         32.50      pg          27.00 - 32.00
(Calculated)
MCHC                                        35.10      g/dL        32.00 - 35.00
(Calculated)
Red Cell Distribution Width (RDW)           13.50      %           11.50 - 14.50
(Electrical Impendence)
Total Leukocyte Count (TLC)                  2.30      thou/mm3    4.00 - 10.00
(Electrical Impendence)
Differential Leucocyte Count (DLC)(VCS Technology)
Segmented Neutrophils                       40.90      %           40.00 - 80.00
Lymphocytes                                 52.40      %           20.00 - 40.00
Monocytes                                    5.30      %           2.00 - 10.00
Eosinophils                                  0.70      %           1.00 - 6.00
Basophils                                    0.70      %           < 2.00
Absolute Leucocyte Count (Calculated)
Neutrophils                                  0.94      thou/mm3    2.00 - 7.00
Lymphocytes                                  1.21      thou/mm3    1.00 - 3.00
Monocytes                                    0.12      thou/mm3    0.20 - 1.00
Eosinophils                                  0.02      thou/mm3    0.02 - 0.50
Basophils                                    0.02      thou/mm3    0.01 - 0.10
Platelet Count                              77.0       thou/mm3    150.00 - 450.00
(Electrical Impendence)
Platelets cross checked manually.
MPV (Mean Platelet Volume)                  10.00      fL          6.50 - 12.00
(Electrical Impendence)

Page 1 of 2
If test results are alarming or unexpected, client is advised to inform laboratory immediately for possible remedial action.
60 Tests conducted at Referral Lab.
`;

console.log('🧪 Testing CBC Report Extraction\n');
console.log('='.repeat(80));

const result = smartExtractor.extract(cbcOcrText);

console.log('\n' + '='.repeat(80));
console.log('EXTRACTION RESULTS');
console.log('='.repeat(80));
console.log(`Success: ${result.success}`);
console.log(`Total Parameters Extracted: ${result.parameters.length}`);
console.log(`Message: ${result.message || 'N/A'}\n`);

if (result.success && result.parameters.length > 0) {
  console.log('Extracted Parameters:');
  console.log('-'.repeat(80));
  
  result.parameters.forEach((param, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${param.parameter.padEnd(40)} ${param.value.toString().padEnd(8)} ${param.unit}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ SUCCESS! Extracted ${result.parameters.length} parameters from CBC report`);
  console.log('='.repeat(80));
  
  // Expected minimum parameters
  const expectedMin = 20;
  if (result.parameters.length >= expectedMin) {
    console.log(`\n✅ EXCELLENT! Got ${result.parameters.length} parameters (expected at least ${expectedMin})`);
  } else {
    console.log(`\n⚠️  WARNING: Got only ${result.parameters.length} parameters (expected at least ${expectedMin})`);
    console.log('Some parameters may not have been extracted correctly.');
  }
} else {
  console.log('❌ EXTRACTION FAILED');
  console.log('No parameters were extracted from the report.');
}
