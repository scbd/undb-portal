define(['app', 'angular', 'realmConf'], function (app, angular, realmConf) { 'use strict';

    app.provider("realm", {

        $get : ["$location", function($location) {

            return realmConf.realm;
        }]
    });



}); //define
