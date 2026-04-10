const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const authenticate = require('../middleware/authenticate');

// All routes are protected
router.use(authenticate);

router.post('/summary', healthController.generateSummary);
router.get('/summary/latest', healthController.getLatestSummary);
router.get('/summary', healthController.getAllSummaries);
router.get('/trends', healthController.getParameterTrends);
router.get('/insights/:testType', healthController.getTestTypeInsights);

module.exports = router;
