/**
 * Debug test for garbage line filtering
 */

const testLines = [
  'Se ofPticnt Mrs. VIBHA (:PTA Tt Requt I)',
  'AgeiDder Speun Jrawy))N |L.0;1-i2||05',
  ':MAHABIRLB Specincn Reccivel ON',
  'Reiered RY Repot [A',
  'URINE EXAMINATION ROUTINE',
  'Volume 20.',
  'Colour YELLOW PALE YELLOW',
  'Appearance SLIGHTLY TURBID CLEAR',
  'Ph 6.0 4.6-8.0',
  'Specific Gravity 1.020 1.005-1.030'
];

console.log('Testing garbage line filtering:\n');

for (const line of testLines) {
  // Mimic isGarbageLine logic
  const lowerLine =line.toLowerCase();
  
  const garbageKeywords = [
    '\\bmrs\\b', '\\bmr\\b', '\\bmiss\\b', '\\bdr\\b',
    '\\bage\\b', '\\bgender\\b', '\\bsex\\b',
    '\\bpatient\\b', '\\bname\\b',
    '\\bspecimen\\b', '\\breceived\\b', '\\bcollection\\b',
    'referred by', '\\breport\\b',
    '\\blaboratory\\b', '\\blab\\b',
    '\\bdate\\b', '\\btime\\b',
    '\\bbarcode\\b', '\\bid\\b'
  ];
  
  let isGarbage = false;
  let reason = '';
  
  for (const keyword of garbageKeywords) {
    // Use regex with word boundary for single words, direct match for phrases
    if (keyword.includes(' ')) {
      if (lowerLine.includes(keyword)) {
        isGarbage = true;
        reason = `contains "${keyword}"`;
        break;
      }
    } else {
      const regex = new RegExp(keyword, 'i');
      if (regex.test(lowerLine)) {
        isGarbage = true;
        reason = `matches pattern ${keyword}`;
        break;
      }
    }
  }
  
  if (!isGarbage) {
    const specialCharCount = (line.match(/[^a-zA-Z0-9\s.+-]/g) || []).length;
    const ratio = specialCharCount / line.length;
    if (ratio > 0.4) {
      isGarbage = true;
      reason = `>40% special chars (${Math.round(ratio * 100)}%)`;
    }
  }
  
  console.log(`${isGarbage ? '🗑️ ' : '✅'} "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
  if (isGarbage) console.log(`   Reason: ${reason}`);
}
