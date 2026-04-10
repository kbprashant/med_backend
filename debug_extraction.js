/**
 * Debug script to see actual extracted parameter structure
 */

const reportProcessingService = require('./services/reportProcessingService');

const terminalCBCOCR = `Flabs  |HelloOlabs.in
. +91 7253928905
$ https:/www.flabs.in/
Name  r Dunuy  Pallent ID
Age/Gender  20/Male  Report ID RE1
Relerred By  Self  Collection Dale 24/06/2023 0849 PM
Pisone No  Report Date 24/06/2023 09-02 PM
HAEMATOLOGY
cOMPLETE BLOOD COUNT (CBC)
TEST DESCRIPTION  RESULT  REF RANGE  LJNIT
Haemoglobıt
15  13 17  g/dL
Total Leucocyle Coun  5000  4000 10000
Differerntıal LeucOcyte Cou!
Neulsophis  50  40 g0
Lymphocyles  20. 40
Eosınoplds  1  16
Monocytes  2 10
Basophils  0.00  0 1
Absolute Leucocyte Count
Absolute Neutrophils  2500.00  2000 7O00  CUMIn
Absolute Lynphocytes  2000.00  1000 3O00  /CuIIm
Absolute Eosinophils  50.00  20- 500  Cumnn
Absolute Monocyles  450 00  200 1000  iCumm
RBC Indices
RBC Count  5  45 55  Mil
lion/curii
MCV  80.00  81- 101
MCH  30 00  27.32
MCHC  37.50  31.5 -34.5  g/dl
He  $0  40 50
RDW CV  12  11 6 14D
ROW SD  39. 46  fL
Platetets Indices
Platele Cou  300000  150000 410000  fc:umm
PCT  35
MPV  75.11 5  1L
PDW
Ieterpretation'`;

async function debugExtraction() {
  const result = await reportProcessingService.runSmartExtraction(terminalCBCOCR);
  
  console.log('\n📋 EXTRACTED PARAMETERS (Full Structure):');
  console.log('='.repeat(80));
  
  result.parameters.forEach((p, i) => {
    console.log(`\n#${i + 1}:`);
    console.log(`  displayName: "${p.displayName || p.parameter || 'MISSING'}"`);
    console.log(`  value: ${p.value}`);
    console.log(`  unit: "${p.unit}"`);
    console.log(`  code: "${p.code || 'N/A'}"`);
    console.log(`  status: "${p.status || 'N/A'}"`);
    console.log(`  confidence: ${p.confidence || 'N/A'}`);
  });
}

debugExtraction().catch(console.error);
