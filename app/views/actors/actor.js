define(['lodash','angular-sanitize', 'filters/trunc','directives/links-display','directives/tooltip' ], function(_) {
    'use strict';
    return ['$scope', 'locale', '$http', '$location', '$route', '$sce','authentication',
        function($scope, locale, $http, $location, $route, $sce,authentication) {
            $scope.partner = {};
            $scope.partner.identifier = $route.current.params.uid;

            //=======================================================================
            //
            //=======================================================================
            authentication.getUser().then(function(user) {
                $scope.user = user;

            }).then(init);

            //=======================================================================
            //
            //=======================================================================
            function init(){
                var hex = Number($scope.partner.identifier).toString(16);
                var id = "52000000cbd0800000000000".substr(0, 24 - hex.length) + hex;
                var queryParameters = {
                    'q': 'schema_s:undbActor  AND id:' + id, //AND _state_s:public removed for test
                    'wt': 'json',
                    'start': 0,
                    'rows': 1000000,
                };

                $http.get('/api/v2013/index/select', {
                    params: queryParameters,
                    cache: true
                }).success(function(data) {
                    $scope.partner = data.response.docs[0];
                    if($scope.partner && $scope.partner.identifier_s)
                    $http.get('/api/v2013/documents/'+$scope.partner.identifier_s, {
                        cache: true
                    }).success(function(d) {
                      Object.assign($scope.partner,d);
                        $http.get('/api/v2013/documents/'+$scope.partner.organization.identifier, {
                            cache: true
                        }).success(function(d) {
                          Object.assign($scope.partner,d);

                          if($scope.partner.websites){
                              for(var i =0; i<$scope.partner.websites.length; i++)
                              {
                                    var site = $scope.partner.websites[i];

                                    if(site.name==='website')
                                      $scope.partner.website=site.url;
                                    if(site.name==='facebook')
                                      $scope.partner.facebook=site.url;
                                    if(site.name==='twitter')
                                      $scope.partner.twitter=site.url;
                                    if(site.name==='youtube')
                                      $scope.partner.youtube=site.url;
                              }
                          }
                          $scope.actor=$scope.partner;

                        });
                    });
                    else
                    $location.path('/404');
                });
            }

            //=======================================================================
            //
            //=======================================================================
            $scope.isAdmin = function() {
                if($scope.user)
                  return _.intersection($scope.user.roles, ['Administrator', 'undb-administrator']).length > 0;
                else
                  return false;
            };

            //=======================================================================
            // ('nl2br')
            //=======================================================================
            function trusted(val) {
                return $sce.trustAsHtml(val);

            }
            $scope.trusted=trusted;
            //=======================================================================
            //
            //=======================================================================
            function trustSrc() {
							var src ='https://www.google.com/maps/embed/v1/place?key=AIzaSyCyD6f0w00dLyl1iU39Pd9MpVVMOtfEuNI';
                return $sce.trustAsResourceUrl(src+'&&q='+$scope.action.lat_d+','+$scope.action.lng_d);
            }
            $scope.trustSrc = trustSrc;

						//=======================================================================
            //
            //=======================================================================
            function isGooleMap() {
								if(!$scope.action.logo_s && ($scope.action.address_s || ($scope.action.lat_d && $scope.action.lng_d)))
									        return true;
								else
										      return false;

            }
            $scope.isGooleMap = isGooleMap;

						//=======================================================================
            //
            //=======================================================================
            function isZoomMap() {
								if(!$scope.action.logo_s && !$scope.action.address_s && !$scope.action.lat_d && !$scope.action.lng_d)
										return true;
								else
										return false;
            }
            $scope.isZoomMap = isZoomMap;

            //=======================================================================
            //
            //=======================================================================
            $scope.getCountryFlag = function(code) {
                if (code.toLowerCase() === 'eu')
                    return 'https://www.cbd.int/images/flags/48/flag-' + 'eur' + '-48.png';
                else
                    return 'https://www.cbd.int/images/flags/48/flag-' + code + '-48.png';


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



        }
    ];
});
