define(['lodash', 'guid', 'app', 'directives/file', 'utilities/workflows', 'utilities/km-storage','directives/google-address'], function(_, guid) { 'use strict';

    return ['$scope', '$http', '$q', 'locale', 'realm', 'workflows', 'user', '$route', '$anchorScroll', '$location', 'IStorage',
    function($scope,   $http,   $q,   locale,   realm,   workflows,   user,   $route,   $anchorScroll,   $location, storage) {

        $scope.loading = true;
        $scope.save = save;
        $scope.upload = upload;
        $scope.googleMapsChange = updateGeoLocation;
        $scope.disabled = function() {
            return $scope.loading ||
                   $scope.saving ||
                  (($scope.documentInfo||{}).workingDocumentLock && !$scope.editWorkflow);
        };

        $scope.patterns = {
            facebook : /^http[s]?:\/\/(www.)?facebook.com\/.+/i,
            twitter  : /^http[s]?:\/\/twitter.com\/.+/i,
            youtube  : /^http[s]?:\/\/(www.)?youtube.com\/\w+\/.+/i,
            phone    : /^\+\d+(\d|\s|ext|[\.,\-#*()]|)+$/i,
            time     : /^([0-1][0-9]|2[0-3]|[0-9]):[0-5][0-9]$/
        };

        $scope.$watch('errors', function(errors) {
            if(errors && errors.length)
                $anchorScroll('form');
        });

        //==============================
        //
        //
        //==============================
        $http.get('/api/v2015/countries', { cache:true, params: { f : { code : 1, name : 1 } } }).then(function(res) {

            res.data.forEach(function(c) {
                c.code = c.code.toLowerCase();
                c.name = c.name[locale];
            });

            $scope.countries = res.data;
        });

        //==============================
        //
        //
        //==============================

        if($route.current.params.uid){
            load($route.current.params.uid);
            if($location.search().workflowId)
                loadWorkflow($location.search().workflowId);
        }
        else
            load();


        //==============================
        //
        //
        //==============================
        function load(uid) {

            delete $scope.errors;
            $scope.loading = true;

            var resDraft, resDoc;

            if(uid) {
                resDraft = $http.get("/api/v2013/documents/"+uid+"/versions/draft/info").then(res_Data).catch(nullOn404);
                resDoc   = $http.get("/api/v2013/documents/"+uid+'/info'               ).then(res_Data).catch(nullOn404);
            }

            return $q.all([resDraft, resDoc]).then(function(res) {

                var records = _.compact(res);

                if(!records.length && uid)
                    throw { code : "notFound" };

                return records[0];

            }).then(function(docInfo) {

                if(!docInfo) {//create new document;
                    $location.path('dashboard/submit/undb-actor/new');
                }

                if(docInfo.type!='undbPartner') {
                    throw { code : "invalidRecordType" };
                }

                $scope.documentInfo = docInfo;

                return docInfo.workingDocumentID ?
                       $http.get(window.scbdApp.apiUrl+"/api/v2013/documents/"+uid+"/versions/draft").then(res_Data) :
                       $http.get(window.scbdApp.apiUrl+"/api/v2013/documents/"+uid).then(res_Data);

            }).then(function(doc){

                $scope.document = doc;

            }).catch(res_Error).finally(function() {

                delete $scope.loading;

            });
        }


        //==============================
        //
        //
        //==============================
        function save() {

            delete $scope.errors;

            if(!$scope.agreed) {
                $scope.errors = $scope.errors || [];
                $scope.errors.push({code : "conditions" });
            }

            if($scope.form.$invalid) {
                $scope.errors = $scope.errors || [];
                $scope.errors.push({code : "invalidForm" });
            }

            if($scope.errors)
                return;


            $scope.saving = true;

            delete $scope.errors;

            var doc = _.omit($scope.document, function(value) {
                return value==="" || value===undefined || value===null;
            });

            return $http.put(window.scbdApp.apiUrl+'/api/v2013/documents/validate', doc, { params : { schema : doc.header.schema }}).then(function(res) {

                var report = res.data;

                if(report.errors && report.errors.length)
                    throw report;

            }).then(function() {

                if($scope.editWorkflow){
                    // $http.put(window.scbdApp.apiUrl+'/api/v2013/documents/'+doc.header.identifier+'/versions/draft', doc, { params : { schema : doc.header.schema }});

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
                    return $http.put(window.scbdApp.apiUrl+'/api/v2013/documents/'+doc.header.identifier+'/versions/draft', doc, { params : { schema : doc.header.schema }});

            }).then(function(res) {
                $scope.$emit('showInfo', 'Actor successfully saved.');
                if($scope.editWorkflow){
                    //publish
                    return workflows.updateActivity($location.search().workflowId, 'publishRecord', { action : 'approve' });
                }
                else
                    return workflows.addWorkflow(res.data);

            }).then(function() {
                if($scope.editWorkflow)
                    $location.url('/submit/undbPartner');
                else
                    $location.url('/actors/submit-form-done');

            }).catch(function(err) {

                delete $scope.saving;

                res_Error(err);
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

                $scope.document.logo  = window.scbdApp.apiUrl+'/api/v2013/documents/'+attachInfo.documentUID+'/attachments/'+encodeURIComponent(attachInfo.filename);

            }).catch(res_Error).finally(function() {

                delete $scope.saving;

            });
        }

        //==============================
        //
        //
        //==============================
        function updateGeoLocation(url) {

            var matches = /@(-?\d+\.\d+),(-?\d+\.\d+)/g.exec(url || "");

            if(matches) {
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
            $scope.$emit('showError', 'ERROR: Actor was not saved.');
            $scope.errors = err.errors || [err];

            console.error($scope.errors);
        }

        //==============================
        //
        //
        //==============================
        function res_Data(res) {
            return res.data;
        }

        function loadWorkflow(workflowId){
            $q.when(workflows.getWorkflow(workflowId))
            .then(function(data){
                if(!data.closedOn && _.contains(data.activities[0].assignedTo, user.userID)){
                    $scope.editWorkflow = true;
                }
            });
        }
    }];
});
