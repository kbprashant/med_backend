const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./prisma/master_test_data.json', 'utf8'));

console.log('JSON file has', data.test_definitions.length, 'tests');
console.log('Metadata says:', data.metadata.total_tests, 'tests');

const categories = {};
data.test_definitions.forEach(t => {
  categories[t.category_name] = (categories[t.category_name] || 0) + 1;
});

console.log('\nTests by category:');
Object.entries(categories).sort().forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log('\nTotal:', Object.values(categories).reduce((a, b) => a + b, 0));
