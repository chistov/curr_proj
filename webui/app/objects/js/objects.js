'use strict';

/**
* ddosObjects Module
*
* Description
*/
var objectsModule = angular.module('ddosObjects', [])

.config([
  '$stateProvider', '$translatePartialLoaderProvider', '$controllerProvider',
  function($stateProvider, $translatePartialLoaderProvider, $controllerProvider) {
    $stateProvider
    .state('objects', {
      url: '/objects',
      templateUrl: 'app/objects/html/objects.html',
      controller: 'ddosObjectsController'
    })
    .state('objects.details', {
      parent: 'objects',
      url: '/{id:string}',
      templateUrl: 'app/objects/html/objects-tabset.html',
      controller: 'ddosObjectsDetailsController',
      resolve: {
        ddosObjectTemplateResolved: ['ddosObjectTemplate', function(ddosObjectTemplate) {
          return ddosObjectTemplate.promise().then(
            function(template) {
              return template;
            },
            function() {
              return {};
            });
        }]
      }
    })
    .state('objects.details.parameters', {
      parent: 'objects.details',
      url: '/parameters',
      templateUrl: 'app/objects/html/objects-parameters-tab.html',
      controller: 'ddosObjectsDetailsParametersController',
      resolve: {
        availableMitigationMeasures: ['$http', function($http) {
          return $http.get('app/objects/available-mitigation-measures-list').then(
            function(response) {
              if (!response.data.success)
                return {};
              return response.data.data;
            },
            function() {
              return {};
            });
        }]
      }
    })
    .state('objects.details.distributionList', {
      parent: 'objects.details',
      url: '/distribution-list',
      templateUrl: 'app/objects/html/objects-emailing-list-tab.html',
      controller: 'ddosObjectsDetailsDistributionListController'
    })
    .state('objects.details.attackReports', {
      parent: 'objects.details',
      url: '/attack-reports',
      templateUrl: 'app/objects/html/objects-attack-reports-tab.html',
      controller: 'ddosObjectsDetailsAttackReportsController'
    })
    .state('objects.details.rules', {
      parent: 'objects.details',
      url: '/rules',
      templateUrl: 'app/objects/html/objects-rules-tab.html',
      controller: 'ddosObjectsDetailsRulesController'
    })
    ;

    $translatePartialLoaderProvider.addPart('objects');

    objectsModule.controllerProvider = $controllerProvider;
  }
])

.factory('ddosObjectTemplate', [
  '$translate', '$http', '$q',
  function($translate, $http, $q){
  var templateDefered = $q.defer();
  var template = {
    attackEmailing: [],
    attackReports: {},
    ddosObject: undefined,
    id: "",
    creating: true
  };

  function init() {
    $http.get('app/objects/draft/details').then(
      function(response) {
        if ( !response.data.success )
          return;
        template.ddosObject = response.data.data.ddosObject;
        template.attackReports = response.data.data.attackReports;

        template.ddosObject.name = "OBJECTS.TABSET.PARAMETERS.NAME_NEW";
        template.id = "OBJECTS.TABSET.PARAMETERS.LABEL_NEW";
        var translationKeys = [
          template.ddosObject.name,
          template.id
        ];
        $translate(translationKeys).then(
          function(translations) {
            template.ddosObject.name = translations[template.ddosObject.name];
            template.id = translations[template.id];
            templateDefered.resolve(template);
        });
      },
      function(response) {});
  }

  init();
  return {
    promise: function() {
      return templateDefered.promise;
    }
  };
}])

