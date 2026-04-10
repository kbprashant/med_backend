const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/authenticate');

// Public Routes
router.get('/', doctorController.getAllDoctors);
router.get('/specializations', doctorController.getSpecializations);
router.get('/specialization/:specialization', doctorController.getDoctorsBySpecialization);
router.get('/:id', doctorController.getDoctor);

// Protected Routes (require authentication)
router.put('/:id', authenticate, doctorController.updateDoctor);
router.delete('/:id', authenticate, doctorController.deleteDoctor);

module.exports = router;
