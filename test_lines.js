/**
 * Simple test to see what lines are in the OCR
 */

const ocrText = `Sex : Male
Yash M. Patel
Age: 21 Years
PID:555
DRLOGY PATHOLOGY LAB
Investigation
CLI
T3, TOTAL, SERUM
rSH
105 -108, SMART VISION COMPLEX, HEALTHCARE ROAD, OPPOSITE HEALTHCARE COMPLEX. MUMBAI -689578
T4, TOTAL, SERUM
CLIE
Accurate | Caring | Instant
Note
Thanks for Reference
Sample Collected At:
125, Shivam Bungalow, S G Road,
Mumbai
THYROID PROFILE, TOTAL
13.60
Medical Lab Technician
(DMLT, BMLT)
Ref. By: Dr. Hiren Shah
Result
10.10
217.40
High
High
Hiah
80.00 - 200.00
***End of Report****
Reference Value
4.50 -12.50
Dr. Payal Shah
L0123456789 | 0912345678
drlogypathlab@drlogy.com
0,40- 4.00
(MD, Pathologist)`;

// Normalize like the extractor does
const normalized = ocrText
  .replace(/[ \t]+/g, ' ')
  .replace(/[^\w\s\n.,;:()\/%µ°\-]/g, ' ')
  .replace(/ +/g, ' ')
  .replace(/\n+/g, '\n')
  .trim();

const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);

console.log('Total lines:', lines.length);
console.log('\nAll lines:');
lines.forEach((line, idx) => {
  console.log(`Line ${idx}: "${line}"`);
});
