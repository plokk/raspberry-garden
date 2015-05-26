// config

var config = {};
config.serial ={
  portName: "/dev/ttyAMA0"
};
config.sensor ={
  measureInterval: 500
};

// logic
var serialport = require("serialport");
var sp = new serialport.SerialPort(config.serial.portName, {
  baudrate: 9600,
  databits: 8,
  parity: 'none',
  stopBits:1,
  flowControl: false,
  parser: serialport.parsers.byteLength(4)
});

// data from Serial port
sp.on('data', function (input) {
  var buff = new Buffer(input);
  // console.log('data RAW: ', buff.toString('hex'));
  switch (buff[0]) {
    case 0x11:
      // Temperature
      var tempVal = (buff[1] << 8) + buff[2];
      var vstr = tempVal.toString();
      console.log('Temperature : ' + vstr.substr(0, vstr.length - 1) + '.' + vstr.substr(vstr.length - 1) + ' deg C');
      break;
    case 0x22:
      // Distance
      console.log('Distance : ' + ((buff[1] << 8) + buff[2]) + ' cm');
      break;
    case 0x33:
      // EEPROM read
      console.log('EEPROM read : Addr(0x' + buff[1].toString('hex') + ') : 0x' + buff[2].toString('hex'));
      break;
    case 0x44:
      // EEPROM write
      console.log('EEPROM write : Addr(0x' + buff[1].toString('hex') + ') : 0x' + buff[2].toString('hex'));
      break;
    default:
  }
});

sp.on('close', function(err) {
  console.log('port closed');
});

sp.on('open', function(err) {
  console.log('port opened');
});

var sensorActivity = setInterval(function(){
  var buff = new Buffer([0x22, 0x00, 0x00, 0x22]);
  //  console.log('Client sent us: ' + buff.toString('hex'));
  sp.write(buff.toString('ascii'), function(err, bytesWritten) {
    // console.log('bytes written: ', bytesWritten);
  });
}, config.sensor.measureInterval);

var sensorActivity2 = setInterval(function(){
  var buff = new Buffer([0x11, 0x00, 0x00, 0x11]);
  sp.write(buff.toString('ascii'), function(err, bytesWritten) {
  });
}, config.sensor.measureInterval * 10);
