'use strict';

/**
 * Node.js Raspberry Pi URM37 distance & temperature sensor controller
 * Author:  Antti Laakso (https://github.com/plokk)
 * Date:    May 2015
 * License: CC BY-SA v3.0 - http://creativecommons.org/licenses/by-sa/3.0/
 */

var async      = require('async');       // https://npmjs.org/package/async
var serialport = require('serialport');  // https://www.npmjs.com/package/serialport

var config = {};
var sp = null;

var URM37 = {
  init: function(callback) {
    config.serial = {
      portName: '/dev/ttyAMA0',
      parameters: {
        baudrate: 9600,
        databits: 8,
        parity: 'none',
        stopBits:1,
        flowControl: false,
        parser: serialport.parsers.byteLength(4)
      }
    };

    sp = new serialport.SerialPort(
      config.serial.portName, 
      config.serial.parameters, 
      false
    );

    callback();
  },

  closePort: function(callback) {
    sp.close(function(error) {
      if (error) {
        callback(error);
        return;
      }
      callback();
    });
  },

  openPort: function(callback) {
    sp.open(function(error) {
      if (error) {
        callback(error);
        return;
      }
      callback();
    });
  },

  readSensorValues: function(valuesCallback) {
    var distance, temperature;
    async.series([
      function(callback) {
        readDistance(function(error, value) {
          distance = value;
          callback(error);
        });
      },
      function(callback) {
        readTemperature(function(error, value) {
          temperature = value;
          callback(error);
        });
      }
    ], function(error) {
      valuesCallback(error, { distance: distance, temperature: temperature });
    });
  }

}

module.exports = URM37;

function readDistance(callback) {
    var buff = new Buffer([0x22, 0x00, 0x00, 0x22]); // Distance
    
    sp.on('data', function(input) { 
      var buff = new Buffer(input);
      if (buff[0] == 0x22) {
        // Distance
        var distance = ((buff[1] << 8) + buff[2]);
        //console.log('Distance: ' + distance + ' cm'); 
        callback(null, distance);
      }
    });

    sp.write(buff.toString('ascii'), function(error, results) {
      if (error) {
        callback(error);
        return;
      }
    });
}

function readTemperature(callback) {
    var buff = new Buffer([0x11, 0x00, 0x00, 0x11]); // Temperature
    sp.on('data', function(input) { 
      var buff = new Buffer(input);
      if (buff[0] == 0x11) {
        // Temperature
        var tempVal = (buff[1] << 8) + buff[2];
        var vstr = tempVal.toString();
        var temperature = vstr.substr(0, vstr.length - 1) + '.' + vstr.substr(vstr.length - 1);
        //console.log('Temperature: ' + temperature + ' deg C');   
        callback(null, parseFloat(temperature));
      }
    });

    sp.write(buff.toString('ascii'), function(error, results) {
      if (error) {
        callback(error);
        return;
      }
    });
}

/*
case 0x33:
// EEPROM read
console.log('EEPROM read: Addr(0x' + buff[1].toString('hex') + ') : 0x' + buff[2].toString('hex'));
break;
case 0x44:
// EEPROM write
console.log('EEPROM write: Addr(0x' + buff[1].toString('hex') + ') : 0x' + buff[2].toString('hex'));
break;
*/