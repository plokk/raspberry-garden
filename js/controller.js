'use strict';

/**
 * Node.js Raspberry Pi Communication Library for multiple controllers
 * Author:  Antti Laakso (https://github.com/plokk)
 * Date:    May 2015
 * License: CC BY-SA v3.0 - http://creativecommons.org/licenses/by-sa/3.0/
 */

var async = require('async');  // https://npmjs.org/package/async
var gpio = require('pi-gpio'); // https://npmjs.org/package/pi-gpio
var sleep = require('sleep');  // https://npmjs.org/package/sleep

/**
 * Controller that is currently selected for access
 */
var selectedController = null;

var Controller = {
	
	/**
	 * Controller object array
	 */
	_controllers: [],

	/**
	 * Add controller
	 *
	 * @param {string} Unique name for a controller
	 * @param {int}    Pin number for data (DATA) line
	 */
	add: function(controllerName, pinData) {
		var controller = {
			name:        controllerName,
			pinData:     pinData
		}

		this._controllers.push(controller);
	},

	/**
	 * Get a controller by controller name
	 * 
	 * @returns {object}  Controller object
	 */
	get: function(controllerName) {
		var controller;
		for (var i = 0; i < this._controllers.length; i++) {
			controller = this._controllers[i];
			if (controller.name == controllerName) {
				return controller;
			}
		}
	},

	/**
	 * Get all controllers stored in controller object array
	 * 
	 * @returns {array}  Controller object array
	 */
	getAll: function() {
		return this.controllers;
	},

	/**
	 * Get selected controller
	 * 
	 * @returns {object}  Currently selected controller object
	 */
	getSelected: function() {
		return selectedController;
	},

	/**
	 * Selects a controller to be accessed
	 *
	 * @param {string} Unique name for controller
	 */
	select: function(controllerName) {
		selectedController = this.get(controllerName) || null;
	},

	/**
	 * Pour water
	 */
	write: function(callback) {
		async.series([
			ControllerOpen,
			ControllerHigh,
			ControllerWait,
			ControllerLow,
			ControllerClose
		], function(error) {
			callback(error);
		});
	},
}

module.exports = Controller;

function ControllerOpen(callback) {
	gpio.open(selectedController.pinData, "output", callback);
}

function ControllerHigh(callback) {
	gpio.write(selectedController.pinData, 1, callback);
}

function ControllerLow(callback) {
	gpio.write(selectedController.pinData, 0, callback);
}

function ControllerClose(callback) {
	gpio.close(selectedController.pinData, callback);
}

function ControllerWait(callback) {
	setTimeout(callback, 5000);
}