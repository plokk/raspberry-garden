"use strict";

var Firebase = require('firebase');

var FirebaseService = {
    data: new Firebase('https://greenhouse-data.firebaseio.com/'),

    addItem: function(device, item) {
        this.data.child(device).push(JSON.stringify(item));
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