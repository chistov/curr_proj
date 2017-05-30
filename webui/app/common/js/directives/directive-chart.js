'use strict';

/**
* ddosDirectives.chart Module
*
* Description
*/
angular.module('ddosDirectives.chart', [])

.factory('chartUtils', [function(){
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function toMaskInputString(now) {
      var y = now.getFullYear();
      var d = now.getDate(); if (d < 10) d = "0" + d;
      var m = now.getMonth() + 1; if (m < 10) m = "0" + m;
      var H = now.getHours(); if (H < 10) H = "0" + H;
      var M = now.getMinutes(); if (M < 10) M = "0" + M;
      var S = now.getSeconds(); if (S < 10) S = "0" + S;
      return d.toString()+m+y+H+M+S;
  }

  function fromMaskInputStringToDate(s) {
      var date = new Date(s.substring(4, 4+4),
                          s.substring(2, 2+2)-1,
                          s.substring(0, 0+2),
                          s.substring(8, 8+2),
                          s.substring(10, 10+2),
                          s.substring(12, 12+2));

      return date;
  }

  function fromMaskInputString(s) {
      return fromMaskInputStringToDate(s).getTime() / 1000;
      var date = new Date(s.substring(4, 4+4),
                          s.substring(2, 2+2)-1,
                          s.substring(0, 0+2),
                          s.substring(8, 8+2),
                          s.substring(10, 10+2),
                          s.substring(12, 12+2)).getTime() / 1000;

      return date;
  }

  function convertUnixTimeToString(unixts) {
      var date = new Date(unixts * 1000);
      var y = date.getFullYear();
      var d = date.getDate(); if (d < 10) d = "0" + d;
      var m = date.getMonth() + 1; if (m < 10) m = "0" + m;
      var H = date.getHours(); if (H < 10) H = "0" + H;
      var M = date.getMinutes(); if (M < 10) M = "0" + M;
      var S = date.getSeconds(); if (S < 10) S = "0" + S;
      return H + ":" + M + ":" + S + "\n" + d + "." + m + "." + y;
  }

  return {
    isNumeric: isNumeric,
    getRandomInt: getRandomInt,
    toMaskInputString: toMaskInputString,
    fromMaskInputString: fromMaskInputString,
    fromMaskInputStringToDate: fromMaskInputStringToDate,
    convertUnixTimeToString: convertUnixTimeToString
  };
}])

.directive('chartset', [function(){
  return {
    restrict: 'E',
    templateUrl: function (tElement, tAttrs) {
      return tAttrs.templateUrl||"app/common/js/directives/directive-chartset.html";
    },
    scope: {
      monitors: "=conf",
      timeFilter: "=period"
    },

    controller: function($scope, $interval, $http, chartUtils) {
      var _this = this;
      $scope.$log = $scope.$root.$log;

      $scope.$on('forceUpdate', function(e, userUpdate) {
        $scope.$log.info('$scope:on forceUpdate event is emitted');
        _this.updateMonitors(undefined, userUpdate);
      });

      _this.deleteMonitor = function(chart, index) {
        if ($scope.monitors[chart] && $scope.monitors[chart][index]){
          $http.post('app/network/chart_delete',
          {
            chartID: ($scope.monitors[chart][index]).chartID
          }).
          success(function(data, status, headers, config) {
            if ( !data.success )
              return;
          }).
          error(function(data, status, headers, config) {
          });

          $scope.monitors[chart].splice(index, 1);
        }
      };

      _this.addMonitor = function(monitor, index) {
        if ( !monitor.chart || !$scope.monitors[monitor.chart] )
          return;

        index = index || $scope.monitors[monitor.chart].length;
        $scope.monitors[monitor.chart].splice(index, 0, monitor);
      };

      _this.updateMonitors = function(monitor, userUpdate) {
        function fetch(monitor, userUpdate) {
          $http.post('app/network/chart',
            {
              monitor: monitor,
              globalFilter: $scope.monitors.globalFilter,
              period: {
                from: chartUtils.fromMaskInputString($scope.timeFilter.from),
                to:   chartUtils.fromMaskInputString($scope.timeFilter.to),
                interval: $scope.timeFilter.timeInterval
              }
            },
            {
              loadingIntercept: userUpdate,
              ignoreLoadingBar: !userUpdate
            }).
            success(function(data, status, headers, config) {
              if ( !data.success )
                return;
              monitor.chartID = data.data.chartID;
              monitor.updateChart(data.data);
            }).
            error(function(data, status, headers, config) {
          });
        }

        if (!angular.isUndefined(monitor)) {
          fetch(monitor, true);
          return;
        }

        var index;
        for ( index = 0; index < $scope.monitors.twoD.length; ++index ) {
          fetch($scope.monitors.twoD[index], userUpdate);
        }
        for ( index = 0; index < $scope.monitors.threeD.length; ++index ) {
          fetch($scope.monitors.threeD[index], userUpdate);
        }
      };
    },
    link: function($scope, iElm, iAttrs, controller) {
    }
  };
}])

