var _      = require('underscore');
var async  = require('async');
var colors = require('colors');
var fs     = require('fs');
var moment = require('moment');
var firebase = require('./firebase_service.js');

var Sensor = require('./sensor.js');

// Console log message titles
var TITLE = {
	INFO:  ' - '.green,
	ERROR: ' ! '.red 
}

var configFile   = __dirname + '/config.json';
var config = {};

/**
 * Read config file and save it to config object
 */
function readConfig(callback) {
	fs.readFile(configFile, 'utf8', function(error, data) {
		if (error) {
			callback(error);
			return;
		}
 		config = JSON.parse(data) || {};
		callback();
	});
}

/**
 * Write config object to a file
 */
function writeConfig(callback) {
	fs.writeFile(configFile, JSON.stringify(config, null, 2), function(error) {
		if (error) {
			callback(error);
			return;
		}
		callback();
	}); 
}

var readQueue = [];

/**
 * Read sensor values
 */
function readSensors() {

	var sensorName = readQueue.shift();
	
	if (!sensorName) {
		return;
	}

	Sensor.select(sensorName);
	async.series(
		[
			Sensor.init,
			Sensor.reset,
			Sensor.longWait,
			function(callback) {
				Sensor.getSensorValues(function(error, values) {
					if (error) {
						callback(error);
						return;
					}

					//Add timestamp to values
					values.timestamp = moment().format();

					// Correct humidity in 100% if more than 99%
					if ('humidity' in values) {
						if (values.humidity > 99) {
							values.humidity = 100;
						}
					} 

					firebase.addItem(sensorName, values);
					console.log(TITLE.INFO + Sensor.getSelected().name + ':');
					console.log(values);
					callback();
				});
			},
			function(callback) {
				config.sensors[sensorName].previousReading = moment().format();
				callback();
			},
			writeConfig
		], 
		function(error) {
			Sensor.shutdown();
			if (error) {
				console.error(TITLE.ERROR + error);
			}
			readSensors();
		}
	);
}

/**
 * Application loop
 */
function loop() {
	setInterval(function () {
		
		var sensors = config.sensors || {};
				
		for (var sensor in sensors) {

			var readingInterval = sensors[sensor].readingInterval;
			var previousReading = moment(sensors[sensor].previousReading);

			if (moment().diff(previousReading, 'seconds') >= readingInterval) {
				console.log(TITLE.INFO + sensor + ' requires reading');
				readQueue.push(sensor);
			}
		}

		readSensors();		

	}, 5000);
}

/**
 * Load config file and initialize application
 */
function initialize() {
	async.series(
		[
			function(callback) {
				console.log(TITLE.INFO + 'Reading config file..');
				callback();
			},
			readConfig,
			function(callback) {
				console.log(TITLE.INFO + 'Config loaded:');

				var sensors = config.sensors || {};
				
				for (var sensor in sensors) {

					// Show sensor config
					console.log(TITLE.INFO + sensor);
					console.log('  ' + TITLE.INFO + 'Type:             ' + sensors[sensor].type);
					console.log('  ' + TITLE.INFO + 'Pin Data:         ' + sensors[sensor].pinData);
					console.log('  ' + TITLE.INFO + 'Pin SCK:          ' + sensors[sensor].pinSck);
					console.log('  ' + TITLE.INFO + 'Reading interval: ' + sensors[sensor].readingInterval + ' sec');
					console.log('  ' + TITLE.INFO + 'Previous reading: ' + sensors[sensor].previousReading);

					// Add sensor
					Sensor.add(sensor, sensors[sensor].pinData, sensors[sensor].pinSck);
				}

				callback();
			}
		], 
		function(error) {
			if (error) {
				console.error(TITLE.ERROR + error);
				return;
			}
			console.log(TITLE.INFO + 'Initialization complete. Running application..');
			loop();
		}
	);
}

initialize();



