/**
 * THREEChart Axis module
 */

THREEChart.Axis = function (space, config) {
  this.axis = {
    step: 2,
    material: {
      color: 0x333333,
      opacity: 1.0
    },
    label: {
      posMultiplier: 1.25,
      scale: new THREE.Vector3( 20/1.4, 5/1.4, 1.0 ),
      text: {
        color: { r: 51, g: 51, b: 51, a: 1.0 },
        fontFace: "Verdana",
        fontSize: 24,
        fontWeight: "Normal",
        borderThickness: 4
      }
    },
    tickLabel: {
      posMultiplier: 1.08,
      scale: new THREE.Vector3( 20/1.4, 5/1.4, 1.0 ),
      text: {
        color: { r: 51, g: 51, b: 51, a: 1.0 },
        fontFace: "Verdana",
        fontSize: 18,
        fontWeight: "Normal",
        borderThickness: 4
      }
    },
    tickLabelY: {
      text: {
        color: { r: 170, g: 170, b: 170, a: 1.0 },
        fontFace: "Verdana",
        fontSize: 18,
        fontWeight: "Normal",
        borderThickness: 4
      }
    }
  };

  var scope = this;

  var x = space.coordinateGrid.x;
  var z = space.coordinateGrid.z;
  var y = space.coordinateGrid.y;
  var yUp = space.coordinateGrid.yUp;
  var yDown = space.coordinateGrid.yDown;

  var labelsText = {
    x:    config&&config.metrics.labels.x     || 'X',
    yUp:  config&&config.metrics.labels.y     || 'Y',
    yDown:config&&config.metrics.labels.yDown || 'Y',
    z:    config&&config.metrics.labels.z     || 'Z'
  };

  var axisGeometryResult = new THREE.Geometry();
  var labelsArrayResult = [];

  this.getAxis = function() {
    var material = new THREE.LineBasicMaterial(
      { color: scope.axis.material.color, opacity: scope.axis.material.opacity }
    );
    return new THREE.Line(axisGeometryResult, material, THREE.LinePieces); // r71
    // return new THREE.LineSegments(axisGeometryResult, material); // r73
  };

  this.getAxisLabels = function() {
    return labelsArrayResult;
  };

  function addAxisLabel(x_range, y_range, z_range, labelText, isYup) {
    // axis line
    axisGeometryResult.vertices.push( new THREE.Vector3(x_range[0], y_range[0], z_range[0]) );
    axisGeometryResult.vertices.push( new THREE.Vector3(x_range[1], y_range[1], z_range[1]) );

    // axis labels
    if (!labelText)
      return;

    var label =
      x_range[0] != x_range[1] ? THREEChart.Utils.getTextSprite( labelText, scope.axis.label.scale, new THREE.Vector3(space.rangeMiddle(x_range), -0.35, z_range[0]*1.15).multiplyScalar( scope.axis.label.posMultiplier ), scope.axis.label.text ) :
      y_range[0] != y_range[1] ? THREEChart.Utils.getTextSprite( labelText, scope.axis.label.scale, new THREE.Vector3(x_range[0], (isYup ? y_range[1] : y_range[0])*1.15, z_range[0]), scope.axis.label.text ) :
      // y_range[0] != y_range[1] ? THREEChart.Utils.getTextSprite( labelText, scope.axis.label.scale, new THREE.Vector3(x_range[0], space.rangeMiddle(y_range), z_range[0]).multiplyScalar( scope.axis.label.posMultiplier ), scope.axis.label.text ) :
      z_range[0] != z_range[1] ? THREEChart.Utils.getTextSprite( labelText, scope.axis.label.scale, new THREE.Vector3(x_range[0]*1.15, -0.35, space.rangeMiddle(z_range)).multiplyScalar( scope.axis.label.posMultiplier ), scope.axis.label.text ) :
      undefined;

    if (label)
      labelsArrayResult.push( label );
  }

  // axis ticks and labels
  function addTicksLabels(x_range, y_range, z_range, tick_interval, tick_size, tick_dir, isYup, keyFromLeft) {
    function multiply(range, multiplier) {
      return range[0] * (multiplier||scope.axis.tickLabel.posMultiplier);
    }

    var scale, value, label, sprite, step;
    if(x_range[0]!=x_range[1]) { // x_range is coordinates
      scale = space.xScale();
      if(space.rangeWidth(space.xRange()) <= 5)
        step = space.rangeWidth(x_range)/space.rangeWidth(space.xRange());
      else
        step = tick_interval;

      for(var x = x_range[0]; x < x_range[1]; x += step ) {
        value = scale.valueX(x).toFixed();
        if ( !space.data.labelsRow[value] )
          continue;

        label = moment.unix(space.data.labelsRow[value]).format("HH:mm:ss[\n]DD.MM.YYYY");
        sprite = THREEChart.Utils.getTextSprite( label, scope.axis.tickLabel.scale, new THREE.Vector3(x, -0.35, multiply(z_range, 1.17)), scope.axis.tickLabel.text );
        labelsArrayResult.push( sprite );

        axisGeometryResult.vertices.push(new THREE.Vector3(x, y_range[0], z_range[0]));
        axisGeometryResult.vertices.push(new THREE.Vector3(x, y_range[1], z_range[1]+tick_dir[1]*tick_size));
      }
    }
    else if(y_range[0]!=y_range[1]) { // y_range is coordinates
      scale = space.yScale(isYup);
      var prefix;
      for(var y = y_range[0]; y <= y_range[1]; y += tick_interval) {
        value = scale.valueY(y);
        prefix = d3.formatPrefix(value);
        if(prefix.scale(value).toFixed(2) == '0.00')
          label = prefix.scale(value).toFixed() + prefix.symbol;
        else{
          label = prefix.scale(value).toFixed(2);
          label = label.substring(0, 4);
          if(label.slice(-1) == '.') label = label.substring(0, 3);
          label = label + prefix.symbol;
        }
        sprite = THREEChart.Utils.getTextSprite( label, scope.axis.tickLabel.scale, new THREE.Vector3(multiply(x_range), y, multiply(z_range)), scope.axis.tickLabelY.text );
        labelsArrayResult.push( sprite );

        axisGeometryResult.vertices.push(new THREE.Vector3(x_range[1], y, z_range[1]));
        axisGeometryResult.vertices.push(new THREE.Vector3(x_range[0]+tick_dir[0]*tick_size, y, z_range[0]+tick_dir[1]*tick_size));
      }
    }
    else if(z_range[0]!=z_range[1]) { // here z_range is values!
      scale = space.zScale();
      var textAlign = isYup ? 'right' : 'left';
      var barZCentered = (scale.z(1) - scale.z(0))/2; // for centered label
      var z;
      // TODO to Space? Needs to refac
      var labelYLevel = space.yValueSum(isYup);
      var labelsColumn = isYup ? space.data.labelsColumn : space.data.labelsColumnDown;
      var labelY = 0; /*isYup ? multiply(y_range) : -0.7;*/
      var sumValue;
      for(value = z_range[0]; value < z_range[1]; value += tick_interval) {
        label = labelsColumn[value];
        if (!label)
          continue;
        sumValue = label.value||0;
        if ( (sumValue / labelYLevel) < 0.01 )
          continue;

        label = label.text;
        if(isYup)
          keyFromLeft[value] = label;
        else if (keyFromLeft[value] === label)
          continue;

        z = scale.z(value) + barZCentered;

        sprite = THREEChart.Utils.getTextGeometry(
          label, scope.axis.tickLabel.scale,
          new THREE.Vector3( x_range[0]+tick_dir[0]*tick_size*1.2, labelY, z),
          scope.axis.tickLabel.text, textAlign );
        labelsArrayResult.push( sprite );

        axisGeometryResult.vertices.push(new THREE.Vector3(x_range[0], y_range[0], z));
        axisGeometryResult.vertices.push(new THREE.Vector3(x_range[1]+tick_dir[0]*tick_size, y_range[1], z));
      }
    }
  }

  function generate() {
    // axis lines and labels
    addAxisLabel(x, [y, y], [z[1], z[1]], labelsText.x); // x
    addAxisLabel([x[0], x[0]], yUp, [z[0], z[0]], labelsText.yUp, true); // yUp
    addAxisLabel([x[0], x[0]], [y, y], z, labelsText.z); // zRight (for yUp)
    if (space.yDownEnabled) {
      addAxisLabel([x[0], x[0]], yDown, [z[0], z[0]], labelsText.yDown, false); // yDown
      addAxisLabel([x[1], x[1]], [y, y], z); // zLeft (for yDown)
    }

    // ассоциативный массив хранит ключ - позицию на графике, значение - ip
    // заполняется при генерации лейблов yUp, сравниваются соотв. значения при генерации леблов yDown
    keyFromLeft = {};
    //
    // axis ticks and labels
    var st = scope.axis.step;
    addTicksLabels(x, [y, y], [z[1], z[1]], st*2, st/8, [-1, 1] ); // x
    addTicksLabels([x[0], x[0]], yUp, [z[0], z[0]], st, st/8, [-1, -1], true ); // yUp
    addTicksLabels([x[0], x[0]], [y, y], space.zRange(), 1, st/8, [-1, -1], true, keyFromLeft ); // zRight (for yUp)

    if (space.yDownEnabled) {
      addTicksLabels([x[0], x[0]], yDown, [z[0], z[0]], st, st/8, [-1, -1], false );  // yDown
      addTicksLabels([x[1], x[1]], [y, y], space.zRange(), 1, st/8, [1, 1], false, keyFromLeft );   // zLeft (for yDown)
    }
  }

  generate();
};

THREEChart.Axis.prototype.constructor = THREEChart.Axis;
