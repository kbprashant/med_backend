const prisma = require('../config/database');

class HealthAnalysisService {
  // Reference ranges for common tests
  referenceRanges = {
    // Blood Sugar
    'Glucose': { normal: [70, 100], unit: 'mg/dL' },
    'Fasting Blood Sugar': { normal: [70, 100], unit: 'mg/dL' },
    'Random Blood Sugar': { normal: [70, 140], unit: 'mg/dL' },
    'HbA1c': { normal: [4, 5.6], unit: '%' },

    // Cholesterol
    'Total Cholesterol': { normal: [0, 200], unit: 'mg/dL' },
    'LDL Cholesterol': { normal: [0, 100], unit: 'mg/dL' },
    'HDL Cholesterol': { normal: [40, 60], unit: 'mg/dL' },
    'Triglycerides': { normal: [0, 150], unit: 'mg/dL' },

    // Liver Function
    'SGOT': { normal: [0, 40], unit: 'U/L' },
    'SGPT': { normal: [0, 41], unit: 'U/L' },
    'Bilirubin Total': { normal: [0.3, 1.2], unit: 'mg/dL' },
    'Alkaline Phosphatase': { normal: [44, 147], unit: 'U/L' },

    // Kidney Function
    'Creatinine': { normal: [0.7, 1.3], unit: 'mg/dL' },
    'Blood Urea Nitrogen': { normal: [7, 20], unit: 'mg/dL' },
    'BUN': { normal: [7, 20], unit: 'mg/dL' },
    'Uric Acid': { normal: [3.5, 7.2], unit: 'mg/dL' },

    // Thyroid
    'TSH': { normal: [0.4, 4.0], unit: 'mIU/L' },
    'T3': { normal: [80, 200], unit: 'ng/dL' },
    'T4': { normal: [5, 12], unit: 'µg/dL' },

    // CBC
    'Hemoglobin': { normal: [12, 16], unit: 'g/dL' },
    'RBC Count': { normal: [4.5, 5.5], unit: 'million/µL' },
    'WBC Count': { normal: [4000, 11000], unit: 'cells/µL' },
    'Platelet Count': { normal: [150000, 450000], unit: 'cells/µL' },

    // Vitamins
    'Vitamin D': { normal: [30, 100], unit: 'ng/mL' },
    'Vitamin B12': { normal: [200, 900], unit: 'pg/mL' },
  };

  // Determine status based on value and reference range
  determineStatus(parameterName, value) {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 'NORMAL';

    const range = this.referenceRanges[parameterName];
    if (!range) return 'NORMAL';

    if (numericValue < range.normal[0]) return 'LOW';
    if (numericValue > range.normal[1]) return 'HIGH';
    return 'NORMAL';
  }

  // Parse OCR text to extract test results
  parseOcrText(ocrText, testType) {
    const results = [];
    const lines = ocrText.split('\n');

    for (const line of lines) {
      // Pattern: "Parameter Name : Value Unit"
      const match = line.match(/^(.+?)\s*[:\-]\s*(\d+\.?\d*)\s*([a-zA-Z/%µ]+)?/);
      
      if (match) {
        const parameterName = match[1].trim();
        const value = match[2].trim();
        const unit = match[3]?.trim() || '';

        const status = this.determineStatus(parameterName, value);

        results.push({
          testName: testType,
          parameterName,
          value,
          unit,
          status,
          referenceRange: this.referenceRanges[parameterName]
            ? `${this.referenceRanges[parameterName].normal[0]}-${this.referenceRanges[parameterName].normal[1]}`
            : null,
        });
      }
    }

    return results;
  }

  // Generate health summary from test results
  async generateHealthSummary(userId, reportIds = []) {
    try {
      // Get recent reports
      const where = { userId };
      if (reportIds.length > 0) {
        where.id = { in: reportIds };
      }

      const reports = await prisma.report.findMany({
        where,
        include: {
          testResults: true,
        },
        orderBy: { reportDate: 'desc' },
        take: reportIds.length > 0 ? reportIds.length : 5,
      });

      if (reports.length === 0) {
        return {
          summaryText: 'No reports available for analysis.',
          insights: null,
        };
      }

      // Analyze test results
      const abnormalResults = [];
      const criticalIssues = [];
      const warnings = [];

      for (const report of reports) {
        for (const result of report.testResults) {
          if (result.status === 'HIGH') {
            abnormalResults.push({
              ...result,
              reportDate: report.reportDate,
            });

            // Check for critical issues
            if (
              (result.parameterName === 'Glucose' && parseFloat(result.value) > 200) ||
              (result.parameterName === 'Total Cholesterol' && parseFloat(result.value) > 240) ||
              (result.parameterName === 'Creatinine' && parseFloat(result.value) > 2.0)
            ) {
              criticalIssues.push(result.parameterName);
            }
          } else if (result.status === 'LOW') {
            abnormalResults.push({
              ...result,
              reportDate: report.reportDate,
            });

            if (
              (result.parameterName === 'Hemoglobin' && parseFloat(result.value) < 10) ||
              (result.parameterName === 'Vitamin D' && parseFloat(result.value) < 20)
            ) {
              warnings.push(result.parameterName);
            }
          }
        }
      }

      // Generate summary text
      let summaryText = `Health Summary based on ${reports.length} recent report(s):\n\n`;

      if (abnormalResults.length === 0) {
        summaryText += '✅ All test results are within normal ranges. Keep up the good work!\n\n';
      } else {
        summaryText += `⚠️ ${abnormalResults.length} parameter(s) outside normal range:\n\n`;
        
        abnormalResults.forEach((result) => {
          summaryText += `• ${result.parameterName}: ${result.value} ${result.unit || ''} (${result.status})\n`;
        });
      }

      // Generate insights
      let insights = '';

      if (criticalIssues.length > 0) {
        insights += '🚨 **Critical Issues Detected:**\n';
        insights += `The following parameters require immediate medical attention: ${criticalIssues.join(', ')}.\n\n`;
      }

      if (warnings.length > 0) {
        insights += '⚠️ **Warnings:**\n';
        insights += `Low levels detected in: ${warnings.join(', ')}. Consider consulting your doctor.\n\n`;
      }

      if (criticalIssues.length === 0 && warnings.length === 0 && abnormalResults.length > 0) {
        insights += '📊 **Recommendations:**\n';
        insights += 'Some parameters are outside normal range. Monitor these values and consult your healthcare provider.\n\n';
      }

      if (abnormalResults.length === 0) {
        insights += '💚 **Great News:**\n';
        insights += 'All your test parameters are within healthy ranges. Continue maintaining a healthy lifestyle!\n';
      }

      // Save summary to database
      const healthSummary = await prisma.healthSummary.create({
        data: {
          userId,
          summaryText,
          insights,
          reportIds: reports.map((r) => r.id),
        },
      });

      return healthSummary;
    } catch (error) {
      console.error('Error generating health summary:', error);
      throw error;
    }
  }

  // Get parameter trends over time
  async getParameterTrends(userId, parameterName, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const reports = await prisma.report.findMany({
      where: {
        userId,
        reportDate: { gte: startDate },
      },
      include: {
        testResults: {
          where: { parameterName },
        },
      },
      orderBy: { reportDate: 'asc' },
    });

    const trends = reports
      .filter((report) => report.testResults.length > 0)
      .map((report) => ({
        date: report.reportDate,
        value: parseFloat(report.testResults[0].value),
        unit: report.testResults[0].unit,
        status: report.testResults[0].status,
      }));

    return trends;
  }
}

module.exports = new HealthAnalysisService();
