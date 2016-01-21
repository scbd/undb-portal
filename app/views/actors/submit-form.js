define(['lodash', 'guid', 'app', 'directives/file', 'utilities/workflows'], function(_, guid) { 'use strict';

    return ['$scope', '$http', '$q', 'locale', 'realm', 'workflows', 'user', '$route', '$anchorScroll', '$location',
    function($scope,   $http,   $q,   locale,   realm,   workflows,   user,   $route,   $anchorScroll,   $location) {

        $scope.loading = true;
        $scope.save = save;
        $scope.upload = upload;
        $scope.googleMapsChange = updateGeoLocation;

        $scope.patterns = {
            facebook : /^http[s]?:\/\/(www.)?facebook.com\/.+/i,
            twitter  : /^http[s]?:\/\/twitter.com\/.+/i,
            youtube  : /^http[s]?:\/\/(www.)?youtube.com\/user\/.+/i,
            phone    : /^\+\d+(\d|\s|-|ext|#|\*)+$/i,
            time     : /^([0-1][0-9]|2[0-3]|[0-9]):[0-5][0-9]$/
        };

        //==============================
        //
        //
        //==============================
        $http.get('https://api.cbd.int/api/v2015/countries', { cache:true, params: { f : { code : 1, name : 1 } } }).then(function(res) {

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

        if($route.current.params.uid)
            load($route.current.params.uid);
        else
            discover();

        //==============================
        //
        //
        //==============================
        function discover() {

            delete $scope.errors;
            $scope.loading = true;

            var filter = "type eq 'undbPartner' and createdBy/userID eq "+user.userID;

            var resDrafts = $http.get("https://api.cbd.int/api/v2013/documents", { params : { $filter : filter, collection : 'mydraft' } }).then(res_Data);
            var resDocs   = $http.get("https://api.cbd.int/api/v2013/documents", { params : { $filter : filter } }).then(res_Data);

            return $q.all([resDrafts, resDocs]).then(function(res) {

                var records = _.flatten([res[0].Items, res[1].Items]);

                if(records.length) {
                    $location.url('/actors/partners/register/'+records[0].identifier);
                }
                else {
                    return load();
                }

            }).catch(function(err) {

                delete $scope.loading;

                res_Error(err);
            });
        }

        //==============================
        //
        //
        //==============================
        function load(uid) {

            delete $scope.errors;
            $scope.loading = true;

            var resDraft, resDoc;

            if(uid) {
                resDraft = $http.get("https://api.cbd.int/api/v2013/documents/"+uid+"/versions/draft/info").then(res_Data).catch(nullOn404);
                resDoc   = $http.get("https://api.cbd.int/api/v2013/documents/"+uid+'/info'               ).then(res_Data).catch(nullOn404);
            }

            return $q.all([resDraft, resDoc]).then(function(res) {

                var records = _.compact(res);

                if(!records.length && uid)
                    throw { code : "notFound" };

                return records[0];

            }).then(function(docInfo) {

                if(!docInfo) {//create new document;
                    return { header : { identifier : guid(), schema : 'undbPartner' } };
                }

                if(docInfo.type!='undbPartner') {
                    throw { code : "invalidRecordType" };
                }

                $scope.documentInfo = docInfo;

                return docInfo.workingDocumentID ?
                       $http.get("https://api.cbd.int/api/v2013/documents/"+uid+"/versions/draft").then(res_Data) :
                       $http.get("https://api.cbd.int/api/v2013/documents/"+uid).then(res_Data);

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

            if(!$scope.agreed) {
                $anchorScroll('agreed');
                return;
            }

            if($scope.form.$invalid) {
                $scope.errors = [{code : "invalidForm" }];
                return;
            }


            $scope.saving = true;

            delete $scope.errors;

            var doc = $scope.document;

            return $http.put('https://api.cbd.int/api/v2013/documents/validate', doc, { params : { schema : doc.header.schema }}).then(function(res) {

                var report = res.data;

                if(report.errors && report.errors.length)
                    throw report;

                return $http.put('https://api.cbd.int/api/v2013/documents/'+doc.header.identifier+'/versions/draft', doc, { params : { schema : doc.header.schema }});

            }).then(function(res) {
                return workflows.addWorkflow(res.data);
            }).then(function(res) {
                alert('Record saved successfully');
            }).catch(function(err) {

                err = err.data || err;

                $scope.errors = err.errors || [err];

                console.error(err);

            }).finally(function(){

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
                var url  = 'https://api.cbd.int/api/v2013/documents/'+uid+'/attachments/'+encodeURIComponent(file.name);

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
    }];
});