.controller('ddosObjectsController', [
  '$scope', '$http', '$window', 'agTree',
  function($scope, $http, $window, agTree ){
  $scope.objects = {
    tree: agTree.create(
    {
      headerName: "Id",
      field: 'id',
      useCheckboxSelection: true,
      comparator: function(valueA, valueB, nodeA, nodeB, isInverted) {
        var id = [
          (valueA ? +valueA : 0),
          (valueB ? +valueB : 0),
        ];
        return id[0] - id[1];
      },
      onRowClickedUser: function(item, isGroup) {
        if (!isGroup)
          $scope.chooseObject(item);
      },
      columnDefsAdditional: [
      {
        headerName: "Name",
        headerClass: "text-left",
        field: "name"
      },
     {
        headerName: "Value",
        headerClass: "text-left",
        field: "value"
      } ]
    }
  )};

  $scope.deleteObject = function() {
    var selectedRows = $scope.objects.tree.api.getSelectedRows();
    if(!selectedRows.length) return; //button "remove" click without row

    var ids = [];
    for (var i = 0; i < selectedRows.length; ids.push(selectedRows[i++].id));

    if(!confirm("Are you want to delete " + ids.length + " object(s)?"))
      return;

    $http.post( 'app/objects/remove', { ids: ids }
        ).then(function(response) {
        if ( !response.data.success )
          return;

        $scope.objects.tree.api.setRowData( response.data.data.objects );
        $scope.objects.tree.api.sizeColumnsToFit();
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsController:deleteObject:', response.status );
    });
  };

  $scope.chartsetResize = function() {
    $scope.$broadcast('chartResize');
  };

  $scope.chooseObject = function( criterion ) {
    $scope.stateChange('objects.details', {id: criterion.id});
  };

  $scope.fetchObjects = function() {
    $http.get( 'app/objects/all').then(
      function(response) {
        if ( !response.data.success )
          return;

        $scope.$log.debug( 'ddosObjectsController:fetchObjects:', response.data );
        $scope.objects.tree.api.setRowData( response.data.data.objects );
        $scope.objects.tree.api.setSortModel( [{colId: 'id', sort: 'asc'}] );
        $scope.objects.tree.api.sizeColumnsToFit();
        if (response.data.data.objects.length > 0)
          $scope.chooseObject(response.data.data.objects[0]);
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsController:fetchObjects:', response.status );
    });
  };

  $scope.fetchObjects();
}])

.controller('ddosObjectsDetailsController', [
  '$scope', '$http', '$stateParams', '$window', 'ddosObjectTemplateResolved',
  function($scope, $http, $stateParams, $window, ddosObjectTemplateResolved) {

  $scope.currentObject = {id: $stateParams.id};

  $scope.attackReportsTable = {
    displayed: [],
    displayedPages: 10,
    itemsByPage: 30
  };

  $scope.attackEmailingTable = {
    displayed: [],
    displayedPages: 10,
    itemsByPage: 10
  };

  $scope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState) {
    var state = 'objects.details.parameters';
    if (toState.parent === 'objects.details')
      return;
    if (toParams.id && toParams.id !== 'create' &&
        fromState.parent && fromState.parent === 'objects.details')
      state = fromState.name;
    $scope.stateChange(state);
  });

  $scope.saveObjectParameters = function() {
    $http.post(
      'app/objects/save',
      $scope.currentObject
      ).then(
      function(response) {
        if ( !response.data.success )
          return;

        $scope.$log.debug( 'ddosObjectsDetailsController:saveObjectParameters:', response );
        $scope.objects.tree.api.setRowData( response.data.data.objects.objects );
        $scope.objects.tree.api.sizeColumnsToFit();
        if ($stateParams.id === 'create')
          $scope.stateChange('objects.details', {id: response.data.data.details.id});
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsDetailsController:saveObjectParameters:', response.status );
    });
  };

  $scope.fetch = function() {
    if ( $stateParams.id === 'create' )
      return $scope.currentObject = angular.copy(ddosObjectTemplateResolved);

    $http.get( 'app/objects/' + $stateParams.id + '/details').then(
      function(response) {
        if ( !response.data.success ) {
          $scope.stateChange('objects');
          return;
        }

        $scope.$log.debug( 'ddosObjectsDetailsController:fetch:', response.data );
        $scope.currentObject = response.data.data;
        $scope.attackEmailingTable.displayed = [].concat($scope.currentObject.attackEmailing);
        $scope.attackReportsTable.displayed = [].concat($scope.currentObject.attackReports.data);
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsDetailsController:fetch:', response.status );
        $scope.stateChange('objects');
    });
  };

  $scope.fetch();
  $scope.$parent.saveObjectParameters = $scope.saveObjectParameters;
}])

