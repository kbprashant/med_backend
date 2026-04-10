/**
 * Test script for OCR API endpoint
 * 
 * Usage:
 *   node test_ocr_api.js path/to/image.jpg
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

// Configuration
const API_URL = 'http://localhost:5000/api/ocr';

async function testOCR(imagePath) {
  if (!imagePath) {
    console.error('❌ Please provide an image path');
    console.log('Usage: node test_ocr_api.js path/to/image.jpg');
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ File not found: ${imagePath}`);
    process.exit(1);
  }

  console.log('📤 Uploading image for OCR processing...');
  console.log(`   File: ${path.basename(imagePath)}`);
  console.log(`   Size: ${(fs.statSync(imagePath).size / 1024).toFixed(2)} KB\n`);

  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    const response = await new Promise((resolve, reject) => {
      form.submit(API_URL, (err, res) => {
        if (err) return reject(err);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
        res.on('error', reject);
      });
    });

    if (response.status === 200 && response.data.success) {
      console.log('✅ OCR Processing Successful!\n');
      console.log('📝 Extracted Text:');
      console.log('─'.repeat(60));
      console.log(response.data.extractedText);
      console.log('─'.repeat(60));
      console.log(`\n📊 Confidence: ${response.data.confidence?.toFixed(2)}%`);
      console.log(`📦 Metadata:`, response.data.metadata);
    } else {
      console.error('❌ OCR Failed:', response.data);
    }

  } catch (error) {
    console.error('❌ Request Error:', error.message);
  }
}

// Run the test
const imagePath = process.argv[2];
testOCR(imagePath);
