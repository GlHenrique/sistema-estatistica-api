const express = require('express');
const CalculateController = require('./controllers/CalculateController');

const routes = express.Router();

routes.post('/calculate', CalculateController.calculate);
routes.post('/probability', CalculateController.calculateProbability);
routes.post('/correlation', CalculateController.calculateCorrelation);
routes.get('/ping', CalculateController.ping);

module.exports = routes;