.directive('chart', [function(){
  return {
    require: '^chartset',
    restrict: 'E',
    templateUrl: function (tElement, tAttrs) {
      return tAttrs.templateUrl||"app/common/js/directives/directive-chart.html";
    },
    scope: {
      monitor: "=conf",
      index: "=index"
    },

    controller: function($scope, $element, $attrs, $timeout, chartSettingsService, chartUtils) {
      var _this = this;
      _this.monitor = $scope.monitor;
      _this.chartUtils = chartUtils;

      $scope.$log = $scope.$root.$log;
      $scope.isOpen = true;
      $scope.isFullscreen = false;

      $scope.toggleCollapse = function() {
        $scope.isOpen = !$scope.isOpen;
        if ($scope.isOpen)
          $scope.$broadcast('chartResize');
      };
      $scope.toggleFullscreen = function() {
        $scope.isFullscreen = !$scope.isFullscreen;
        // TODO debug the feature, make for 2d
        $scope.$broadcast('chartResize',
          $scope.isFullscreen ? $(window).height()-50 : 0/*default*/ );
      };

      $scope.edit = function() {
        var monitorEdit = angular.copy( $scope.monitor );
        chartSettingsService.open( monitorEdit ).then(
          function ( monitor ) { // apply
            $scope.$log.debug( 'chart:edit: apply', monitor );
            if ( angular.equals($scope.monitor, monitorEdit) )
              return;

            var updateChart = $scope.monitor.updateChart;
            angular.copy(monitor, $scope.monitor);
            $scope.monitor.updateChart = updateChart;
            $scope.refresh();
          },
          function () { // cancel
            $scope.$log.info('Modal dismissed at: ' + new Date());
        });
      };

      $scope.refresh = function() {
        $scope.chartsetController.updateMonitors( $scope.monitor );
      };

      $scope.close = function() {
        $scope.chartsetController.deleteMonitor($scope.monitor.chart, $scope.index);
      };

      // refresh new chart
      $timeout($scope.refresh, 100, false);
    },
    link: function($scope, iElm, iAttrs, chartsetController) {
      $scope.chartsetController = chartsetController;
    }
  };
}])

