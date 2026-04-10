/**
 * Debug test for Appearance extraction
 */

const urineOcr = `
Appearance SLIGHTLY TURBID CLEAR
Ph 6.0 4.6-8.0
`;

console.log('Testing Appearance pattern matching:\n');

const lines = urineOcr.split('\n');

for (const line of lines) {
  console.log(`Line: "${line}"`);
  
  // Test Appearance pattern
  const appearancePattern = /\bAppearance\b\s*:?\s*([^\n]{1,100})/i;
  const match = line.match(appearancePattern);
  
  if (match) {
    console.log('  ✅ MATCHED Appearance!');
    console.log(`  Captured: "${match[1]}"`);
    
    const rawValue = match[1].trim();
    const parts = rawValue.split(/\s+/);
    console.log(`  Parts: ${JSON.stringify(parts)}`);
    
    // Check qual format
    if (/^(negative|positive|trace|normal|abnormal|\+{1,4}|clear|turbid|cloudy|yellow|amber|straw|red|brown|orange|slightly|pale)$/i.test(parts[0])) {
      let value = parts[0].toUpperCase();
      let wordIndex = 1;
      
      console.log(`  First word "${parts[0]}" is qualitative, value="${value}"`);
      
      while (wordIndex < parts.length && 
             /^(yellow|pale|amber|straw|clear|turbid|cloudy|red|brown|orange|slightly|dark|light)$/i.test(parts[wordIndex])) {
        value += ' ' + parts[wordIndex].toUpperCase();
        console.log(`  Added word "${parts[wordIndex]}", value="${value}"`);
        wordIndex++;
      }
      
      console.log(`  Final value: "${value}"`);
    }
  } else {
    console.log('  ❌ No match for Appearance');
  }
  
  console.log('');
}
