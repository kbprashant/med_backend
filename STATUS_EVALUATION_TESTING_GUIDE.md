# Quick Testing Guide - Status Evaluation Fix

## 🧪 How to Verify the Fix

### Option 1: Run Automated Tests (Recommended)
```bash
cd med_backend
node test_status_evaluator.js
```

**Expected Output:**
```
✅ Passed: 18/18
🎉 All tests passed!
```

---

### Option 2: Test with Real Report Upload

#### 1. Start the Backend
```bash
cd med_backend
node server.js
```

#### 2. Upload a Test Report
Use any existing test report with values outside normal ranges.

#### 3. Check Database
```bash
cd med_backend
node check_latest_report.js
```

**Look for:**
- Parameters with HIGH status (values above reference range)
- Parameters with LOW status (values below reference range)
- Parameters with ABNORMAL status (qualitative values not matching reference)
- Parameters with NORMAL status (values within range)

---

### Option 3: Test Specific Scenarios

#### Blood Sugar Report with HIGH values
```bash
cd med_backend
node check_latest_report.js
```

**Expected:**
- Fasting Glucose: 138 mg/dL → status: "HIGH"
- Post Prandial: 254 mg/dL → status: "HIGH"

#### Urine Report with ABNORMAL values
**Expected:**
- Glucose: "++" → status: "ABNORMAL"
- Protein: "TRACE" → status: "ABNORMAL"
- Color: "NEGATIVE" → status: "NORMAL"

---

## 🔍 What to Look For

### In Database (testResult table)
```sql
SELECT parameterName, value, referenceRange, status 
FROM testResult 
WHERE reportId = [latest_report_id];
```

### Expected Status Distribution
- ✅ HIGH: Values above maximum reference
- ✅ LOW: Values below minimum reference
- ✅ ABNORMAL: Qualitative values not matching reference
- ✅ NORMAL: Values within reference range

### ❌ NO MORE:
- ~~All parameters showing "NORMAL" regardless of value~~

---

## 🎯 Specific Test Cases to Verify

### 1. Blood Sugar (Numeric Range)
| Parameter | Value | Reference | Expected Status |
|-----------|-------|-----------|----------------|
| Fasting Glucose | 138 | 70-110 | HIGH ✅ |
| Fasting Glucose | 95 | 70-110 | NORMAL ✅ |
| Fasting Glucose | 65 | 70-110 | LOW ✅ |

### 2. Liver Function (Numeric Range)
| Parameter | Value | Reference | Expected Status |
|-----------|-------|-----------|----------------|
| ALT | 100 | 10-49 | HIGH ✅ |
| ALT | 30 | 10-49 | NORMAL ✅ |
| ALT | 5 | 10-49 | LOW ✅ |

### 3. Kidney Function (Numeric Range)
| Parameter | Value | Reference | Expected Status |
|-----------|-------|-----------|----------------|
| Creatinine | 1.5 | 0.7-1.2 | HIGH ✅ |
| Creatinine | 0.9 | 0.7-1.2 | NORMAL ✅ |
| Creatinine | 0.6 | 0.7-1.2 | LOW ✅ |

### 4. Urine (Qualitative)
| Parameter | Value | Reference | Expected Status |
|-----------|-------|-----------|----------------|
| Glucose | ++ | NEGATIVE | ABNORMAL ✅ |
| Glucose | NEGATIVE | NEGATIVE | NORMAL ✅ |
| Color | YELLOW | YELLOW | NORMAL ✅ |
| Color | RED | YELLOW | ABNORMAL ✅ |

---

## 🐛 Troubleshooting

### Issue: All statuses still showing "NORMAL"
**Solution:** Restart the backend server to reload the updated code:
```bash
# Stop the current server (Ctrl+C)
cd med_backend
node server.js
```

### Issue: Status is "NORMAL" but value seems wrong
**Possible causes:**
1. Reference range not extracted from OCR
2. Parameter name doesn't match master data

**Debug with:**
```javascript
// In determineStatus method, add console.log:
console.log('Parameter:', param.parameter);
console.log('Value:', param.value);
console.log('Reference Range:', param.referenceRange);
```

### Issue: Test fails
**Check:**
1. Node.js version (should be 14+)
2. All dependencies installed: `npm install`
3. statusEvaluator.js file exists in utils/

---

## 📊 Success Criteria

✅ Automated test suite passes (18/18)
✅ Real report uploads show correct statuses
✅ HIGH status for values above range
✅ LOW status for values below range
✅ ABNORMAL status for qualitative mismatches
✅ NORMAL status for values within range
✅ API returns unchanged response format
✅ Flutter UI displays status correctly

---

## 🆘 Need Help?

1. Run automated tests first: `node test_status_evaluator.js`
2. Check server logs for warnings
3. Verify database has updated values
4. Review [UNIVERSAL_STATUS_EVALUATION_COMPLETE.md](./UNIVERSAL_STATUS_EVALUATION_COMPLETE.md) for details

---

## ✅ Quick Verification Checklist

- [ ] Ran automated tests (18/18 passed)
- [ ] Uploaded test report with abnormal values
- [ ] Checked database for correct statuses
- [ ] Verified API response format unchanged
- [ ] Tested in Flutter app (if applicable)
- [ ] All statuses correctly reflect value vs reference range

**If all checked ✅, the fix is working correctly!**