// via amcharts
.directive('chart2d', [function(){
  return {
    require: '^chart',
    restrict: 'A',

    controller: function($scope, $timeout) {
      $scope.$timeout = $timeout;
    },
    link: function($scope, iElm, iAttrs, chartController) {
      var iElmHeight = iElm.height() || 200;

      $scope.$on('chartResize', function(event, height) {
        $scope.$log.info('chart2d $scope:on chartResize event is emitted');
        $scope.$timeout(function() {
          if (angular.isUndefined(height))
            chart.invalidateSize();
          else {
            height = height || iElmHeight;
            iElm.css("height", height + "px");
            chart.invalidateSize();
          }
        }, 0, false);

      });

      // vars
      var chart;

      function init() {
        iElm.css("height", iElmHeight + "px");
        var originalElement = iElm[0];

        // create chart
        chart = new AmCharts.AmSerialChart();
        chart.pathToImages = "lib/amcharts/images/";
        chart.categoryField = "time";
        chart.plotAreaBorderAlpha = 0;
        chart.usePrefixes = true;

        // configure category axis - X
        var categoryAxis = chart.categoryAxis;
        categoryAxis.parseDates = false; // as our data is date-based, we set parseDates to true
        categoryAxis.dashLength = 0;
        categoryAxis.gridAlpha = 0.15;
        categoryAxis.fontSize = 8;
        categoryAxis.categoryFunction = function (v) { return chartController.chartUtils.convertUnixTimeToString(v); };

        if (chartController.monitor.guide){
            var guide = new AmCharts.Guide();
            guide.category = chartController.chartUtils.convertUnixTimeToString(chartController.monitor.guide.value);
            guide.lineColor = "#CC0000";
            guide.lineAlpha = 1;
            guide.dashLength = 2;
            guide.inside = true;
            guide.labelRotation = 90;
            guide.label = chartController.monitor.guide.label || '';
            categoryAxis.addGuide(guide);
        }

        var chartCursor = new AmCharts.ChartCursor();
        chartCursor.cursorPosition = "mouse";
        chartCursor.categoryBalloonEnabled = true;
        chart.addChartCursor(chartCursor);

        // create graphs and value axis - Y
        for( var i = 0; i < chartController.monitor.metrics.length; ++i ) {
            var metric = chartController.monitor.metrics[i];
            var valueAxis = new AmCharts.ValueAxis();
            if ('max' in metric)
                valueAxis.maximum = metric.max;
            if ('min' in metric)
                valueAxis.minimum = metric.min;
            valueAxis.position = metric.axis&&metric.axis.position||'left';
            chart.addValueAxis(valueAxis);
            for( var j = 0; j < metric.graphs.length; ++j ) {
              var graph = new AmCharts.AmGraph();
              var caption = metric.graphs[j].caption;
              if (!chartController.chartUtils.isNumeric(caption))
                  graph.balloonText = caption + ": [[value]]";
              graph.valueAxis = valueAxis;
              graph.valueField =  metric.graphs[j].value;
              chart.addGraph(graph);
            }
        }

        chart.write(originalElement);
      }

      function updateChart(data) {
        chart.dataProvider = data;
        chart.validateData();
      }

      init();
      chartController.monitor.updateChart = updateChart;
    }
  };
}])

// via three.js as ThreeChart

.directive('chart3d', [function(){
  return {
    require: '^chart',
    restrict: 'A',
    controller: function($scope, $timeout, $http) {
      $scope.$timeout = $timeout;
      $scope.$http = $http;
    },

    link: function($scope, iElm, iAttrs, chartController) {
      var iElmHeight = iElm.height() || 500;
      iElm.css("height", iElmHeight + "px");
      var chart = new THREEChart.Chart(iElm, !$scope.$root.production);

      chart.onServerMagnifier = function(postData, onSuccess) {
        if(jQuery.isEmptyObject(postData))
          return;

        $scope.$http.post('app/network/chart/magnifier',
          {
            monitor: chartController.monitor,
            data: postData,
            chartID: chartController.monitor.chartID
          },
          {
            loadingIntercept: true,
          }).
          success(function(data, status, headers, config) {
            if ( !data.success )
              return;

            onSuccess(data.data);
          }).
          error(function(data, status, headers, config) {
        });
      };

      var monitor = chartController.monitor;
      $scope.$on('remove_chart_files', function(){
        if (angular.isDefined(monitor)){
          $scope.$http.post('app/network/chart_delete',
          {
            chartID: monitor.chartID
          });
        }
      });

      $scope.$on('$destroy', function(){
        if (angular.isDefined(chart))
          chart.destroy();
        $scope.$broadcast('remove_chart_files');
      });

      $scope.$on('chartResize', function(event, height) {
        if (angular.isUndefined(chart))
          return;

        $scope.$log.info('chart3d $scope:on chartResize event is emitted');
        $scope.$timeout(function() {
          if (angular.isUndefined(height))
            chart.invalidateSize();
          else {
            height = height || iElmHeight;
            // iElm.css("width", "auto");
            iElm.css("height", height + "px");
            chart.invalidateSize();
          }
        }, 0, false);
      });

      chartController.monitor.updateChart = function(data) {
        chart.update(data, this);
      };
    }
  };
}])
.run(function($rootScope, $window){
  var windowElement = angular.element($window);
  windowElement.on('beforeunload', function (event) { // F5(page reload) button specific
    $rootScope.$broadcast("remove_chart_files");
  });
  });