.controller('ddosObjectsDetailsParametersController', [
  // '$scope', '$uibModal', '$timeout', 'availableMitigationMeasures', 'agTree',
  // function($scope, $uibModal, $timeout, availableMitigationMeasures, agTree) {
    '$scope', '$uibModal', 'availableMitigationMeasures', 'agTree',
  function($scope, $uibModal, availableMitigationMeasures, agTree) {

  $scope.availableMitigationMeasures = availableMitigationMeasures;

  $scope.addDdosLevel = function() {
    for (var lvl in $scope.currentObject.ddosObject.ddos_levels) {
      if ( !$scope.currentObject.ddosObject.ddos_levels[lvl].enabled ) {
        $scope.currentObject.ddosObject.ddos_levels[lvl].enabled = true;
        break;
      }
    }
  };

  $scope.removeDdosLevel = function(key) {
    $scope.currentObject.ddosObject.ddos_levels[key].enabled = false;
  };

  $scope.editMitigationDetails = function(mitigation) {
    $scope.modalInstance = $uibModal.open({
      size: 'md',
      templateUrl: 'app/objects/html/mitigation-measures-details.html',
      controller: [
        '$scope', '$uibModalInstance', 'mitigationParameters',
        function($scope, $uibModalInstance, mitigationParameters) {
        $scope.mitigationParameters = mitigationParameters;
        $scope.apply = function() {
          $uibModalInstance.close($scope.mitigationParameters);
        };
        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
        };
      }],
      scope: $scope,
      resolve: {
        mitigationParameters: function() {
          return angular.copy(mitigation);
        }
      }
    });

    $scope.modalInstance.result.then(function (appliedMitigationParameters) {
      angular.copy(appliedMitigationParameters, mitigation);
    }, function () {
      $scope.$log.info('Modal edit dismissed at: ' + new Date());
    });
  };

  $scope.addMitigationSet = function(lvlMitigation) {
    if (lvlMitigation.length >= 10)
      return;
    lvlMitigation.push(
      {
        percent: "90",
        enabled_timeout: "120",
        measures: {}
      }
    );
  };

  $scope.removeMitigationSet = function(lvlMitigation, index) {
    if (lvlMitigation[index] && lvlMitigation[index].percent == "100")
      return;

    lvlMitigation.splice(index, 1);
  };

  $scope.addMitigationMeasure = function(measures, measureKey, measurePartial) {
    if ( measureKey in measures )
      return;
    $scope.editMitigationMeasure(measures, measureKey, undefined, measurePartial);
  };

  $scope.editMitigationMeasure = function(measures, measureKey, measureOpts, measurePartial ) {
    measurePartial = measurePartial || $scope.availableMitigationMeasures[measureKey];
    if (angular.isUndefined(measurePartial))
      return;
    measureOpts = measureOpts || {};

    $scope.modalInstance = $uibModal.open({
      size: 'md',
      templateUrl: measurePartial,
      controller: [
        '$scope', '$uibModalInstance', 'measureParameters',
        function($scope, $uibModalInstance, measureParameters) {
        $scope.measureParameters = measureParameters;
        $scope.apply = function() {
          $uibModalInstance.close($scope.measureParameters);
        };
        $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
        };
      }],
      scope: $scope,
      resolve: {
        measureParameters: function() {
          return angular.copy(measureOpts);
        }
      }
    });

    $scope.modalInstance.result.then(function (appliedMeasureParameters) {
      if ( !(measureKey in measures) ) {
        // created
        measures[measureKey] = measureOpts;
      }
      angular.copy(appliedMeasureParameters, measureOpts);
    }, function () {
      $scope.$log.info('Modal edit dismissed at: ' + new Date());
    });
  };

  $scope.removeMitigationMeasure = function(measures, key) {
    delete measures[key];
  };
}])

