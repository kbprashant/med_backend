const prisma = require('../config/database');

class HistoryController {
  // Get full history with filters
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        testType,
        startDate,
        endDate,
        month,
        year,
        sortBy = 'reportDate',
        sortOrder = 'desc',
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = { userId };

      if (testType) {
        where.testType = testType;
      }

      // Date filters
      if (startDate || endDate || month || year) {
        where.reportDate = {};

        if (startDate) {
          where.reportDate.gte = new Date(startDate);
        }

        if (endDate) {
          where.reportDate.lte = new Date(endDate);
        }

        // Filter by month and year
        if (month && year) {
          const monthInt = parseInt(month);
          const yearInt = parseInt(year);
          where.reportDate.gte = new Date(yearInt, monthInt - 1, 1);
          where.reportDate.lt = new Date(yearInt, monthInt, 1);
        } else if (year) {
          const yearInt = parseInt(year);
          where.reportDate.gte = new Date(yearInt, 0, 1);
          where.reportDate.lt = new Date(yearInt + 1, 0, 1);
        }
      }

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { [sortBy]: sortOrder },
          include: {
            testResults: {
              orderBy: { testName: 'asc' },
            },
          },
        }),
        prisma.report.count({ where }),
      ]);

      res.json({
        reports,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get graph data for specific parameter
  async getGraphData(req, res, next) {
    try {
      const userId = req.user.id;
      const { parameter, months = 12 } = req.query;

      if (!parameter) {
        return res.status(400).json({ error: 'Parameter name is required' });
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(months));

      const reports = await prisma.report.findMany({
        where: {
          userId,
          reportDate: { gte: startDate },
        },
        include: {
          testResults: {
            where: { parameterName: parameter },
          },
        },
        orderBy: { reportDate: 'asc' },
      });

      const graphData = reports
        .filter((report) => report.testResults.length > 0)
        .map((report) => ({
          date: report.reportDate,
          value: parseFloat(report.testResults[0].value),
          unit: report.testResults[0].unit,
          status: report.testResults[0].status,
          reportId: report.id,
        }));

      // Highlight latest result
      if (graphData.length > 0) {
        graphData[graphData.length - 1].isLatest = true;
      }

      res.json({
        parameter,
        data: graphData,
        count: graphData.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get statistics
  async getStatistics(req, res, next) {
    try {
      const userId = req.user.id;

      const [totalReports, testTypes, recentReports] = await Promise.all([
        prisma.report.count({ where: { userId } }),
        prisma.report.findMany({
          where: { userId },
          select: { testType: true },
          distinct: ['testType'],
        }),
        prisma.report.findMany({
          where: { userId },
          orderBy: { reportDate: 'desc' },
          take: 5,
          include: {
            testResults: true,
          },
        }),
      ]);

      // Count abnormal results in recent reports
      let abnormalCount = 0;
      recentReports.forEach((report) => {
        report.testResults.forEach((result) => {
          if (result.status !== 'NORMAL') {
            abnormalCount++;
          }
        });
      });

      res.json({
        statistics: {
          totalReports,
          totalTestTypes: testTypes.length,
          recentAbnormalCount: abnormalCount,
          latestReportDate: recentReports[0]?.reportDate || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get monthly summary
  async getMonthlySummary(req, res, next) {
    try {
      const userId = req.user.id;
      const { year } = req.query;

      if (!year) {
        return res.status(400).json({ error: 'Year is required' });
      }

      const yearInt = parseInt(year);
      const startDate = new Date(yearInt, 0, 1);
      const endDate = new Date(yearInt + 1, 0, 1);

      const reports = await prisma.report.findMany({
        where: {
          userId,
          reportDate: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: { reportDate: 'asc' },
      });

      // Group by month
      const monthlySummary = Array(12).fill(0).map((_, index) => ({
        month: index + 1,
        count: 0,
        reports: [],
      }));

      reports.forEach((report) => {
        const month = report.reportDate.getMonth();
        monthlySummary[month].count++;
        monthlySummary[month].reports.push({
          id: report.id,
          testType: report.testType,
          date: report.reportDate,
        });
      });

      res.json({
        year: yearInt,
        monthlySummary,
        totalReports: reports.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Compare two reports
  async compareReports(req, res, next) {
    try {
      const userId = req.user.id;
      const { reportId1, reportId2 } = req.query;

      if (!reportId1 || !reportId2) {
        return res.status(400).json({ error: 'Two report IDs are required' });
      }

      const [report1, report2] = await Promise.all([
        prisma.report.findFirst({
          where: { id: reportId1, userId },
          include: { testResults: true },
        }),
        prisma.report.findFirst({
          where: { id: reportId2, userId },
          include: { testResults: true },
        }),
      ]);

      if (!report1 || !report2) {
        return res.status(404).json({ error: 'One or both reports not found' });
      }

      // Compare test results
      const comparison = [];
      const params1 = report1.testResults.reduce((acc, result) => {
        acc[result.parameterName] = result;
        return acc;
      }, {});

      const params2 = report2.testResults.reduce((acc, result) => {
        acc[result.parameterName] = result;
        return acc;
      }, {});

      const allParams = new Set([
        ...Object.keys(params1),
        ...Object.keys(params2),
      ]);

      allParams.forEach((param) => {
        const result1 = params1[param];
        const result2 = params2[param];

        if (result1 && result2) {
          const value1 = parseFloat(result1.value);
          const value2 = parseFloat(result2.value);
          const change = value2 - value1;
          const percentChange = value1 !== 0 ? ((change / value1) * 100).toFixed(2) : 0;

          comparison.push({
            parameter: param,
            report1: {
              value: result1.value,
              unit: result1.unit,
              status: result1.status,
            },
            report2: {
              value: result2.value,
              unit: result2.unit,
              status: result2.status,
            },
            change,
            percentChange: parseFloat(percentChange),
            trend: change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stable',
          });
        }
      });

      res.json({
        report1: {
          id: report1.id,
          testType: report1.testType,
          date: report1.reportDate,
        },
        report2: {
          id: report2.id,
          testType: report2.testType,
          date: report2.reportDate,
        },
        comparison,
      });
    } catch (error) {
      next(error);
    }
  }

  // Compare data by dates for specific category/subcategory
  async compareDateData(req, res, next) {
    try {
      const userId = req.user.id;
      const { category, subCategory, date1, date2 } = req.query;

      if (!category || !date1 || !date2) {
        return res.status(400).json({ error: 'category, date1, and date2 are required' });
      }

      // Determine which date is older
      const olderDate = new Date(date1) < new Date(date2) ? date1 : date2;
      const newerDate = new Date(date1) < new Date(date2) ? date2 : date1;

      // Build where clause
      const baseWhere = {
        report: { userId },
        testCategory: category,
      };

      if (subCategory) {
        baseWhere.testSubCategory = subCategory;
      }

      // Get results for both dates
      const [results1, results2] = await Promise.all([
        prisma.testResult.findMany({
          where: {
            ...baseWhere,
            testDate: {
              gte: new Date(olderDate + 'T00:00:00.000Z'),
              lt: new Date(olderDate + 'T23:59:59.999Z'),
            },
          },
          select: {
            parameterName: true,
            value: true,
            unit: true,
            status: true,
            normalMin: true,
            normalMax: true,
            referenceRange: true,
          },
        }),
        prisma.testResult.findMany({
          where: {
            ...baseWhere,
            testDate: {
              gte: new Date(newerDate + 'T00:00:00.000Z'),
              lt: new Date(newerDate + 'T23:59:59.999Z'),
            },
          },
          select: {
            parameterName: true,
            value: true,
            unit: true,
            status: true,
            normalMin: true,
            normalMax: true,
            referenceRange: true,
          },
        }),
      ]);

      // Build comparison
      const params1Map = results1.reduce((acc, result) => {
        acc[result.parameterName] = result;
        return acc;
      }, {});

      const params2Map = results2.reduce((acc, result) => {
        acc[result.parameterName] = result;
        return acc;
      }, {});

      const allParams = new Set([
        ...Object.keys(params1Map),
        ...Object.keys(params2Map),
      ]);

      const comparison = [];

      allParams.forEach((param) => {
        const result1 = params1Map[param];
        const result2 = params2Map[param];

        if (result1 && result2) {
          const value1 = parseFloat(result1.value) || 0;
          const value2 = parseFloat(result2.value) || 0;
          const change = value2 - value1;
          const percentChange = value1 !== 0 ? ((change / value1) * 100).toFixed(2) : 0;

          comparison.push({
            parameter: param,
            unit: result1.unit || result2.unit,
            referenceRange: result1.referenceRange || result2.referenceRange,
            olderDate: {
              date: olderDate,
              value: result1.value,
              status: result1.status,
            },
            newerDate: {
              date: newerDate,
              value: result2.value,
              status: result2.status,
            },
            change,
            percentChange: parseFloat(percentChange),
            trend: change > 0 ? 'increased' : change < 0 ? 'decreased' : 'stable',
            interpretation: getChangeInterpretation(change, result1.status, result2.status),
          });
        } else if (result1 || result2) {
          // Only one date has this parameter
          comparison.push({
            parameter: param,
            unit: (result1 || result2).unit,
            referenceRange: (result1 || result2).referenceRange,
            olderDate: result1 ? {
              date: olderDate,
              value: result1.value,
              status: result1.status,
            } : null,
            newerDate: result2 ? {
              date: newerDate,
              value: result2.value,
              status: result2.status,
            } : null,
            change: null,
            percentChange: null,
            trend: 'not_comparable',
            interpretation: 'Parameter only tested on one date',
          });
        }
      });

      res.json({
        category,
        subCategory,
        olderDate,
        newerDate,
        comparison,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Helper function to interpret changes
function getChangeInterpretation(change, oldStatus, newStatus) {
  if (change === 0) {
    return 'No change';
  }

  if (oldStatus === 'NORMAL' && newStatus === 'NORMAL') {
    return 'Both values within normal range';
  }

  if (oldStatus !== 'NORMAL' && newStatus === 'NORMAL') {
    return 'Improved to normal range';
  }

  if (oldStatus === 'NORMAL' && newStatus !== 'NORMAL') {
    return 'Moved out of normal range - needs attention';
  }

  if (change > 0) {
    return 'Increased';
  } else {
    return 'Decreased';
  }
}

module.exports = new HistoryController();
