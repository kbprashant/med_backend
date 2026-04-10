const line1 = "T3, TOTAL, SERUM";
const line2 = "T4, TOTAL, SERUM";

// Test skip patterns
const skip1 = /email|phone|hospital|clinic|lab|address|patient|incharge|reference\s*range|working\s*hours|sid\s*no|ref\.\s*by|interpretation|source|mobile|scan\s+to|landmark|township|diagnostics|pathology|hyderabad|telangana|gmail|www\.|indicating|indicates|prediabetes|diabetes\s+mellitus/i;
const skip2 = /road|street|avenue|nagar|city|town|village|bilaspur|bangalore|delhi|mumbai|nursing\s+home|hospital|clinic|\d{6}/i;
const skip3 = /variation|circadian|peak\s+levels|minimum|maximum|interpretation|indicate|pregnancy|trimester|subject|order\s+of|measured|serum|concentrations/i;

console.log("T3 matches skip1:", skip1.test(line1));
console.log("T3 matches skip2:", skip2.test(line1));
console.log("T3 matches skip3:", skip3.test(line1));

console.log("T4 matches skip1:", skip1.test(line2));
console.log("T4 matches skip2:", skip2.test(line2));
console.log("T4 matches skip3:", skip3.test(line2));