.controller('ddosObjectsDetailsDistributionListController', [
  '$scope', function($scope) {

  $scope.deleteEmailingEntry = function( entry ) {
    var index = $scope.currentObject.attackEmailing.indexOf( entry );
    if (index != -1)
      $scope.currentObject.attackEmailing.splice(index, 1);
  };

  $scope.addEmailingEntry = function() {
    $scope.currentObject.attackEmailing.push({
      ipMask: "0.0.0.0/0",
      email: "example@example.com",
      onAttack: 'false',
      reports: 'false',
      onBlocks: 'false',
      criticalOnly: 'false',
      attackLevel: 0
    });
  };

}])

.controller('ddosObjectsDetailsAttackReportsController', [
  '$scope', '$http', 'attacksFilter',
  function($scope, $http, attacksFilter) {

  $scope.datepickerOptions = {
    startingDay: 1
  };

  $scope.requestReports = function() {
    var filter = $scope.currentObject.attackReports.filter;
    var query = 'app/objects/' + $scope.currentObject.id + '/reports/' +
      (filter.all ?
            'all' : 'interval/' +
            (filter.from.date.getTime()/1000).toFixed() + '/' +
            (filter.to.date.getTime()/1000).toFixed());


    $http.get( query, { timeout: 10000 } ).
      success(function(data, status, headers, config) {
        if ( !data.success )
          return;

        // change dates interval on current
        var reports = $scope.currentObject.attackReports;
        reports.data = data.data;
        $scope.$log.debug( 'ddosObjectsDetailsAttackReportsController:load:reports', reports );

        // FIXME
        if (data.data.length > 0) {
          reports.filter.to.date = new Date( data.data[0].date + 'T23:59:59' );
          reports.filter.from.date = new Date( data.data[ data.data.length - 1 ].date + 'T00:00:00' );
        }
      }).
      error(function(data, status, headers, config) {
        $scope.$log.error( 'ddosObjectsDetailsAttackReportsController:load:reports', status);
    });
  };

  $scope.attacksDetails = function(report) {
    attacksFilter.reset();
    attacksFilter.setInterval( report.date, report.date, false );
    attacksFilter.filter.details.objectId = $scope.currentObject.id;
    $scope.stateChange('attacks');
  };

  $scope.datepickerOpen = function($event, model) {
    $event.preventDefault();
    $event.stopPropagation();
    model.opened = true;
  };

}])

