
define(['app','lodash', 'directives/map/zoom-map'], function(app,_) { 'use strict';
	return ['$scope','locale','$http', '$location', '$route','authentication',
    function ($scope,locale, $http, $location,$route,authentication) {

		$scope.code      = $route.current.params.code;

		authentication.getUser().then(function (user) {

			$scope.user=user;
			console.log('$scope.user',$scope.user);
		});


		//=======================================================================
		//
		//=======================================================================
		$http.get('https://api.cbd.int/api/v2013/countries/'+$scope.code.toUpperCase(), {
			cache: true,
		}).then(function(res) {

				$scope.country =  res.data;
				$scope.country.code = $scope.country.code.toLowerCase();
				$scope.country.name = $scope.country.name[locale];
				$scope.country.cssClass='flag-icon-'+$scope.country.code;
				$scope.country = res.data;

		}).then(function(){

			var queryParameters = {
				'q': 'schema_s:undbPartner AND _state_s:public AND country_s:'+$scope.country.code,
				//  'sort': 'createdDate_dt desc, title_t asc',
				'wt': 'json',
				'start': 0,
				'rows': 1000000,
			};
				$http.get('https://api.cbd.int/api/v2013/index/select', {
					params: queryParameters,
					cache: true
				}).success(function(data) {
					$scope.count = data.response.numFound;
					$scope.partners = data.response.docs;

				});
				queryParameters = {
					'q': 'schema_s:undbAction  AND country_s:'+$scope.country.code, //AND _state_s:public removed for test
					//  'sort': 'createdDate_dt desc, title_t asc',
					'wt': 'json',
					'start': 0,
					'rows': 1000000,
				};
					$http.get('https://api.cbd.int/api/v2013/index/select', {
						params: queryParameters,
						cache: true
					}).success(function(data) {
						$scope.count = data.response.numFound;
						$scope.actions = data.response.docs;
						$scope.actions.forEach(function(a) {
								var dateObject = new Date(Date.parse(a.startDate_s));
								a.startDate_s = dateObject.toDateString();
								var dateObject2 = new Date(Date.parse(a.endDate_s));
								a.endDate_s=dateObject2.toDateString();
						});

					});
		});

		//=======================================================================
		//
		//=======================================================================
		$scope.actionCountryProfile= function (code){
			$location.url('/actions/countries/'+code.toUpperCase());
		};

		//=======================================================================
		//
		//=======================================================================
		$scope.goTo= function (url,code){
			$location.url(url+code);
		};

		//=======================================================================
		//
		//=======================================================================
		$scope.isAdmin= function (){
			return _.intersection($scope.user.roles, ['Administrator','undb-administrator','UNDBPublishingAuthority']).length>0;
		};
    }];
});
