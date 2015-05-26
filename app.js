var _          = require('underscore');
var async      = require('async');
var colors     = require('colors');
var fs         = require('fs');
var moment     = require('moment');
var firebase   = require('./js/firebase_service.js');
var Controller = require('./js/controller.js');
var Sensor     = require('./js/sensor.js');
var Twitter    = require('twitter');

var twitterClient;

// Console log message titles
var TITLE = {
	INFO:  ' - '.green,
	ERROR: ' ! '.red 
}

// File where configuration is stored
var configFile  = __dirname + '/config.json';

// File where latest webcam snapshot is stored
var webcamImage = __dirname + '/image.jpg';

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

var lastData = {};

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

					if (!sensorName in lastData) {
						lastData[sensorName] = {};
					}

					lastData[sensorName] = values;

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

function doGrabWebcam() {
	console.log(TITLE.INFO + 'Init Webcam');
	var exec = require('child_process').exec;

	exec('fswebcam ' + webcamImage + ' -d /dev/video0 -r 1024x768 --no-banner',
		function(error, stdout, stderr) {
			if (error) {
				console.error(TITLE.ERROR + error);
				return;
			}
			
			console.log(TITLE.INFO + 'Snapshot captured');
    		doMediaTweet();
		}
	);
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
				return;
			}

			var sensorName = 'water-solenoid-valve';
			//Add timestamp to values
			var values = {
				timestamp: moment().format(),
				duration: 5000
			}

			firebase.addItem(sensorName, values);
			console.log(TITLE.INFO + 'Water poured for 5000ms');
			
		}
	);
}

function doMediaTweet() {
	var data = fs.readFileSync(webcamImage);

	twitterClient.post('media/upload', 
		{ media: data }, 
		function(error, media, response) {

			if (error) {
				console.error(TITLE.ERROR + 'Error uploading media:');
				console.error(error);
				return;
			}

			console.log(media);

			// Lets tweet it
			var status = {
				status: '🌱 Yeah, I am a media tweet.',
				media_ids: media.media_id_string // Pass the media id string
			}

			twitterClient.post('statuses/update', status, 
				function(error, tweet, response) {
					if (error) {
						console.error(TITLE.ERROR + 'Error in tweet:');
						console.error(error);
					}
				}
			);
		
		}
	);
}

function doTweet() {
	twitterClient.post('statuses/update', 
		{ 
			status: '🌱 Doing great! Air temperature is +23℃ and soil moisture is 96%' 
		}, 
		function(error, tweet, response) {
			if (error) {
				console.error(TITLE.ERROR + 'Error in tweet:');
				console.error(error);
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

			if ('twitter' in config) {
				twitterClient = new Twitter({
					consumer_key: config.twitter.consumerKey,
					consumer_secret: config.twitter.consumerSecret,
					access_token_key: config.twitter.accessTokenKey,
					access_token_secret: config.twitter.accessTokenSecret
				});
			}

			console.log(TITLE.INFO + 'Initialization complete. Running application..');

			loop();
			//doPourWater();
			//doTweet();
			//doMediaTweet();
			//doGrabWebcam();
		}
	);
}

initialize();



