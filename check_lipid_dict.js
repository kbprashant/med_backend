const dictionaryLoader = require('./services/dictionary/dictionaryLoader');

const dict = dictionaryLoader.loadDictionaries();
const lipidParams = dict.LIPID.parameters;

console.log('\nLIPID Parameters:');
console.log('==================\n');

Object.keys(lipidParams).forEach(key => {
  const param = lipidParams[key];
  console.log(`${param.displayName}:`);
  console.log(`  Synonyms: ${param.synonyms.join(', ')}`);
  console.log('');
});