.controller('ddosObjectsDetailsRulesController', [
  '$scope', '$window', '$http', '$interval', 'agTree',
  function($scope, $window, $http, $interval, agTree) {

  $scope.ruleTemplate = {
    duration: 60,
    durationUnits: 's',
    type_str: "BLOCK",
    ip1: "",
    port1: "",
    ip2: "",
    port2: ""
  };

  $scope.isRulesOnline = true;
  var lastClickedNode = null;
  var shiftLastSelectedNodes = new Set();
  var selectedNodes = new Set();
  var shiftAfterShift = false;

  function rmHighlight(id){
    var elem = $scope.rulesRoot.querySelector("[row='" + id + "']");
    if(elem === null) return; // ag-tree filter on
    elem.classList.remove('ag-row-selected');
  }

  function addHighlight(id){
    var elem = $scope.rulesRoot.querySelector("[row='" + id + "']");
    if(elem === null) return; // ag-tree filter on
    var list = elem.classList;
    var isSelected = /ag-row-selected/;
    var foundSelected = false;
    for(let className of list){
      if(isSelected.test(className)){
        foundSelected = true;
        break;
      }
    };

    if(!foundSelected)
      elem.className += ' ag-row-selected ag-row-selected';
  }

  $scope.rulesRoot =  document.getElementById('rulesTree');

  var observeDOM = (function(){
      var MutationObserver = $window.MutationObserver || $window.WebKitMutationObserver,
          eventListenerSupported = $window.addEventListener;

      return function(obj, callback){
          if( MutationObserver ){
              // define a new observer
              var obs = new MutationObserver(function(mutations, observer){
                  if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                      callback();
              });
              // have the observer observe foo for changes in children
              obs.observe( obj, { childList:true, subtree:true });
          }
          else if( eventListenerSupported ){
              obj.addEventListener('DOMNodeInserted', callback, false);
              // obj.addEventListener('DOMNodeRemoved', callback, false);
          }
      };
  })();

  // Observe a specific DOM element:
  observeDOM( $scope.rulesRoot ,function(){
      selectedNodes.forEach(addHighlight);
  });

  $scope.rulesTree = {
    tree: agTree.create(
    {
      headerName: "Duration",
      field: 'durationStr',
      width: 30,
      multiselect: true,
      onRowClickedUser: function(params) {
        if(shiftAfterShift && params.event.shiftKey){
          shiftLastSelectedNodes.forEach( (id) => {
            selectedNodes.delete(id);
            rmHighlight(id);
          });
          shiftLastSelectedNodes.clear();
        }

        if(params.event.shiftKey){
          if(lastClickedNode !== null){
            if(shiftLastSelectedNodes.size !== 0)
              shiftLastSelectedNodes.clear();

            var curr;
            var end = params.node.childIndex;
            var start = lastClickedNode.childIndex;
            curr = start;

            if(start < end)
              this.api.forEachNode( (node) => {
                if( (node.childIndex >= start) && (node.childIndex <= end)){
                  shiftLastSelectedNodes.add(node.childIndex);
                }
              });
            else
              this.api.forEachNode( (node) => {
                if( (node.childIndex <= start) && (node.childIndex >= end))
                  shiftLastSelectedNodes.add(node.childIndex);
              });

            shiftLastSelectedNodes.forEach( (id) => {
              selectedNodes.add(id);
            });
          }
          else{
            selectedNodes.add(params.node.childIndex);
            lastClickedNode = params.node; // page init case
          }
        }
        else if(params.event.ctrlKey)
          selectedNodes.add(params.node.childIndex);
        else{
          selectedNodes.forEach(rmHighlight);
          selectedNodes.clear();
          selectedNodes.add(params.node.childIndex);
        }
        selectedNodes.forEach(addHighlight);

        $scope.editRule(params.data);
        $scope.isRulesOnline = false;
        $scope.rulesUpdManager();

        if(params.event.shiftKey !== true)
          lastClickedNode = params.node;

        shiftAfterShift = params.event.shiftKey;
      },
      columnDefsAdditional: [
        {
          headerName: "Start time",
          headerClass: "text-left",
          field: "begin",
          width: 60
        },
        {
          headerName: "End time",
          headerClass: "text-left",
          field: "end",
          width: 60
        },
        {
          headerName: "Type",
          headerClass: "text-left",
          field: "type_str",
          width: 60
        },
        {
          headerName: "IP1",
          headerClass: "text-left",
          field: "ip1",
          width: 60
        },
        {
          headerName: "PORT1",
          headerClass: "text-left",
          field: "port1",
          width: 60
        },
        {
          headerName: "IP2",
          headerClass: "text-left",
          field: "ip2",
          width: 60
        },
        {
          headerName: "PORT2",
          headerClass: "text-left",
          field: "port2",
          width: 60
        }
      ]
    }
  )};

  $scope.delRules = function(){
    var rules = [];
    selectedNodes.forEach( function(id){
      var match;
      rules.push($scope.rulesTree.tree.api.inMemoryRowController.rowsAfterSort[id].data);
      // to iso8601
      match = rules[rules.length-1].begin.match(/([0-9]{2}).([0-9]{2}).([0-9]{4}) ([0-9]{2}).([0-9]{2}).([0-9]{2})/);
      rules[rules.length-1].begin = match[3] +'-'+ match[2] +'-'+ match[1] +'T'+ match[4] +':'+ match[5] +':'+ match[6] +'+03:00';
      match = rules[rules.length-1].end.match(/([0-9]{2}).([0-9]{2}).([0-9]{4}) ([0-9]{2}).([0-9]{2}).([0-9]{2})/);
      rules[rules.length-1].end = match[3] +'-'+ match[2] +'-'+ match[1] +'T'+ match[4] +':'+ match[5] +':'+ match[6] +'+03:00';
    });

    $scope.removeRule(rules);

    // move to initial state
    selectedNodes.forEach(rmHighlight);
    selectedNodes.clear();
    lastClickedNode = null;
    shiftLastSelectedNodes.clear();
    shiftAfterShift = false;
  }

  $scope.newRule = angular.copy( $scope.ruleTemplate );
  $scope.currentRule = undefined;

  var fetchRulesInterval;
  var fetchRulesPullInterval = 10000; // usec

  $scope.$watch('rulesTree.tree.api.inMemoryRowController.rowsAfterSort', function() { // (sort || filter) changed
    if(!$scope.rulesTree.tree.api.inMemoryRowController.rowsAfterSort) return; // startup case

    if($scope.rulesStartLen != $scope.rulesTree.tree.api.inMemoryRowController.rowsAfterSort.length){
      $scope.rulesStartLen = $scope.rulesTree.tree.api.inMemoryRowController.rowsAfterSort.length;
    }
    selectedNodes.clear();
    $scope.rulesTree.tree.api.deselectAll();
  });

  $scope.addRule = function() {
    $http.post(
      'app/objects/' + $scope.currentObject.id + '/rules/add',
      $scope.newRule).then(
      function(response) {
        if ( !response.data.success )
          return;

        $scope.rulesTree.tree.api.setRowData( response.data.data.rulesTree );
        $scope.rulesTree.tree.api.sizeColumnsToFit();
        $scope.$log.debug( 'ddosObjectsDetailsRulesController:addRule:', response );
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsDetailsRulesController:addRule:', response.status );
    });
  };

  $scope.cancelEditRule = function() {
    $scope.currentRule = undefined;
    $scope.newRule = angular.copy($scope.ruleTemplate);
  };
  $scope.saveEditRule = function() {
    $http.post(
      'app/objects/' + $scope.currentObject.id + '/rules/replace',
      {
        new: $scope.newRule,
        current: $scope.currentRule
      }).then(
      function(response) {
        if ( !response.data.success )
          return;

        $scope.cancelEditRule();
        setRulesModel(response.data.data);
        $scope.$log.debug( 'ddosObjectsDetailsRulesController:saveEditRule:', response );
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsDetailsRulesController:saveEditRule:', response.status );
    });
  };

  $scope.removeRule = function(rules) {
    $http.post(
      'app/objects/' + $scope.currentObject.id + '/rules/remove',
      rules).then(
      function(response) {
        if ( !response.data.success )
          return;

        $scope.rulesTree.tree.api.setRowData( response.data.data.rulesTree );
        $scope.rulesTree.tree.api.sizeColumnsToFit();
        $scope.$log.debug( 'ddosObjectsDetailsRulesController:removeRule:', response );
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsDetailsRulesController:removeRule:', response.status );
    });
  };

  $scope.editRule = function(rule) {
    $scope.newRule = angular.copy(rule);
    $scope.currentRule = angular.copy(rule);
  };

  $scope.fetchRules = function() {
    $http.get(
      'app/objects/' + $scope.currentObject.id + '/rules/all',
      {
        loadingIntercept: false,
        ignoreLoadingBar: true
      }).then(
      function(response) {
        if ( !response.data.success || !$scope.currentObject )
          return;

        $scope.$log.debug( 'ddosObjectsDetailsRulesController:fetchRules:', response.data );

        $scope.rulesTree.tree.api.setRowData( response.data.data.rulesTree );
        $scope.rulesTree.tree.api.sizeColumnsToFit();
        $scope.rulesStartLen = $scope.rulesTree.tree.api.inMemoryRowController.rowsAfterSort.length;
      },
      function(response) {
        $scope.$log.error( 'ddosObjectsDetailsRulesController:fetchRules:', response.status );
    });

  };

  $scope.fetchRules();
  $scope.rulesUpdManager = function(){
    if($scope.isRulesOnline)
      fetchRulesInterval = $interval($scope.fetchRules, fetchRulesPullInterval);
    else
      $interval.cancel(fetchRulesInterval);
  }
  $scope.rulesUpdManager();

  $scope.$on('$destroy', function() {
    $interval.cancel(fetchRulesInterval);
  });

}])
;

