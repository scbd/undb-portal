define(['app', 'lodash', 'moment-timezone', 'providers/locale', 'factories/dev-router'], function(app, _) {

    app.factory("mongoStorage", ['$http', 'authentication', '$q', 'locale', '$filter', 'devRouter', function($http, authentication, $q, locale, $filter, devRouter) {

        var user;
        var clientOrg = 0; // means cbd
        loadUser() ;

        //============================================================
        //
        //============================================================
        function loadUser() {
            return authentication.getUser().then(function(u) {
                 user = u;
                 return user;
            });
        }

        //============================================================
        //
        //============================================================
        function save(schema, document, _id) {
            var url = '/api/v2016/' + schema;
            if (_id) {

                var params = {};
                params.id = _id;
                url = url + '/' + _id;

                if (!document.meta.clientOrg) document.meta.clientOrg = clientOrg;

                return $http.put(url, document, params).then(function(res) {

                    return res;
                });
            } else {
                if (!document.meta) document.meta = {
                    'clientOrg': clientOrg
                };

                return $http.post(url, document).then(function(res) {

                    return res;
                });
            } //create
        }



        //============================================================
        //
        //============================================================
        function countries() {

            if (!localStorage.getItem('countries'))
                return $http.get(window.scbdApp.apiUrl+"/api/v2015/countries", {
                    cache: true
                }).then(function(o) {
                    var countries = $filter("orderBy")(o.data, "name.en");

                    _.each(countries, function(c) {
                        c.title = c.name.en;
                        c.identifier = c.code.toLowerCase();
                        c._id = c.identifier;
                    });
                    localStorage.setItem('countries', JSON.stringify(countries));
                    return countries;
                });
            else
                return $q(function(resolve) {
                    return resolve(JSON.parse(localStorage.getItem('countries')));
                });
        }


        //============================================================
        //
        //============================================================
        function loadOwnerDocs(schema) {

            if (!schema) throw "Error: failed to indicate schema loadDocs";
            return $q.when(authentication.getUser().then(function(u) {
                user = u;
            }).then(function() {
                var params = {
                    q: {
                        'meta.status': {
                            $nin: ['archived', 'deleted']
                        },
                        'meta.createdBy': user.userID,
                        'meta.version': {
                            $ne: 0
                        }
                    }
                };
                return $http.get('/api/v2016/' + schema, {
                    'params': params
                });
            }));
        }


        //=======================================================================
        //
        //=======================================================================
        function moveTempFileToPermanent(target,id) {
            var params={};
            if(devRouter.isDev())
              params.dev=true;

            if(id)
              params.docid=id;

          return $http.get("/api/v2016/mongo-document-attachment/" + target.uid, {
              params:params
          });
        } // touch
        //=======================================================================
        //
        //=======================================================================
        function uploadDocAtt(schema, _id, file) {

            if (!schema) throw "Error: no schema set to upload attachment";
            if (!_id) throw "Error: no docId set to upload attachment";

            return uploadTempFile(schema, file, {'_id':_id, 'public':true}).then(function(target) {
                  return moveTempFileToPermanent(target.data);
            });
        } // touch
        //=======================================================================
        //
        //=======================================================================
        function uploadTempFile(schema, file, options) {
            if (!schema) throw "Error: no schema set to upload attachment";
            if(!options)options={};

            var postData = {
                filename: replaceAllSpaces(file.name),
                mongo:true,
                //amazon messes with camel case and returns objects with hyphen in property name in accessible in JS
                // hence no camalized and no hyphanized meta names
                public:options.public,
                metadata: {
                    createdby: user.userID,
                    createdon: Date.now(),
                    schema: schema,
                    docid: options._id,
                    filename: replaceAllSpaces(file.name),
                }
            };

            return $http.post('/api/v2015/temporary-files', postData).then(function(res) {
                return $http.put(res.data.url, file, {
                    headers: {
                        'Content-Type': res.data.contentType
                    }
                }).then(function(){console.log(res);return res;});
            });
        } // touch


        //=======================================================================
        //
        //=======================================================================
      function replaceAllSpaces(string) {

          return string.split(' ').reduce(function(prev, curr, index) {
              if (index === 0) return curr;
              else return prev + '-' + curr;
          }, '');

      }
        //=======================================================================
        //
        //=======================================================================
      function awsFileNameFix(string) {
          string = encodeURIComponent(string);
          return string.split('%20').reduce(function(prev, curr, index) {
              curr = curr.replace("'", '%27');
              if (index === 0) return curr;
              else return prev + '-' + curr;
          }, '');

      }



        return {
          awsFileNameFix:awsFileNameFix,
            getCountries: countries,

            moveTempFileToPermanent:moveTempFileToPermanent,

            uploadTempFile:uploadTempFile,

            loadOwnerDocs: loadOwnerDocs,

            save: save,
            uploadDocAtt: uploadDocAtt,


        };
    }]);

});