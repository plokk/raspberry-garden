var async = require('async');
var Sensor = require('./sensor.js');
var fs = require('fs');
var moment = require('moment');

var file = __dirname + '/config.json';
var config = {};

function readConfig(callback) {
	fs.readFile(file, 'utf8', function(error, data) {
		if (error) {
			console.log(error);
			return;
		}
		console.log("Config loaded");
		config = JSON.parse(data);
		callback();
	});
}

function writeConfig(callback) {
	fs.writeFile(file, JSON.stringify(config, null, 2), function(error) {
		if (error) {
			console.log(error);
			return;
		}
		callback();
	}); 
}

function readSensors(callback) {
	async.series([
		Sensor.init,
		Sensor.reset,
		Sensor.longWait,
		function(callback) {
			Sensor.getSensorValues(function(error, values) {
				console.log(Sensor.getSelected().name + ':');
				console.log(values);
				callback(error);
			});
		},
		function(callback) {
			config.previousReading = moment();
			callback();
		},
		writeConfig
	], function(error) {
		Sensor.shutdown();
		if (error) {
			console.error(error);
		}
		callback();
	});
}

function runLoop() {
	async.series([
	readConfig,
	function(callback) {
		console.log('Config:');
		console.log(config);
		if (config.previousReading) {
			var previousReading = moment(config.previousReading);	
			// Time for a new reading
			var message = false;
			while (moment().diff(previousReading, 'seconds') < 20) {
				if (message === false) {
					console.log('Last reading less than 20 sec ago. Waiting..');
					message = true;
				}
			}
		}
		
		console.log('Time for a new reading');
		// Time for a new reading
		readSensors(callback);
		
	},
	], function(error) {
		if (error) {
			console.error(error);
		}
		runLoop();
	});
}

Sensor.add('soil-temperature-and-humidity', 18, 16);
Sensor.select('soil-temperature-and-humidity');

runLoop();




