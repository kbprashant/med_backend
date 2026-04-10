/**
 * Debug reference range extraction
 */

const line = "Ph 6.0 4.6-8.0";
const parts = line.split(/\s+/);

console.log('Debugging reference range extraction:\n');
console.log(`Line: "${line}"`);
console.log(`Parts: ${JSON.stringify(parts)}`);

// parts[0] = "Ph"parts[1] = "6.0"
// parts[2] = "4.6-8.0"

console.log(`\nChecking each part for reference range pattern:`);
for (let i = 1; i < parts.length; i++) {
  const isRefRange = /^[0-9.]+\-[0-9.]+$/.test(parts[i]);
  console.log(`  parts[${i}] = "${parts[i]}" → ${isRefRange ? '✅ IS ref range' : '❌ not ref range'}`);
}

// Now test the full extraction logic
const pattern = /\bPh\b\s*:?\s*([^\n]{1,100})/i;
const match = line.match(pattern);

if (match) {
  console.log(`\n✅ Pattern matched!`);
  console.log(`Captured: "${match[1]}"`);
  
  const rawValue = match[1].trim();
  const valueParts = rawValue.split(/\s+/);
  
  console.log(`Value parts: ${JSON.stringify(valueParts)}`);
  
  // Should be numeric
  let value = '';
  let referenceRange = '';
  
  if (/^[0-9OIl.C]+/.test(valueParts[0])) {
    value = valueParts[0];
    console.log(`Value: "${value}"`);
    
    // Check for reference range
    for (let i = 1; i < valueParts.length; i++) {
      if (/^[0-9.]+\-[0-9.]+$/.test(valueParts[i])) {
        referenceRange = valueParts[i];
        console.log(`✅ Found reference range: "${referenceRange}"`);
        break;
      }
    }
    
    if (!referenceRange) {
      console.log(`❌ No reference range found`);
    }
  }
}
