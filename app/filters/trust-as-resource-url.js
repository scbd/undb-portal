define(['app'], function(app) { 'use strict';
  app.filter('trustAsResourceUrl', ['$sce', function($sce) {
      return function(val) {
          return $sce.trustAsResourceUrl(val);
      };
  }]);
});