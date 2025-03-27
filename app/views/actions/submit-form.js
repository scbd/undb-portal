define(['lodash', 'jquery', 'guid', 'app', 'directives/file','directives/date-helper','directives/time-helper','directives/google-address', 'utilities/workflows', 'utilities/km-storage', 'bootstrap-datepicker'], function(_, $, guid) { 'use strict';

    return ['$scope', '$http', '$q', 'locale', '$route', 'realm', 'workflows', '$location', '$anchorScroll','IStorage','$document','$timeout','authentication',
     function($scope, $http, $q, locale, $route, realm, workflows, $location, $anchorScroll, storage,$document,$timeout,auth) {

        $scope.save = save;
        $scope.upload = upload;
        $scope.googleMapsChange = updateGeoLocation;
        var user = false;

        $scope.patterns = {
            facebook : /^http[s]?:\/\/(www.)?facebook.com\/.+/i,
            twitter  : /^http[s]?:\/\/twitter.com\/.+/i,
            youtube  : /^http[s]?:\/\/(www.)?youtube.com\/\w+\/.+/i,
            phone    : /^\+\d+(\d|\s|ext|[\.,\-#*()]|)+$/i,
            date     : /^\d{4}-\d{1,2}-\d{1,2}$/,
            time     : /^([0-1][0-9]|2[0-3]|[0-9]):[0-5][0-9]$/
        };

        $('form#action input.date').datepicker({ format: "yyyy-mm-dd", startDate : '2010-01-01' , endDate : '2019-12-31' });

        $scope.$watch('document.startDate', function(d) {
            $('form#action input.date[name="endDate"]').datepicker('setStartDate', d || '2010-01-01');
        });

        $scope.$watch('document.endDate', function(d) {
            $('form#action input.date[name="startDate"]').datepicker('setEndDate', d || '2019-12-31');
        });

        $scope.$watch('errors', function(errors) {
            if(errors && errors.length)
                $anchorScroll('form');
        });

        // Init
        $http.get('/api/v2015/countries', { cache:true, params: { f : { code : 1, name : 1 } } }).then(function(res) {

            res.data.forEach(function(c) {
                c.code = c.code.toLowerCase();
                c.name = c.name[locale];
            });

            $scope.countries = res.data;
        });

        load();
        if($location.search().workflowId)
            loadWorkflow($location.search().workflowId);


        //==============================
        //
        //
        //==============================
        function updateGeoLocation(url) {

            var matches = /@(-?\d+\.\d+),(-?\d+\.\d+)/g.exec(url || "");

            if(matches) {

                if(matches[1].length>10) matches[1]=matches[1].substring(0, 9);

                if(matches[2].length>10) matches[2]= matches[2].substring(0, 9);

                $scope.document.geoLocation = {
                    lat : parseFloat(matches[1]),
                    lng : parseFloat(matches[2])
                 };
            }
            else {
                delete $scope.document.geoLocation;
            }
        }

        //==============================
        //
        //
        //==============================
        function load() {

            delete $scope.errors;
            $scope.loading = true;


            var uid = $route.current.params.uid;
            var resDraft, resDoc;

            if(uid) {
                resDraft = $http.get("/api/v2013/documents/"+uid+"/versions/draft").then(res_Data).catch(nullOn404);
                resDoc   = $http.get("/api/v2013/documents/"+uid                  ).then(res_Data).catch(nullOn404);
            }

            $q.all([resDraft, resDoc]).then(function(res) {

                var records = _.compact(res);

                if(!records.length && uid)
                    throw { code : "notFound" };

                return records[0];

            }).then(function(record){

                if(record) {

                    if(record.header.schema!='undbAction')
                        throw { code : "invalidRecordType" };

                    $scope.document = record;
                }
                else {
                    $location.path('dashboard/submit/event/new');
                }

            }).catch(res_Error).finally(function() {

                delete $scope.loading;

            });
        }

        //==============================
        //
        //
        //==============================
        function save() {

            if($scope.form.$invalid) {
                $scope.errors = [{code : "invalidForm" }];
                return;
            }

            delete $scope.errors;
            $scope.saving = true;

            var doc = _.omit($scope.document, function objectFilter(value) {
                return value==="" || value===undefined || value===null;
            });

            return $http.put(window.scbdApp.apiUrl+'/api/v2013/documents/validate', doc, { params : { schema : doc.header.schema }})
            .then(res_Data).then(function(report) {

                if(report.errors && report.errors.length)
                    throw report;
                if($scope.editWorkflow){
                    return storage.drafts.locks.get(doc.header.identifier,{lockID:''})
                            .then(function(lockInfo){
                                return storage.drafts.locks.delete(doc.header.identifier, lockInfo.data[0].lockID)
                                        .then(function(){
                                            return storage.drafts.put(doc.header.identifier, doc);
                                        })
                                        .then(function(){
                                            return storage.drafts.locks.put(doc.header.identifier, {lockID:lockInfo.data[0].lockID});
                                        });
                            });
                }
                else
                    return $http.put(window.scbdApp.apiUrl+'/api/v2013/documents/'+doc.header.identifier+'/versions/draft', doc, { params : { schema : doc.header.schema }}).then(res_Data);

            }).then(function(docInfo) {
                $scope.$emit('showInfo', 'Action successfully saved.');
                if($scope.editWorkflow){ //publish
                    return workflows.updateActivity($location.search().workflowId, 'publishRecord', { action : 'approve' });
                }
                else
                    return workflows.addWorkflow(docInfo);

            }).then(function() {

                if($scope.editWorkflow)
                    $location.url('/submit/undbAction');
                else
                    $location.url('/actions/submit-form-done');


            })
            .catch(res_Error).finally(function() {

                delete $scope.saving;
            });
        }

        //==============================
        //
        //
        //==============================
        function upload(files) {

            if(!files[0])
                return;

            delete $scope.errors;
            $scope.saving = true;

            $q.when(files[0]).then(function(file) {

                if(!/^image\//.test(file.type)) throw { code : "invalidImageType" };
                if(file.size>1024*500)          throw { code : "fileSize" };

                var uid  = $scope.document.header.identifier;
                var url  = window.scbdApp.apiUrl+'/api/v2013/documents/'+uid+'/attachments/'+encodeURIComponent(file.name);

                return $http.put(url, file, { headers : { "Content-Type": file.type } }).then(res_Data);

            }).then(function(attachInfo) {

                $scope.document.logo  = 'https://chm.cbd.int/api/v2013/documents/'+attachInfo.documentUID+'/attachments/'+encodeURIComponent(attachInfo.filename);

            }).catch(res_Error).finally(function() {
                delete $scope.saving;
            });
        }

        //==============================
        //
        //
        //==============================
        function nullOn404(res) {

            if(res.status==404)
                return null;
            throw res;
        }

        //==============================
        //
        //
        //==============================
        function res_Error(err) {

            err = err.data || err;
            $scope.$emit('showError', 'ERROR: Action was not saved.');
            $scope.errors = err.errors || [err];

            console.error($scope.errors);
        }


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
                el.select();
            }, 200);
        }
        //==============================
        //
        //
        //==============================
        function getUser() {
            return auth.getUser().then(function(u){
                  user = u;
            });
        }

        //==============================
        //
        //
        //==============================
        function res_Data(res) {
            return res.data;
        }

        function loadWorkflow(workflowId){
            $q.all([workflows.getWorkflow(workflowId),getUser()])
            .then(function(data){
                if(!data[0].closedOn && _.contains(data[0].activities[0].assignedTo, user.userID)){
                    $scope.editWorkflow = true;
                }
            });
        }
    }];
});
