var async = require('async');
var SHT1x = require('pi-sht1x');

async.series([
  SHT1x.init,
  SHT1x.reset,
  function(callback) {
    SHT1x.getSensorValues(function(error, values) {
      console.log(values);
      callback(error);
    });
  }
], function(error) {
  SHT1x.shutdown();
  if (error) {
    console.error(error);
  }
});
