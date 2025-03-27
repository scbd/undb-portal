(function(document) { 'use strict';

var gitVersion = document.documentElement.attributes['git-version'].value;
var cdnHost = 'https://cdn.cbd.int/';

require.config({
    waitSeconds: 120,
    baseUrl : 'app/',
    paths: {
        'angular'                   : cdnHost + 'angular@1.5.9/angular.min',
        'angular-route'             : cdnHost + 'angular-route@1.5.9/angular-route.min',
        'ngCookies'                 : cdnHost + 'angular-cookies@1.5.9/angular-cookies.min',
        'angular-sanitize'          : cdnHost + 'angular-sanitize@1.5.9/angular-sanitize.min',
        'authentication'            : 'factories/authentication',
        'bootstrap'                 : cdnHost + 'bootstrap@3.3.5/dist/js/bootstrap.min',
        'bootstrap-datepicker'      : cdnHost + 'bootstrap-datepicker@1.8.0/js/bootstrap-datepicker',
        'css'                       : cdnHost + 'require-css@0.1.8/css.min',
        'lodash'                    : cdnHost + 'lodash@3.10.1/index',
        'linqjs'                    : cdnHost + 'linq@3.1.0/linq.min',
        'jquery'                    : cdnHost + 'jquery@2.2.4/dist/jquery.min',
        'moment'                    : cdnHost + 'moment@2.10.5/min/moment.min',
        'moment-timezone'           : cdnHost + 'moment-timezone@0.5.4/builds/moment-timezone-with-data-2010-2020.min',
        'ngSmoothScroll'            : cdnHost + 'ngSmoothScroll@2.0.0/dist/angular-smooth-scroll.min',
        'realm'                     : 'utilities/realm',
        'shim'                      : 'libs/require-shim/src/shim',
        'text'                      : cdnHost + 'requirejs-text@2.0.15/text',
        'toastr'                    : cdnHost + 'angular-toastr@1.7.0/dist/angular-toastr.tpls.min',
        'URIjs'                     : cdnHost + 'URIjs@1.13.2/src',
        'ng-ckeditor'               : cdnHost + 'ng-ckeditor@2.0.5/dist/ng-ckeditor.min',
        'ngDialog'                  : cdnHost + 'ng-dialog@0.6.2/js/ngDialog.min',
        'ngInfiniteScroll'          : cdnHost + 'ng-infinite-scroll@1.3.0/build/ng-infinite-scroll.min',
        'angular-flex'              : 'libs/angular-flex/angular-flex',
        'eonasdan-bootstrap-datetimepicker' : cdnHost + 'eonasdan-bootstrap-datetimepicker@4.17.47/build/js/bootstrap-datetimepicker.min',
        'json'                      : cdnHost + 'requirejs-plugins@1.0.2/src/json',
    },
    shim: {
      'angular'              : { deps : ['jquery'], exports: 'angular' },
      'angular-flex'         : { deps : ['angular', 'jquery'] },
        'angular-route'            : { deps: ['angular-flex'] },
        'ngCookies'                : { deps : ['angular-flex'] },
        'bootstrap'                : { deps: ['jquery'] },
        'ngSmoothScroll'           : { deps: [ 'angular-flex']},
        'guid'                     : { exports: 'ui_guid_generator' },
        'toastr'                   : { deps: ['angular-flex']},
        'angular-sanitize'         : { deps: ['angular-flex'] },
        'ng-ckeditor'              : { deps: ['angular-flex']},
        'ngDialog'                 : { deps: ['angular-flex' ]},
        'bootstrap-datepicker'     : { deps: ['css!bootstrap-datepicker/dist/css/bootstrap-datepicker.min.css'] },
        'eonasdan-bootstrap-datetimepicker': { deps: ['jquery','moment','bootstrap','css!'+ cdnHost + 'eonasdan-bootstrap-datetimepicker@4.17.47/build/css/bootstrap-datetimepicker.min.css'] }
        },
    packages: [
        { name: 'ammap', main: 'ammap', location : 'libs/ammap3/ammap' }
    ],
    urlArgs: 'v=' + gitVersion
});

// BOOT
if (!require.defined('_slaask'))
    define("_slaask", window._slaask);


define('realmConf', [`json!/api/v2018/realm-configurations/${encodeURIComponent(window?.scbdApp?.host||'')}`], function(realmConf){
  return realmConf[0];
})

require(['angular', 'app', 'bootstrap', 'authentication','realmConf', 'routes', 'template'], function(ng, app) {
    ng.element(document).ready(function () {
         ng.bootstrap(document, [app.name]);
    });
});

// Fix IE Console
(function(a){a.console||(a.console={});for(var c="log info warn error debug trace dir group groupCollapsed groupEnd time timeEnd profile profileEnd dirxml assert count markTimeline timeStamp clear".split(" "),d=function(){},b=0;b<c.length;b++)a.console[c[b]]||(a.console[c[b]]=d)})(window); //jshint ignore:line
})(document);

if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}
