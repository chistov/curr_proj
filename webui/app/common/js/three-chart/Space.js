/**
 * THREEChart Space module
 */

THREEChart.Space = function () {
  // z-fighting prevent factor
  var zFightingFactorPrevent = 0.001;

  this.coordinateGrid = {
    x:      [ -10, 10 ],
    z:      [ -10, 10 ],
    y:      0,  // 0y
    yUp:    [  zFightingFactorPrevent,  10+zFightingFactorPrevent ], // 0+y
    yDown:  [ -10-zFightingFactorPrevent, -zFightingFactorPrevent ], // 0-y
  };

  this.yClampEnabled = false;
  this.yDownEnabled = false;
  this.data = {};

  //--------------------------------------------------------------------------
  // Variables

  var scope = this;

  // absolute, external values
  var dataAbsolute;
  var values;
  var maxYUpAbsolute;
  var maxYDownAbsolute;
  var maxYUpSumAbsolute;
  var maxYDownSumAbsolute;
  var yUpSumAbsolute;
  var yDownSumAbsolute;
  var xRangeAbsolute;
  var zRangeAbsolute;

  // Y zoom functionality
  var yZoomRange = [ 1, 10 ];
  var yZoomFactor = yZoomRange[0];

  // selection area functionality
  var maxYUpInRange;
  var maxYDownInRange;
  var maxYUpSumInRange;
  var maxYDownSumInRange;
  var yUpSumInRange;
  var yDownSumInRange;

  // final values, after apply all modificators
  var xRange;
  var zRange;
  var maxYUp;
  var maxYDown;
  var maxYUpSum;
  var maxYDownSum;
  var yUpSum;
  var yDownSum;

  // value -> coordinate
  var x;
  var yUp;
  var yDown;
  var z;

  // coordinate -> value
  var valueX;
  var valueYUp;
  var valueYDown;
  var valueZ;

  this.updateData = function(data, yDownEnabled) { // update absolute data
    scope.yDownEnabled = yDownEnabled;

    dataAbsolute = data;
    scope.data = data;
    values = data&&data.data || [[]];

    xRangeAbsolute = [0, data&&data.maxRow    || 0];
    zRangeAbsolute = [0, data&&data.maxColumn || 0];
    xRange = xRangeAbsolute;
    zRange = zRangeAbsolute;

    maxYUpAbsolute    = data&&data.maxValue     || 0;
    maxYDownAbsolute  = data&&data.maxValueDown || 0;
    maxYUpInRange     = maxYUpAbsolute;
    maxYDownInRange   = maxYDownAbsolute;

    maxYUpSumAbsolute    = data&&data.maxSumValue      || 0;
    maxYDownSumAbsolute  = data&&data.maxSumValueDown  || 0;
    maxYUpSumInRange     = maxYUpSumAbsolute;
    maxYDownSumInRange   = maxYDownSumAbsolute;

    yUpSumAbsolute       = data&&data.sumValue         || 0;
    yDownSumAbsolute     = data&&data.sumValueDown     || 0;
    yUpSumInRange        = yUpSumAbsolute;
    yDownSumInRange      = yDownSumAbsolute;

    scope.updateScales();

    return scope.isValid();
  };

  this.updateDataInRange = function(data) {
    scope.data = data;
    values = data&&data.data || [[]];

    xRange = [0, data&&data.maxRow    || 0];
    zRange = [0, data&&data.maxColumn || 0];

    maxYUpInRange   = data&&data.maxValue     || 0;
    maxYDownInRange = data&&data.maxValueDown || 0;

    maxYUpSumInRange   = data&&data.maxSumValue     || 0;
    maxYDownSumInRange = data&&data.maxSumValueDown || 0;

    yUpSumInRange      = data&&data.sumValue        || 0;
    yDownSumInRange    = data&&data.sumValueDown    || 0;

    scope.updateScales();
  };

  this.updateScales = function() {
    maxYUp = maxYUpInRange/yZoomFactor;
    maxYDown  = maxYDownInRange/yZoomFactor;
    maxYUpSum = maxYUpSumInRange/yZoomFactor;
    maxYDownSum = maxYDownSumInRange/yZoomFactor;
    yUpSum = yUpSumInRange/yZoomFactor;
    yDownSum = yDownSumInRange/yZoomFactor;

    x     = d3.scale.linear().domain(xRange).range(scope.coordinateGrid.x);
    yUp   = d3.scale.linear().domain([0, maxYUp]).range(scope.coordinateGrid.yUp).clamp(scope.yClampEnabled);
    yDown = d3.scale.linear().domain([0, maxYDown]).range([scope.coordinateGrid.yDown[1], scope.coordinateGrid.yDown[0]]).clamp(scope.yClampEnabled); // as reflection
    z     = d3.scale.linear().domain(zRange).range(scope.coordinateGrid.z);

    // coordinate -> value
    valueX      = d3.scale.linear().domain(scope.coordinateGrid.x).range(xRange);
    valueYUp    = d3.scale.linear().domain(scope.coordinateGrid.yUp).range([0, maxYUp]);
    valueYDown  = d3.scale.linear().domain([scope.coordinateGrid.yDown[1], scope.coordinateGrid.yDown[0]]).range([0, maxYDown]);
    valueZ      = d3.scale.linear().domain(scope.coordinateGrid.z).range(zRange);
  };

  this.updateRanges = function(xCoordinateRange, zCoordinateRange) {
    // convert to values
    xRange = [
      Math.floor( valueX( xCoordinateRange[0] ) ),
      Math.floor( valueX( xCoordinateRange[1] ) )
    ];

    zRange = [
      Math.floor( valueZ( zCoordinateRange[0] ) ),
      Math.floor( valueZ( zCoordinateRange[1] ) )
    ];

    // find maxY on updated ranges
    function findMax() {
      var _sum = 0;
      var _max = 0, _maxSum = 0;
      var _maxSumAll = [];

      return {
        calc: function(x, z, value) {
          _sum += value;
          if (_max < value)
            _max = value;
          if (_maxSumAll[z] === undefined)
            _maxSumAll[z] = 0;
          _maxSumAll[z] += value;
          if (_maxSum < _maxSumAll[z])
            _maxSum = _maxSumAll[z];
        },

        sum: function() { return _sum; },
        max: function() { return _max; },
        maxSum: function() { return _maxSum; }
      };
    }

    var _maxYDown = findMax();
    var _maxYUp = findMax();
    scope.dataForEach(
      function (x, z, value) { _maxYUp.calc(x, z, value); },
      function (x, z, value) { _maxYDown.calc(x, z, value); }
    );

    maxYUpInRange = _maxYUp.max();
    maxYDownInRange = _maxYDown.max();

    maxYUpSumInRange = _maxYUp.maxSum();
    maxYDownSumInRange = _maxYDown.maxSum();

    yUpSumInRange = _maxYUp.sum();
    yDownSumInRange = _maxYDown.sum();

    scope.updateScales();
  };

  this.resetRanges = function() {
    scope.data = dataAbsolute;
    values = scope.data&&scope.data.data || [[]];

    xRange = xRangeAbsolute;
    zRange = zRangeAbsolute;
    maxYUpInRange = maxYUpAbsolute;
    maxYDownInRange = maxYDownAbsolute;
    maxYUpSumInRange     = maxYUpSumAbsolute;
    maxYDownSumInRange   = maxYDownSumAbsolute;
    yUpSumInRange        = yUpSumAbsolute;
    yDownSumInRange      = yDownSumAbsolute;
    scope.updateScales();
  };

  this.getDataInRange = function(xCoordinateRange, zCoordinateRange) {
    // convert to values
    var _xRange = [
      Math.floor( valueX( xCoordinateRange[0] ) ),
      Math.floor( valueX( xCoordinateRange[1] ) )
    ];

    var _zRange = [
      Math.floor( valueZ( zCoordinateRange[0] ) ),
      Math.floor( valueZ( zCoordinateRange[1] ) )
    ];

    // get data in range
    var dataInRange = [];
    var dataRecordInRange;
    for (var i = _xRange[0]; i < _xRange[1]; i++) {
      dataRecordInRange = [];
      for (var j = _zRange[0]; j < _zRange[1]; j++)
        dataRecordInRange.push( values[i][j] );
      dataInRange.push( dataRecordInRange );
    }

    return dataInRange;
  };

  this.updateZoomFactor = function(zoomFactor) {
    yZoomFactor = zoomFactor;
    scope.updateScales();
  };

  this.isValid = function() {
    return xRange[0] != xRange[1] && zRange[0] != zRange[1];
  };

  this.xzArea = function() {
    return scope.rangeWidth(xRange) * scope.rangeWidth(zRange);
  };

  this.scales = function(isYUp) {
    return {
      // value -> coordinate
      x: x,
      y: isYUp ? yUp : yDown,
      z: z,

      // coordinate -> value
      valueX: valueX,
      valueY: isYUp ? valueYUp : valueYDown,
      valueZ: valueZ
    };
  };

  this.xScale = function() {
    return { x: x, valueX: valueX };
  };
  this.yScale = function(isYUp) {
    return { y: isYUp ? yUp : yDown, valueY: isYUp ? valueYUp : valueYDown };
  };
  this.zScale = function() {
    return { z: z, valueZ: valueZ };
  };

  this.yZoomRange = function() {
    return yZoomRange;
  };
  this.yZoomFactor = function() {
    return yZoomFactor;
  };

  // coordinates
  this.xCoordinateWidth = function() {
    return this.rangeWidth(scope.coordinateGrid.x);
  };
  this.xCoordinateMiddle = function() {
    return this.rangeMiddle(scope.coordinateGrid.x);
  };
  this.zCoordinateWidth = function() {
    return this.rangeWidth(scope.coordinateGrid.z);
  };
  this.zCoordinateMiddle = function() {
    return this.rangeMiddle(scope.coordinateGrid.z);
  };

  // values
  this.xValueMax = function() {
    return xRange[1];
  };
  this.yValueMax = function(isYUp) {
    return isYUp ? maxYUp : maxYDown;
  };
  this.yValueSum = function(isYUp) {
    return isYUp ? yUpSum : yDownSum;
  };
  this.yValueSumMax = function(isYUp) {
    return isYUp ? maxYUpSum : maxYDownSum;
  };
  this.zValueMax = function() {
    return zRange[1];
  };
  this.xRange = function() {
    return xRange;
  };
  this.zRange = function() {
    return zRange;
  };

  // work with data values
  this.dataGetValue = function(i, j, isYUp) {
    var key = isYUp ? 'value' : 'valueDown';
    if ( !this.inRange(i, xRange) || !this.inRange(j, zRange) )
      return 0;
    return values[i][j][key]||0;
    // return values[i]&&values[i][j]&&values[i][j][key]||0;
  };

  this.dataForEach = function(callbackYUp, callbackYDown) {
    for (var i = xRange[0]; i < xRange[1]; i++) {
      for (var j = zRange[0]; j < zRange[1]; j++) {
        callbackYUp(i, j, values[i][j].value);
        if (this.yDownEnabled)
          callbackYDown(i, j, values[i][j].valueDown);
      }
    }
  };

  this.inRange = function(value, range) {
    return value >= range[0] && value < range[1];
  };
  this.rangeWidth = function(range) {
    return range[1] - range[0];
  };
  this.rangeMiddle = function(range) {
    return (range[0] + range[1])/2;
  };
};

THREEChart.Space.prototype.constructor = THREEChart.Space;
