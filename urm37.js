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
config.serial ={
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

var sp = new serialport.SerialPort(
  config.serial.portName, 
  config.serial.parameters, 
  false
);

var onData = function(input) {
  var buff = new Buffer(input);
  switch (buff[0]) {
    case 0x11:
      // Temperature
      var tempVal = (buff[1] << 8) + buff[2];
      var vstr = tempVal.toString();
      console.log('Temperature: ' + vstr.substr(0, vstr.length - 1) + '.' + vstr.substr(vstr.length - 1) + ' deg C');
      break;
    case 0x22:
      // Distance
      console.log('Distance: ' + ((buff[1] << 8) + buff[2]) + ' cm');
      break;
    case 0x33:
      // EEPROM read
      console.log('EEPROM read: Addr(0x' + buff[1].toString('hex') + ') : 0x' + buff[2].toString('hex'));
      break;
    case 0x44:
      // EEPROM write
      console.log('EEPROM write: Addr(0x' + buff[1].toString('hex') + ') : 0x' + buff[2].toString('hex'));
      break;
    default:
  }
  sp.close(function(error) {
    if (error) {
      console.error('Failed to close: ' + error);
      return;
    }
    console.log('Port closed');
  });
}

sp.open(function(error) {
  if (error) {
    console.error('Failed to open: ' + error);
  } else {
    console.log('Port open');
    sp.on('data', onData);
    var buff = new Buffer([0x22, 0x00, 0x00, 0x22]); // Distance
    sp.write(buff.toString('ascii'));
    //buff = new Buffer([0x11, 0x00, 0x00, 0x11]); // Temperature  
  }
});