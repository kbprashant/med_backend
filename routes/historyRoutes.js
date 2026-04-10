const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const authenticate = require('../middleware/authenticate');

// All routes are protected
router.use(authenticate);

router.get('/', historyController.getHistory);
router.get('/graph', historyController.getGraphData);
router.get('/statistics', historyController.getStatistics);
router.get('/monthly', historyController.getMonthlySummary);
router.get('/compare', historyController.compareReports);
router.get('/compare-dates', historyController.compareDateData);

module.exports = router;
