'use strict';

/* Directives */

angular.module('ddosDirectives.Diag', [])
    .directive('diag', function($http) {


        return {
            restrict: "E",

            transclude: true,

            templateUrl: function (tElement, tAttrs) {
              return tAttrs.templateUrl||"app/common/js/directives/directive-diag.html";
            },

            scope: {
                configFile: "@conf",
                database: "@db"
            },

            controller: function($scope, $timeout, $interval, chartUtils) {
                var autoUpdateInterval;
                var now = new Date();

                $scope.filter = {
                    from: chartUtils.toMaskInputString(new Date(now.getTime() - 60*60*1000)),
                    to: chartUtils.toMaskInputString(now),
                    timeInterval: 5,
                    autoUpdate: true
                };

                $scope.configureMonitors = function() {
                    $scope.charts = [];
                    for (var i in $scope.monitors) {
                        var monitor = $scope.monitors[i];
                        var chart = new AmCharts.AmSerialChart();
                        chart.pathToImages = "lib/amcharts/images/";
                        //chart.colors = ["#7C0000", "#00СС00", "#0000СС", "#0000FF", "#000000", "#000000"];
                        chart.categoryField = "time";
                        chart.plotAreaBorderAlpha = 0;
                        chart.usePrefixes = true;

                        var categoryAxis = chart.categoryAxis;
                        categoryAxis.parseDates = false; // as our data is date-based, we set parseDates to true
                        categoryAxis.dashLength = 0;
                        categoryAxis.gridAlpha = 0.15;
                        //categoryAxis.axisColor = "#DADADA";
                        //categoryAxis.labelFrequency = 2;
                        categoryAxis.fontSize = 8;
                        categoryAxis.categoryFunction = function (v) { return chartUtils.convertUnixTimeToString(v); };

                        var valueAxises = [];
                        if ( monitor.valueAxis !== undefined ) {
                            for (var j = 0; j <  monitor.valueAxis.length; ++j) {
                                var vAxisMon = monitor.valueAxis[j];
                                var valueAxis = new AmCharts.ValueAxis();
                                if ( vAxisMon.position !== undefined )
                                    valueAxis.position = vAxisMon.position;
                                chart.addValueAxis(valueAxis);
                                valueAxises.push(valueAxis);
                            }
                        } else {
                            var valueAxis = new AmCharts.ValueAxis();
                            if (monitor.max !== undefined)
                                valueAxis.maximum = monitor.max;
                            if (monitor.stackType !== undefined )
                                valueAxis.stackType = monitor.stackType;
                            chart.addValueAxis(valueAxis);
                            valueAxises.push(valueAxis);
                        }

                        var chartCursor = new AmCharts.ChartCursor();
                        chartCursor.cursorPosition = "mouse";
                        chartCursor.categoryBalloonEnabled = true;
                        chart.addChartCursor(chartCursor);

                        var axisIndex = 0;
                        for (var v in monitor.data) {
                            var graph = new AmCharts.AmGraph();
                            if (monitor.fillAlphas !== undefined )
                                graph.fillAlphas = monitor.fillAlphas;
                            if (monitor.type !== undefined )
                                graph.type = monitor.type;

                            if (!chartUtils.isNumeric(v))
                                graph.balloonText = v + ": [[value]]";
                            graph.valueField = monitor.data[v];
                            graph.valueAxis = valueAxises[axisIndex++];
                            chart.addGraph(graph);
                        }

                        chart.write(monitor.id);

                        chart.dataProvider = $scope.data;
                        chart.validateData();

                        $scope.charts[i] = chart;
                    }
                };

                $scope.getMonitors = function(userUpdate, action) {
                    var msg = {
                        'from': chartUtils.fromMaskInputString($scope.filter.from),
                        'to': chartUtils.fromMaskInputString($scope.filter.to),
                        'interval': $scope.filter.timeInterval,
                    };

                    $http.post(
                        "app/network/php/TmpDiag.php?cfg=" + $scope.configFile +
                            "&db=" + $scope.database,
                        msg,
                        {
                            loadingIntercept: userUpdate,
                            ignoreLoadingBar: !userUpdate
                        }).
                        success(function(data, status, headers, config) {
                            action(data);
                        });
                };

                $scope.loadMonitors = function() {
                    $scope.getMonitors(true, function(data) {
                            $scope.monitors = data.charts;
                            $scope.data = data.data;
                            $timeout($scope.configureMonitors);
                        });
                };

                $scope.updateMonitors = function(userUpdate) {
                     $scope.getMonitors(userUpdate, function(data) {
                            $scope.data = data.data;
                            for (var i in $scope.charts) {
                                $scope.charts[i].dataProvider = $scope.data;
                                $scope.charts[i].validateData();
                            }
                        });
                };

                $scope.autoUpdate = function() {
                    if (!$scope.filter.autoUpdate)
                        return;

                    now = new Date();
                    $scope.filter.from = chartUtils.toMaskInputString(new Date(now.getTime() - 60*60*1000));
                    $scope.filter.to = chartUtils.toMaskInputString(now);

                    $scope.updateMonitors(false);
                };

                $scope.apply = function() {
                    $scope.updateMonitors(true);
                };

                $scope.$on('$destroy', function(){
                  $interval.cancel(autoUpdateInterval);
                });

                $scope.loadMonitors();
                autoUpdateInterval = $interval($scope.autoUpdate, 10000);
            },

            link: function(scope, element, attrs) {
            }
        };
    });
