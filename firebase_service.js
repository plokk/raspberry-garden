"use strict";

var Firebase = require('firebase');

var FirebaseService = {
    data: new Firebase('https://shining-heat-364.firebaseio.com/greenhouse/'),

    addItem: function(device, item) {
        this.data.child(device).push(item);
    },

    getAllDeviceData: function(device, callback) {
        this.data.child(device).on("value", function(values) {
            callback(values.val());
        }, function (errorObject) {
            return errorObject.code;
        });
    }

};

module.exports = FirebaseService;