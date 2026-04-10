const ocrText = `HYDERABAD
DIAGNOSTICS
Patient Name : P. VENKATESWARLU
Age / Gender : 60 years / Male
Mobile No.:
Source : DIRECT
Test Description
Glucose Fasting (Plasma)
Interpretation :
Glucose PP (Plasma)
Interpretation :
Hyderabad Diagnostics
Value(s)
124
sSR LANDMARK, Rd Number 4, Alkapur Townshp.
Manikonda Jagir, Telangana 50o0B9.
+91 996 661 1717
Scan to Validate
A postprandial glucose reading of 141-199 mgidl indicates prediabetes.
A postprandial glucose reading over 200 mgidl indicates diabetes.
Blood Glucose Level (Fasting & Post Prandial )
Fasting Blood Sugar more than 126 mg/dl on more than one occasion can indicate Diabetes Mellitus  174
Reference Range
60- 110
hyder abaddiagnostics@gmal.com
Referral : SELF
90-140
*"END OF REPORT*
Collection Time : May 07, 2023, 11:52 a.m.
Reporting Time : May 07, 2023, 07:11 p.m.
Sample ID
LAB REPORT
www.hyderabaddiagnostics.com
Unit(s)
mgidl
mg'dl
FREE HOME
SAMPLE COLLECTION`;

console.log('Looking for "Value(s)" in OCR text...');
console.log('Contains  "Value(s)": ', ocrText.includes('Value(s)'));
console.log('');

// Try different regex patterns
console.log('Testing regex patterns:');
console.log('1. Simple:', /Value\(s\)/.test(ocrText) ? '✅' : '❌');
console.log('2. With whitespace:', /Value\s*\(\s*s\s*\)/i.test(ocrText) ? '✅' : '❌');
console.log('3. Full current pattern:', /\b(RESULT|Value\s*\(\s*s\s*\))\b/i.test(ocrText) ? '✅' : '❌');
console.log('4. Without word boundary:', /(RESULT|Value\s*\(\s*s\s*\))/i.test(ocrText) ? '✅' : '❌');
console.log('5. Just Value:', /\bValue/i.test(ocrText) ? '✅' : '❌');