// TMP
// var now = new Date();
// var y = now.getFullYear();
// var m = now.getMonth();
// var d = now.getDate();
// $scope.objects = [

//   {
//     name: "НТКОМ",
//     value: "*",
//     subobjects: [
//       { name: "www.norsi-trans.ru" },
//       { name: "www.nt-com.ru" }
//     ],
//     ddos: {
//       level_critical: 900,
//       detect_tcp: true,
//       level_tcp: 100,
//       detect_udp: true,
//       level_udp: 50,
//       level_dns: 50000,
//       level_ntp: 10000,
//       level_smtp: 10000,
//       level_http_slow: 200,
//       level_http_flood: 10000,
//       block_time_attacker: 1800,
//       block_time_attacked: 900,
//       attackers_level: 100000
//     },
//     attackEmailing: [
//       {
//         email: "ddos-daemon@norsi-trans.ru",
//         onAttack: true,
//         reports: true,
//         onBlocks: true,
//         criticalOnly: false,
//         attackLevel: 0
//       }
//     ],
//     attackReports: {
//       filter: {
//         all: true,
//         from: {
//           date: new Date(y, m, d, 0, 0, 0), // start day
//           opened: false
//         },
//         to: {
//           date: new Date(y, m, d, 23, 59, 59), // end day
//           opened: false
//         }
//       },
//       data: []
//     },
//     trafficAnalyzing: {
//       filter: {
//         timeInterval: 5,
//         timelines: 96,
//         from: "",
//         to: "",
//         autoUpdate: false,
//         forceUpdate: false
//       },
//       twoD: [],
//       threeD: []
//     }
//   },

