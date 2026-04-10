// Test regex
const testParam = "free triidothyroninc ft3";
const regex = /^(t3|t4|tsh|ft3|ft4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?|total\s+(t3|t4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?)|thyroid\s+(stimulating|stim)|free\s+(t[34]|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?))(\s|$|\()/i;

console.log("Testing regex on:", testParam);
console.log("Matches:", regex.test(testParam));
console.log("Match result:", testParam.match(regex));

// Test with just the base word
const testParam2 = "triidothyroninc";
const regex2 = /tri[io]{1,2}do?thyronin[ce]?/i;
console.log("\nTesting base pattern on:", testParam2);
console.log("Matches:", regex2.test(testParam2));
console.log("Match result:", testParam2.match(regex2));

// Test the free pattern
const testParam3 = "free triidothyroninc";
const regex3 = /^free\s+(t[34]|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?)(\s|$|\()/i;
console.log("\nTesting free pattern on:", testParam3);
console.log("Match with space after:", regex3.test(testParam3 + " "));
console.log("Match with paren after:", regex3.test(testParam3 + "("));
console.log("Match with end:", regex3.test(testParam3));