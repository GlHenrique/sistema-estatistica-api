const express = require('express');
const CalculateController = require('./controllers/CalculateController');

const routes = express.Router();

routes.post('/calculate', CalculateController.calculate);
routes.get('/ping', CalculateController.ping);






module.exports = routes;