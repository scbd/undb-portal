define(['app', 'lodash', 'directives/edit-link', 'directives/link-list','ng-ckeditor'], function(app, _) {
    'use strict';
    return ['$scope', 'locale', '$http', '$location', '$route', '$timeout','$document',
        function($scope, locale, $http, $location, $route, $timeout,$document) {

            $scope.code = $route.current.params.code;
            $scope.tab = 'profile';
            init();

            $scope.patterns = {
                facebook: /^http[s]?:\/\/(www.)?facebook.com\/.+/i,
                twitter: /^http[s]?:\/\/twitter.com\/.+/i,
                youtube: /^http[s]?:\/\/(www.)?youtube.com\/\w+\/.+/i,
                phone: /^\+\d+(\d|\s|ext|[\.,\-#*()]|)+$/i
            };
            $scope.editorOptions = {
                language: 'en',
                uiColor: '#069554'
            };
            //=======================================================================
            //
            //=======================================================================
            $scope.getCountryFlag = function(code) {
                return 'https://www.cbd.int/images/flags/96/flag-' + code + '-96.png';

            };

            //=======================================================================
            //
            //=======================================================================
            function load() {
                return $http.get(window.scbdApp.apiUrl+'/api/v2013/countries/' + $scope.code.toUpperCase(), {
                    cache: true,
                }).then(function(res) {
                    delete(res.data._id);
                    delete(res.data.__v);
                    delete(res.data.treaties);

                    $scope.document = res.data;
                    if($scope.document.name)
                      $scope.document.name = $scope.document.name[locale];


                    $scope.document.code = $scope.document.code.toLowerCase();

                    $http.get(window.scbdApp.apiUrl+'/api/v2016/undb-party-profiles/', {
                        'params': {
                            q: {
                                'code': $scope.document.code
                            }
                        }
                    }).then(function(res2) {
                        if (_.isArray(res2.data) && res2.data.length > 1)
                            throw "Error: cannot have more then one profile with same code.";
                        else if (_.isArray(res2.data) && res2.data.length === 1)
                            $scope.document = extend($scope.document, res2.data[0]);
                    });
                });
            }

            //=======================================================================
            //
            //=======================================================================
            function save() {
                var url = '/api/v2016/undb-party-profiles/';
                var params = {};
                if (!$scope.document.description) $scope.document.description=' ';

                if ($scope.document._id) {
                    params.id = $scope.document._id;
                    url = url + '/' + $scope.document._id;

                    return $http.put(url, $scope.document, {
                        'params': params
                    }).then(function() {
                        $scope.$emit('showInfo', 'Profile successfully updated.');
                    }).catch(function(err) {
                        $scope.$emit('showError', 'ERROR: Profile was not updated.');
                        console.log(err);
                    });
                } else {
                    return $http.post(url, $scope.document, params).then(function(res) {
                        $scope.document._id = res.id;
                        $scope.$emit('showInfo', 'Profile successfully updated.');
                    }).catch(function(err) {
                        $scope.$emit('showError', 'ERROR: Profile was not updated.');
                        console.log(err);
                    });
                } //create

            }
            $scope.save = save;


            //=======================================================================
            //
            //=======================================================================
            function showEdit() {

                if ((_.isBoolean($scope.editIndex) && $scope.editIndex) || _.isNumber($scope.editIndex))
                    return true;
                else
                    return false;
            }
            $scope.showEdit = showEdit;



            //=======================================================================
            //
            //=======================================================================
            function onFocusStart(id,start) {
                if (!$scope.document[id]) {
                    $scope.document[id] = start;
                    moveCursorToEnd($document.find('#'+id)[0]);
                }
            }
            $scope.onFocusStart = onFocusStart;



            //=======================================================================
            //
            //=======================================================================
            function moveCursorToEnd(el) {
                $timeout(function() {
                    if (typeof el.selectionStart == "number") {
                        el.selectionStart = el.selectionEnd = el.value.length;
                    } else if (typeof el.createTextRange != "undefined") {
                        el.focus();
                        var range = el.createTextRange();
                        range.collapse(false);
                        range.select();
                    }
                }, 200);
            }


            //=======================================================================
            //
            //=======================================================================
            function close() {
                    $location.url('/actions/countries/' + $scope.document.code);

            }
            $scope.close = close;


            //=======================================================================
            //
            //=======================================================================
            function init() {

                $scope.editIndex = false;
                load().then(function() {
                    if ($scope.document && !$scope.document.publications)
                        $scope.document.publications = [];

                    if ($scope.document && !$scope.document.images)
                        $scope.document.images = [];

                    if ($scope.document && !$scope.document.videos)
                        $scope.document.videos = [];

                    if ($scope.document && !$scope.document.links)
                        $scope.document.links = [];
                });
            }// init

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
            }// extend


        }
    ];
});