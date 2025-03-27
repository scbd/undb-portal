/* jshint sub:true */

define(['app', 'angular', 'jquery'], function (app, ng, $) { 'use strict';

    var accountsBaseUrl = window.scbdApp.accountsUrl;

	app.factory('apiToken', ["$q", "$rootScope", "$window", "$document", "$timeout", function($q, $rootScope, $window, $document, $timeout) {

		var authenticationFrameQ = $q(function(resolve, reject){

			var frame = $('<iframe src="'+accountsBaseUrl+'/app/authorize.html'+'" style="display:none"></iframe>');

			$("body").prepend(frame);

			frame.load(function(evt){
				resolve(evt.target || evt.srcElement);
			});

			$timeout(function(){
				reject('accounts is not available / call is made from an unauthorized domain');
			}, 5000);
		});

		var pToken;
        var pCookieToken;

        //============================================================
        //
        //
        //============================================================
        function getCookieToken() {
            return pCookieToken;
        }

		//============================================================
		//
		//
		//============================================================
		function getToken() {

			return $q.when(authenticationFrameQ).then(function(authenticationFrame){

				if(!authenticationFrame) {
					pToken = pToken || null;
				}

				if(pToken!==undefined) {
					return $q.when(pToken || null);
				}

				pToken = null;

				var defer = $q.defer();
				var unauthorizedTimeout = $timeout(function(){
					console.error('accounts is not available / call is made from an unauthorized domain');
					defer.resolve(null);
				}, 1000);

				var receiveMessage = function(event)
				{
					$timeout.cancel(unauthorizedTimeout);

					if(event.origin!=accountsBaseUrl)
						return;

					var message = JSON.parse(event.data);

					if(message.type=='authenticationToken') {
						defer.resolve(message.authenticationToken || null);

						if(message.authenticationEmail)
							$rootScope.lastLoginEmail = message.authenticationEmail;
					}
					else {
						defer.reject('unsupported message type');
					}
				};

				$window.addEventListener('message', receiveMessage);

				pToken = defer.promise.then(function(t){

					pCookieToken = pToken = t;

					return t;

				}).finally(function(){

					$window.removeEventListener('message', receiveMessage);

				});

				authenticationFrame.contentWindow.postMessage(JSON.stringify({ type : 'getAuthenticationToken' }), accountsBaseUrl);

				return pToken;

			}).catch(function(error){

				pToken = null;

				console.error(error);

				throw error;

			});
		}

		//============================================================
	    //
	    //
	    //============================================================
		function setToken(token, email) { // remoteUpdate:=true

			return $q.when(authenticationFrameQ).then(function(authenticationFrame){

				pToken = token || undefined;

				if(authenticationFrame) {

					var msg = {
						type : "setAuthenticationToken",
						authenticationToken : token,
						authenticationEmail : email
					};

					authenticationFrame.contentWindow.postMessage(JSON.stringify(msg), accountsBaseUrl);
				}

				if(email) {
					$rootScope.lastLoginEmail = email;
				}
			});
		}

		return {
			get : getToken,
            getCookieToken : getCookieToken,
			set : setToken
		};
	}]);


	app.factory('authentication', ["$http", "$rootScope", "$q", "apiToken", function($http, $rootScope, $q, apiToken) {

		var currentUser = null;

		//============================================================
	    //
	    //
	    //============================================================
		function anonymous() {
			return { userID: 1, name: 'anonymous', email: 'anonymous@domain', government: null, userGroups: null, isAuthenticated: false, isOffline: true, roles: [] };
		}

		//============================================================
	    //
	    //
	    //============================================================
		function getUser() {

			if(currentUser)
				return $q.when(currentUser);

			return $q.when(apiToken.get()).then(function(token) {

				if(!token) {
					return anonymous();
				}

				return $http.get('/api/v2013/authentication/user', { headers: { Authorization: "Ticket " + token } }).then(function(r){

					return r.data;
				});

			}).catch(function() {

				return anonymous();

			}).then(function(user){

				setUser(user);

				return user;
			});
		}

		//==============================
		//
		//==============================
		function LEGACY_user() {

		    console.warn("authentication.user() is DEPRECATED. Use: getUser()");

			return $rootScope.user;
		}

		//============================================================
	    //
	    //
	    //============================================================
		function signIn(email, password) {

			return $http.post("/api/v2013/authentication/token", {

				"email": email,
				"password": password

			}).then(function(res) {

				var token  = res.data;

				return $q.all([token, $http.get('/api/v2013/authentication/user', { headers: { Authorization: "Ticket " + token.authenticationToken } })]);

			}).then(function(res) {

				var token = res[0];
				var user  = res[1].data;

				email = (email||"").toLowerCase();

				apiToken.set(token.authenticationToken, email);
				setUser (user);

				$rootScope.$broadcast('signIn', user);

				return user;

			}).catch(function(error) {

				throw { error:error.data, errorCode : error.status };

			});
		}

		//============================================================
	    //
	    //
	    //============================================================
		function signOut () {

			apiToken.set(null);

			setUser(null);

			return $q.when(getUser()).then(function(user) {

				$rootScope.$broadcast('signOut', user);

				return user;
			});
		}

		//============================================================
	    //
	    //
	    //============================================================
		function setUser(user) {

			currentUser     = user || undefined;
			$rootScope.user = user || anonymous();
		}

		return {
			getUser  : getUser,
			signIn   : signIn,
			signOut  : signOut,
			user     : LEGACY_user,
            accountsBaseUrl : function() { return accountsBaseUrl; }
		};

	}]);

	app.factory('authenticationHttpIntercepter', ["$q", "apiToken", function($q, apiToken) {

		return {
			request: function(config) {

				var trusted = /^https:\/\/api.cbd.int\//i.test(config.url) ||
							  /^https:\/\/api.cbddev.xyz\//i.test(config.url) ||
							  /^\/api\//i                .test(config.url);

				var hasAuthorization = (config.headers||{}).hasOwnProperty('Authorization') ||
							  		   (config.headers||{}).hasOwnProperty('authorization');

				if(!trusted || hasAuthorization) // no need to alter config
					return config;

				//Add token to http headers

				return $q.when(apiToken.getCookieToken()).then(function(token) {

					if(token) {
						config.headers = ng.extend(config.headers||{}, {
							Authorization : "Ticket " + token
						});
					}

					return config;
				});
			}
		};
	}]);

    app.factory('realmHttpIntercepter', ['realm','$injector', function(realm,$injector) {

        return {
            request: function(config) {

				if((config.headers || {}).hasOwnProperty('realm'))
					return config;

                var trusted = /^https:\/\/api.cbd.int\//i .test(config.url) ||
							  /^https:\/\/api.cbddev.xyz\//i.test(config.url) ||
                              /^https:\/\/localhost[:\/]/i.test(config.url) ||
                              /^\/\w+/i                   .test(config.url);

                var hasRealmParam = !!(trusted && realm && config.params && config.params.realm && config.params.realm != realm);

                if(hasRealmParam) {
                    config.headers = angular.extend(config.headers || {}, { realm : config.params.realm });
                }
                else if(trusted && realm ) {
                    config.headers = angular.extend(config.headers || {}, { realm : realm });
                }

                return config;
            }
        };
    }]);

		app.factory('apiRebase', ["$location", function($location) {
        
			return {
					request: function(config) {

							var rewrite = /^\/api\//.test(config.url.toLowerCase());

							if(rewrite)
									config.url = window.scbdApp.apiUrl + config.url;

							return config;
					}
			};
	}]);
});
