define(['app', 'lodash', 'directives/map/zoom-map', 'directives/link-list', 'directives/activities-list','angular-sanitize','filters/html-sanitizer','filters/trunc','directives/links-display','filters/hack', 'directives/actors-list'], function(app, _) {
    'use strict';
    return ['$scope', 'locale', '$http', '$location', '$route', 'authentication','$sce','$filter',
        function($scope, locale, $http, $location, $route, authentication,$sce,$filter) {
            $scope.code = $route.current.params.code;
            //=======================================================================
            //
            //=======================================================================
            authentication.getUser().then(function(user) {
                $scope.user = user;

            }).then(init);

            //=======================================================================
            //
            //=======================================================================
            function trustHtml(src) {
               var returnHtml='';
                _.each(src,function(lang){
                    returnHtml+=$filter('linky')(lang)+'<hr>';
                });

                return $sce.trustAsHtml(returnHtml,'_blank');
            }
            $scope.trustHtml = trustHtml;


            //=======================================================================
            //
            //=======================================================================
            function init() {

                loadCountry().then(loadProfile).then(loadPartners);
            } // init


            //=======================================================================
            //
            //=======================================================================
            function loadCountry() {
                return $http.get('https://api.cbd.int/api/v2013/countries/' + $scope.code.toUpperCase(), {
                    cache: true,
                }).then(function(res) {

                    $scope.country = res.data;
                    $scope.country.code = res.data.code.toLowerCase();
                    $scope.country.name = res.data.name[locale];
                    $scope.country.cssClass = 'flag-icon-' + $scope.country.code;
                });
            } // init


            //=======================================================================
            //
            //=======================================================================
            function loadPartners() {
                var queryParameters = {
                    'q': 'schema_s:undbPartner AND _state_s:public AND country_s:' + $scope.country.code,
                    'wt': 'json',
                    'start': 0,
                    'rows': 1000000,
                };
                return $http.get('https://api.cbd.int/api/v2013/index/select', {
                    params: queryParameters,
                    cache: true
                }).success(function(data) {
                    $scope.partners = data.response.docs;
                });
            } // loadPartners

            //=======================================================================
            //
            //=======================================================================
            function getPartyId() {
                var queryParameters = {
                    'q': 'schema_s:undbParty AND _state_s:public AND country_s:' + $scope.country.code,
                    'fl':'identifier_s',
                    "sort": "updatedDate_dt desc",
                    'wt': 'json',
                    'start': 0,
                    'rows': 1000000,
                };
                return $http.get('/api/v2013/index/select', {
                    params: queryParameters,
                    cache: true
                }).success(function(data) {
                   if(data.response.docs.length)
                      $scope.partyId = data.response.docs[0].identifier_s;
                });
            } // loadPartners
            //=======================================================================
            //
            //=======================================================================
            function loadProfile() {
              getPartyId().then(function(){
                return $http.get('/api/v2013/documents/'+$scope.partyId, {

                }).then(function(res2) {
                    if (res2.data )
                        $scope.country = extend($scope.country, res2.data);
                });});
            } // loadProfile


            //=======================================================================
            //
            //=======================================================================
            function extend(obj, objExt) {
                for (var i in objExt) {
                    if (objExt.hasOwnProperty(i)) {
                        obj[i] = objExt[i];
                    }
                }
                return obj;
            } // extend


            //=======================================================================
            //
            //=======================================================================
            $scope.getCountryFlag = function(code) {
                return 'https://www.cbd.int/images/flags/96/flag-' + code + '-96.png';

            };


            //=======================================================================
            //
            //=======================================================================
            $scope.actionCountryProfile = function(code) {
                $location.url('/actions/countries/' + code.toUpperCase());
            };


            //=======================================================================
            //
            //=======================================================================
            $scope.goTo = function(url, code) {

                if (code)
                    $location.url(url + code);
                else
                    $location.url(url);
            };


            //=======================================================================
            //
            //=======================================================================
            $scope.countryCode = function(code) {
                if (code.toLowerCase() === 'eu') return 'eur';
                else return code;
            };


            //=======================================================================
            //
            //=======================================================================
            $scope.isAdmin = function() {

                if($scope.user.isAuthenticated)
                  return true;
                else
                  return false;
            };


            //=======================================================================
            //
            //=======================================================================
            $scope.extractId = function(id){
                return parseInt(id.replace('52000000cbd08', ''), 16);
            };

        }
    ];
});