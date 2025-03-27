define(['text!./undb-map.html',
    'app',

    'lodash',
        "data/ccc",
    './ammap3',
    "factories/km-utilities",
    "./filter-parties",
    "./filter-actors",
    "./filter-actions",
    "./filter-aichi",
  'jquery'
], function(template, app, _,ccc) {
    'use strict';

    app.directive('undbMap', ['$http', 'realm', '$q', '$timeout', '$location', '$filter','$document', function($http, realm, $q, $timeout, $location, $filter,$document) {
        return {
            restrict: 'E',
            template: template,
            replace: true,
            scope: {},
            require: 'undbMap',
            link: function($scope, $element, $attr, reportingDisplay) { // jshint ignore:line

                $scope.loaded = false;
                $scope.subQueries = {};
                $scope.message = '';
                $scope.link = '';
                $scope.toggleCaption = 1;
                $scope.loadingObj ={};
                $scope.loading = true;



                setLoading('countries',true);
                $http.get("/api/v2015/countries", {
                    cache: true
                }).then(function(o) {
                    $scope.countries = $filter('orderBy')(o.data, 'title|lstring');
                    $http.get("/api/v2013/index", {
                        params: {
                            'q': 'schema_s:nationalAssessment AND realm_ss:' + realm.replace('UNDB', 'CHM'),
                            'sort': 'createdDate_dt desc',
                            'fl':'nationalTarget_EN_t,progress_EN_s,government_s,identifier_s,country_s,title_s, description_s,lat_d,lng_d',
                            'wt': 'json',
                            'start': 0,
                            'rows': 1000000,
                        }
                    }).then(function(o) {
                        if(Array.isArray(o.data.response.docs))
                          for(var i=0; i<o.data.response.docs.length;i++){
                            var natAssDoc =o.data.response.docs[i];
                            if(!natAssDoc.nationalTarget_EN_t)continue;
                            natAssDoc.progress=progressToNumber(natAssDoc.progress_EN_s);
                            for(var j=0; j<$scope.countries.length;j++){
                                if($scope.countries[j].code.toLowerCase()===natAssDoc.government_s){
                                  if(!$scope.countries[j].docs)$scope.countries[j].docs=[];
                                  if($scope.countries[j].docs.length===0 )$scope.countries[j].docs.push(natAssDoc);
                                  else if($scope.countries[j].docs[0].progress< natAssDoc.progress){
                                    $scope.countries[j].docs[0]=natAssDoc;

                                  }
                                }

                            }
                          }
                          setLoading('countries',false);
                    });
                    return;
                });



                //=======================================================================
                //
                //=======================================================================
                function getEvents() {
                  setLoading('event',true);
                return $http.get("/api/v2013/index", {
                    params: {
                        'q': 'schema_s:event AND lat_d:[* TO *]',
                        'sort': 'createdDate_dt desc',
                        'fl':'logo*,id,identifier_s,country_s,title_s, description_s,lat_d,lng_d,endDate_dt,startDate_dt,aichiTarget_ss,thematicArea_ss',
                        'wt': 'json',
                        'start': 0,
                        'rows': 1000000,
                    }
                }).then(function(o) {
                    $scope.actions = o.data.response.docs;

                   $scope.actions=$scope.actions.concat(ccc);
                   has25th()
                    if ($attr.schema === 'actions') {
                        activateFilter();
                        $scope.message = "actions";

                        $scope.link="/actions/worldwide";

                    }
                    $timeout(function () {
                      setLoading('event',false);
                    }, 750);
                });
              }
              //=======================================================================
              //
              //=======================================================================
              function is25th(event) {
                  if(event && event.thematicArea_ss)
                    for (var theme of event.thematicArea_ss) {
                      if(theme==='CBD-SUBJECT-25TH-ANN'){
                        return true;
                      }
                    }
                  return false
              } //generateMarker
              //=======================================================================
              //
              //=======================================================================
              function has25th() {

                  var actions = $scope.actions;
                  for (var i = 0; i < actions.length; i++)
                    if(is25th(actions[i])){
                      $scope.has25thFlag = true;
                      return true
                    }
                  $scope.has25thFlag = false;
              } //generateMarker
                //=======================================================================
                //
                //=======================================================================
                function getActors() {
                    setLoading('undbActor',true);
                    return $http.get("/api/v2013/index", {
                        params: {
                            'q': 'schema_s:undbActor',
                            'fl':'id,logo*,identifier_s,country_s,title_s, description_s,lat_d,lng_d,coordinates_s',
                            'sort': 'createdDate_dt desc',
                            'wt': 'json',
                            'start': 0,
                            'rows': 1000000,
                        }
                    }).then(function(o) {

                        $scope.actors = o.data.response.docs;

                        if ($attr.schema === 'undbActor') {
                            activateFilter();
                            $scope.message = "actors";
                            $scope.link="/actors";

                        }
                        $timeout(function () {
                          setLoading('undbActor',false);
                        }, 750);
                    });
                }
                //=======================================================================
                //
                //=======================================================================
                function setLoading(schema,isLoading) {

                  $scope.loadingObj[schema] =isLoading;
                  var isL = false;
                  for (var variable in $scope.loadingObj)
                     if ($scope.loadingObj[variable])
                          isL = true;

                  $scope.loading= isL;

                } //
                $scope.setLoading=setLoading;
                //=======================================================================
                //
                //=======================================================================
                function progressToNumber(progress) {
                  if(progress)
                    switch (progress.trim()) {
                      case "On track to exceed target":
                        return 5;
                      case "On track to achieve target":
                        return 4;
                      case "Progress towards target but at an  insufficient rate":
                        return 3;
                      case "No significant change":
                        return 2;
                      case "Moving away from target":
                        return 1;
                    }
                    return 1
                } //progressToNumber(progress)
                //=======================================================================
                //
                //=======================================================================
                function activateFilter() {
                    if ($attr.schema) {
                        $timeout(function() {
                            $scope.selectedSchema = $attr.schema;
                            reportingDisplay.search();
                        }, 1000);
                    }
                }

                //=======================================================================
                //
                //=======================================================================
                function goTo(link) {

                    $location.url(link);
                }
                $scope.goTo=goTo;


              function init(){
                $scope.toggleCaption = 1;
                activateFilter();
                if ($attr.schema === 'actions')
                  getEvents().then(getActors);
                if ($attr.schema !== 'actions')
                  getActors().then(getEvents);
              }

              init();
            }, //link


            //=======================================================================
            //
            //=======================================================================
            controller: ["$scope", function($scope) {

                    var queryScheduled;
                    $scope.filters = {
                        'parties': {
                            active: false
                        },
                        'actors': {
                            active: false
                        },
                        'actions': {
                            active: true
                        },
                        'aichi': {
                            active: false
                        },
                    };


                    //=======================================================================
                    //
                    //=======================================================================
                    $scope.buildQuery = function() {
                        // NOT version_s:* remove non-public records from resultset
                        var q = 'NOT version_s:*';

                        var subQueries = [];

                        _.each($scope.subQueries, function(filter, filterName) {
                            subQueries = _.compact([
                                getFormatedSubQuery(filterName, 'schema_s'),
                                getFormatedSubQuery(filterName, 'startDate_dt'),
                                getFormatedSubQuery(filterName, 'endDate_dt'),
                                getFormatedSubQuery(filterName, 'state_s'),
                            ]);
                        });

                        if (subQueries.length)
                            q += " AND " + subQueries.join(" AND ");
                        return q;
                    }; //$scope.buildQuery


                    //=======================================================================
                    //
                    //=======================================================================
                    function getFormatedSubQuery(filter, name) {

                        if (!filter) return '';
                        var fil = $scope.subQueries[filter];

                        if (!fil) return '';
                        if (!fil[name]) return '';

                        var subQ = '';
                        subQ += name + ':' + fil[name].join(' OR ' + name + ":");
                        subQ = '(' + subQ + ')';

                        return subQ;
                    } //function getFormatedSubQuery (name)


                    //=======================================================================
                    //
                    //=======================================================================
                    function query($scope) {

                        if ($scope.selectedSchema === 'parties') {
                            if($scope.documents)
                              filterActive('parties');
                            $scope.documents = groupByCountry($scope.countries, 1);
                            return;
                        }
                        if ($scope.selectedSchema === 'aichi') {
                            if($scope.documents)
                              filterActive('aichi');
                            $scope.documents = groupByCountry($scope.countries, 1);
                            $scope.toggleCaption=false;
                            return;
                        }

                        if ($scope.selectedSchema === 'undbActor') {
                            filterActive('actors');

                            $scope.documents = _.clone($scope.actors);

                            return;
                        }

                        if ($scope.selectedSchema === 'actions') {
                            filterActive('actions');
                            if (_.isEmpty($scope.subQueries))
                                $scope.documents = _.clone($scope.actions);
                            sendQuery();
                            return;
                        }

                    } // query


                    //=======================================================================
                    //
                    //=======================================================================
                    function sendQuery() {

                        if (_.isEmpty($scope.subQueries)) return;
                        $scope.setLoading($scope.selectedSchema,true);

                        var queryParameters = {
                            'q': $scope.buildQuery(),
                            'sort': 'createdDate_dt desc',
                            'wt': 'json',
                            'fl':'progress_EN_s,id,logo_s,startDate_dt,endDate_dt,identifier_s,country_s,title_s, description_s,lat_d,lng_d,thematicArea_ss',
                            'start': 0,
                            'rows': 1000000,
                        };

                        $http.get('/api/v2013/index', {
                            params: queryParameters,
                            cache: false
                        }).success(function(data) {

                            $scope.documents = data.response.docs;
                            if($scope.selectedSchema === 'actions' && $scope.buildQuery().indexOf('2010')==-1)
                              $scope.documents =$scope.documents.concat(ccc);


                            $scope.count = data.response.numFound;
                            $timeout(function () {

                              if($scope.selectedSchema==='actions')$scope.setLoading('actions',false);
                              $scope.setLoading($scope.selectedSchema,false);
                            }, 1250);
                        });
                    } // query

                    //=======================================================================
                    //
                    //=======================================================================
                    function groupByCountry(list, countries) {
                        var docsByCountry = {};
                        $scope.euData = {};
                        if (!$scope.countries) return '';
                        if (countries)
                            _.each($scope.countries, function(doc) {
                                if (!docsByCountry[doc.code]) // if country object not created created
                                {
                                    docsByCountry[doc.code] = [];
                                    docsByCountry[doc.code] = getCountryById(doc.code); //insert country data
                                    // docsByCountry[doc.code].docs = {}; // initializes the countries docs
                                }
                            });


                        if (docsByCountry.EU)
                            docsByCountry.EU.isEUR = true;

                        return docsByCountry;
                    } //readQueryString

                    //=======================================================================
                    //
                    //=======================================================================
                    function getCountryById(id) {

                        var index = _.findIndex($scope.countries, function(country) {

                            return country.code.toUpperCase() === id.toUpperCase();
                        });
                        return $scope.countries[index];
                    } //getCountryById


                    //=======================================================================
                    //getter/setter
                    //=======================================================================
                    function filterActive(activeFilter) {
                        $scope.toggleCaption = true;
                        _.each($scope.filters, function(filter) {
                            filter.active = false;
                        });
                        if (activeFilter)
                            $scope.filters[activeFilter].active = true;
                        $(document).find(".mapPopup").show();
                    }


                    //=======================================================================
                    //
                    //=======================================================================
                    function search() {

                        if (queryScheduled)
                            $timeout.cancel($scope.queryScheduled);
                        queryScheduled = $timeout(function() {
                            query($scope);
                        }, 100);
                    } //search


                    //=======================================================================
                    //
                    //=======================================================================
                    function addSubQuery(filter, name, query, singleTon) {

                        $scope.subQueries = {};
                        $scope.selectedSchema = '';
                        $location.replace();
                        $location.search('filter', null);
                        if (filter && name && !query && !singleTon) {
                            $scope.subQueries = _.cloneDeep(filter);
                            $scope.selectedSchema = name;
                        }
                    } //addSubQuery


                    //=======================================================================
                    //
                    //=======================================================================
                    function deleteSubQuery(name) {

                        if ($scope.subQueries)
                            delete($scope.subQueries[name]);
                    } //deleteSubQuery


                    this.filterActive = filterActive;
                    this.deleteSubQuery = deleteSubQuery;
                    this.search = search;
                    this.addSubQuery = addSubQuery;
                }] //controlerr
        }; //return
    }]); //directive
}); //define
