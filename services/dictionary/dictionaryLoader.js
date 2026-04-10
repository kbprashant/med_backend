const fs = require('fs');
const path = require('path');

let cachedDictionary = null;

function loadDictionary() {
  if (cachedDictionary !== null) {
    return cachedDictionary;
  }

  try {
    const dictionaryPath = path.join(__dirname, 'masterDictionary.json');
    const fileContent = fs.readFileSync(dictionaryPath, 'utf8');
    cachedDictionary = JSON.parse(fileContent);
    return cachedDictionary;
  } catch (error) {
    throw new Error('Failed to load medical master dictionary');
  }
}

module.exports = { loadDictionary };
