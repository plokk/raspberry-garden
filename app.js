var _          = require('underscore');
var async      = require('async');
var colors     = require('colors');
var fs         = require('fs');
var moment     = require('moment');
var firebase   = require('./js/firebase_service.js');
var Controller = require('./js/controller.js');
var Sensor     = require('./js/sensor.js');

// Console log message titles
var TITLE = {
	INFO:  ' - '.green,
	ERROR: ' ! '.red 
}

// File name where configuration is stored
var configFile  = __dirname + '/config.json';

// Config object
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

// Queue for sensor reading tasks
var readQueue = [];

/**
 * Read sensor values
 */
function readSensors() {

	// Get sensor from reading queue
	var sensorName = readQueue.shift();
	
	// No sensor queued to be read
	if (!sensorName) {
		return;
	}

	// Select sensor to be used
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


function doPourWater() {
	// Select sensor to be used
	Controller.select('water-solenoid-valve');
	async.series(
		[
			Controller.write
		], 
		function(error) {
			if (error) {
				console.error(TITLE.ERROR + error);
			}
		}
	);
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

				var controllers = config.controllers || {};
				var sensors = config.sensors || {};
				
				console.log('\n' + TITLE.INFO + 'Sensors:');
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

				console.log('\n' + TITLE.INFO + 'Controllers:');
				for (var controller in controllers) {

					// Show controller config
					console.log(TITLE.INFO + controller);
					console.log('  ' + TITLE.INFO + 'Type:             ' + controllers[controller].type);
					console.log('  ' + TITLE.INFO + 'Pin Data:         ' + controllers[controller].pinData);
					console.log('  ' + TITLE.INFO + 'Previous action:  ' + controllers[controller].previousAction);

					// Add sensor
					Controller.add(controller, controllers[controller].pinData);
				}

				callback();
			}
		], 
		function(error) {
			if (error) {
				console.error(TITLE.ERROR + error);
				process.exit(1);
				return;
			}
			console.log(TITLE.INFO + 'Initialization complete. Running application..');
			loop();
			//doPourWater();
		}
	);
}

initialize();



