// Test the specific FT3 and FT4 extraction issue

const text = `Free Triidothyronine(FT3)) 3.26
pg/ml
0.61 - 1.12
Free Thyroxine(FT4)  0.85  ng/dl`;

const lowerText = text.toLowerCase();

// Test label matching
const labels = [
  'triidothyronine',
  'ft3',
  'free triidothyronine',
  'thyroxine',
  'ft4',
  'free thyroxine'
];

console.log('📝 Testing label matching:');
console.log('━'.repeat(70));
console.log('OCR Text:');
console.log(text);
console.log('');

labels.forEach(label => {
  const found = lowerText.includes(label);
  const index = lowerText.indexOf(label);
  console.log(`  "${label}": ${found ? '✅ FOUND at index ' + index : '❌ NOT FOUND'}`);
  
  if (found) {
    // Show what's after the label
    const searchWindow = text.slice(index, index + 150);
    console.log(`     Search window: "${searchWindow}"`);
    
    // Try to match value
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    const escapedLabel = escapeRegex(label.toLowerCase());
    
    // Pattern 2: Label with lots of whitespace before value (for tabular layouts)
    const pattern2 = new RegExp(
      `${escapedLabel}[\\s]+([0-9,]+\\.?[0-9]*)\\s*([a-z0-9/%µ°]+)?`,
      'i'
    );
    
    const match = searchWindow.match(pattern2);
    if (match) {
      console.log(`     ✅ Matched value: ${match[1]} ${match[2] || ''}`);
    } else {
      console.log(`     ❌ No value match`);
      
      // Try without escaping parentheses to see if that's the issue
      const simplePattern = new RegExp(
        `${label}[^0-9]*([0-9]+\\.?[0-9]*)`,
        'i'
      );
      const simpleMatch = searchWindow.match(simplePattern);
      if (simpleMatch) {
        console.log(`     🔧 Simple pattern matched: ${simpleMatch[1]}`);
      }
    }
  }
  console.log('');
});
