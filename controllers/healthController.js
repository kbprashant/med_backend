const prisma = require('../config/database');
const healthAnalysisService = require('../services/healthAnalysisService');

class HealthController {
  // Generate health summary
  async generateSummary(req, res, next) {
    try {
      const userId = req.user.id;
      const { reportIds } = req.body; // Optional: specific report IDs

      const summary = await healthAnalysisService.generateHealthSummary(
        userId,
        reportIds || []
      );

      res.json({
        message: 'Health summary generated successfully',
        summary,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get latest health summary
  async getLatestSummary(req, res, next) {
    try {
      const userId = req.user.id;

      const summary = await prisma.healthSummary.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!summary) {
        return res.status(404).json({ error: 'No health summary found' });
      }

      res.json({ summary });
    } catch (error) {
      next(error);
    }
  }

  // Get all health summaries
  async getAllSummaries(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [summaries, total] = await Promise.all([
        prisma.healthSummary.findMany({
          where: { userId },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.healthSummary.count({ where: { userId } }),
      ]);

      res.json({
        summaries,
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

  // Get parameter trends
  async getParameterTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const { parameter, months = 6 } = req.query;

      if (!parameter) {
        return res.status(400).json({ error: 'Parameter name is required' });
      }

      const trends = await healthAnalysisService.getParameterTrends(
        userId,
        parameter,
        parseInt(months)
      );

      res.json({
        parameter,
        trends,
        count: trends.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get insights for specific test type
  async getTestTypeInsights(req, res, next) {
    try {
      const userId = req.user.id;
      const { testType } = req.params;

      const reports = await prisma.report.findMany({
        where: { userId, testType },
        include: {
          testResults: true,
        },
        orderBy: { reportDate: 'desc' },
        take: 5,
      });

      if (reports.length === 0) {
        return res.status(404).json({ error: 'No reports found for this test type' });
      }

      // Analyze abnormal results
      const abnormalCount = {};
      const latestResults = reports[0].testResults;

      latestResults.forEach((result) => {
        if (result.status !== 'NORMAL') {
          abnormalCount[result.status] = (abnormalCount[result.status] || 0) + 1;
        }
      });

      res.json({
        testType,
        totalReports: reports.length,
        latestReportDate: reports[0].reportDate,
        abnormalCount,
        latestResults,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
