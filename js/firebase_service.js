'use strict';

var Firebase = require('firebase');

var FirebaseService = {
    data: new Firebase('https://greenhouse-data.firebaseio.com/sensordata'),

    addItem: function(device, item) {
        this.data.child(device).push(item);
    },

    getAllDeviceData: function(device, callback) {
        this.data.child(device).limitToLast(5).on('value', function(values) {
            callback(values.val());
        }, function (errorObject) {
            return errorObject.code;
        });
    }
};

module.exports = FirebaseService;