//   {
//     name: "COMMON",
//     value: "*",
//     ddos: {
//       level_critical: 900,
//       detect_tcp: true,
//       level_tcp: 100,
//       detect_udp: true,
//       level_udp: 50,
//       level_dns: 50000,
//       level_ntp: 10000,
//       level_smtp: 10000,
//       level_http_slow: 200,
//       level_http_flood: 10000,
//       block_time_attacker: 1800,
//       block_time_attacked: 900,
//       attackers_level: 100000
//     },
//     attackEmailing: [
//       {
//         email: "ddos-daemon@norsi-trans.ru",
//         onAttack: true,
//         reports: true,
//         onBlocks: true,
//         criticalOnly: false,
//         attackLevel: 0
//       }
//     ],
//     attackReports: {
//       filter: {
//         all: true,
//         from: {
//           date: new Date(y, m, d, 0, 0, 0), // start day
//           opened: false
//         },
//         to: {
//           date: new Date(y, m, d, 23, 59, 59), // end day
//           opened: false
//         }
//       },
//       data: []
//     },
//     trafficAnalyzing: {
//       filter: {
//         timeInterval: 5,
//         timelines: 96,
//         from: "",
//         to: "",
//         autoUpdate: false,
//         forceUpdate: false
//       },
//       twoD: [],
//       threeD: []
//     }
//   }
// ];

// $scope.chooseObject( $scope.objects[0] );
// TMP
