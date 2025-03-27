define(['lodash', 'guid','text!./email.txt', 'app','factories/mongo-storage', 'directives/file', 'utilities/workflows', 'utilities/km-storage','directives/google-address','directives/on-focus-helper'], function(_, guid,email) { 'use strict';

    return ['$scope', '$http', '$q', 'locale', 'realm', 'workflows', 'user', '$route', '$anchorScroll', '$location', 'IStorage','$window','mongoStorage',
    function($scope,   $http,   $q,   locale,   realm,   workflows,   user,   $route,   $anchorScroll,   $location, storage,$window,mongoStorage) {

        $scope.highlightLink='submit';
        $scope.loading = true;
        $scope.save = save;
        //$scope.upload = upload;

        $scope.disabled = function() {
            return $scope.loading ||
                   $scope.saving ||
                  (($scope.documentInfo||{}).workingDocumentLock && !$scope.editWorkflow);
        };

        $scope.patterns = {
            phone    : /^\+\d+(\d|\s|ext|[\.,\-#*()]|)+$/i,
        };

        $scope.$watch('errors', function(errors) {
            if(errors && errors.length)
                $anchorScroll('form');
        });

        //============================================================
        //
        //============================================================
        function initProfile() {




                return $http.get(window.scbdApp.apiUrl + '/api/v2013/users/' + user.userID).then(function onsuccess(response) {
                    if (!$scope.document) $scope.document= {};
                    $scope.document.email = _.clone(response.data.Email);
                    var c = _.find($scope.countries,{code:response.data.Country});
                    $scope.document.address = _.clone(response.data.Address)+', '+_.clone(response.data.City)+', '+c.name;
                    $scope.document.countryObj=c;
                    $scope.document.country = _.clone(response.data.Country);
                    $scope.document.personalTitle = _.clone(response.data.Title);
                    $scope.document.state = _.clone(response.data.State);
                    $scope.document.zip = _.clone(response.data.Zip);
                    $scope.document.phone = _.clone(response.data.Phone);
                    $scope.document.firstName = _.clone(response.data.FirstName);
                    $scope.document.lastName = _.clone(response.data.LastName);
                    $scope.document.title = _.clone(response.data.Designation);
                    $scope.document.orgName = _.clone(response.data.Organization);
                    $scope.document.dept = _.clone(response.data.Department);
                }).catch(res_Error);

        } // initProfile()

        //==============================
        //
        //
        //==============================
        mongoStorage.getCountries().then(function(res) {

            res.forEach(function(c) {
                c.code = c.code.toLowerCase();
                c.name = c.name[locale];
            });
            $scope.countries = res;
            load();
        });


        //==============================
        //
        //
        //==============================
        function load() {

            delete $scope.errors;
            $scope.loading = true;
            initProfile();
            $scope.loading = false;
        }
        //==============================
        //
        //
        //==============================
        function parseMail() {
          _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

          var compiled = _.template(email);
          return encodeURI(compiled($scope.document));
        }


        //==============================
        //
        //
        //==============================
        function save() {

            delete $scope.errors;
            delete $scope.document.countryObj;

            if(!$scope.document.agreed) {
                $scope.errors = $scope.errors || [];
                $scope.errors.push({code : "conditions" });
            }

            if($scope.form.$invalid) {
                $scope.errors = $scope.errors || [];
                $scope.errors.push({code : "invalidForm" });
            }

            if($scope.errors)
                return;

            mongoStorage.save('logo-waivers', $scope.document)
                .then(postSave)
                  .catch(res_Error);


        }

        //==============================
        //
        //
        //==============================
        function postSave() {
            $scope.$emit('showInfo', 'Liability waiver request was sent.');
            $location.url('/resources/waiver/submit-done');

        }

        //==============================
        //
        //
        //==============================
        function res_Error(err) {

            err = err.data || err;
            $scope.$emit('showError', 'ERROR: liability waiver was not saved.');
            $scope.errors = err.errors || [err];

            console.error($scope.errors);
        }


    }];
});
