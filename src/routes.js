const express = require('express');
const CalculateController = require('./controllers/CalculateController');

const routes = express.Router();

routes.post('/calculate', CalculateController.calculate);






module.exports = routes;