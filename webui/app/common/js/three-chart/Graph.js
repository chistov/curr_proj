/**
 * THREEChart Graph module
 */

THREEChart.Graph = function (space) {
  this.graph = {
    typeDefault: 'bar',
    color: {
      map: 'rainbow',
      number: 16
    },
    material: {}
  };

  var scope = this;

  this.getGraph = function() {
    // 2 triangles, 10 possible sides for up/down graphs
    var resultGeometry = new THREE.TypedGeometry( space.xzArea() * 2 * 10 );

    var graphGeometryUp = graphGeometry(resultGeometry, true);
    var graphGeometryDown = graphGeometry(resultGeometry, false);

    space.dataForEach(graphGeometryUp, graphGeometryDown);

    var wireTexture = THREEChart.Graph.wireTexture();
    wireTexture.needsUpdate = true;
    var material = new THREE.MeshBasicMaterial( {
    // var material = new THREE.MeshLambertMaterial( {
      // wireframe: true,
      map: wireTexture,
      // side: THREE.DoubleSide,
      vertexColors: THREE.VertexColors,
    } );
    return new THREE.Mesh( resultGeometry, material );
  };

  // main routine to generate graph surface
  function graphGeometry(resultGeometry, isYUp) {
    // make scales
    var scales = space.scales(isYUp);
    var barX = scales.x(1) - scales.x(0);
    var barZ = scales.z(1) - scales.z(0);
    var barY = scales.y(1) - scales.y(0);

    var maxX = space.xValueMax();
    var maxY = space.yValueMax(isYUp);
    var maxZ = space.zValueMax();

    // color picker
    var lut = new THREE.Lut( scope.graph.color.map, scope.graph.color.number );
    lut.setMin( 0 );
    lut.setMax( maxY );

    // sides
    // side = -1 || 1;
    var reflect = isYUp ? 1 : -1;
    function getPlanedGeomentry(plane, width, height, depth, side, color) {
      var matrix = new THREE.Matrix4();
      var geometry = new THREE.PlaneTypedGeometry( width, height, 1, 1, color );
      switch(plane) {
        case "x": {
          geometry.uvs[ 1 ] = geometry.uvs[ 3 ] = 0.5;
          geometry.applyMatrix( matrix.makeRotationY( -reflect * Math.PI / 2 ) );
          geometry.applyMatrix( matrix.makeTranslation( side * depth/2, 0, 0 ) );
        } break;
        case "y": {
          geometry.uvs[ 5 ] = geometry.uvs[ 7 ] = 0.5;
          geometry.applyMatrix( matrix.makeRotationX( -reflect * Math.PI / 2 ) );
          geometry.applyMatrix( matrix.makeTranslation( 0, side * depth/2, 0 ) );
        } break;
        case "z": {
          geometry.uvs[ 1 ] = geometry.uvs[ 3 ] = 0.5;
          // FIXME incorrect work with light here. So change material to basic
          if ( reflect === 1 )
            geometry.applyMatrix( matrix.makeRotationY( Math.PI ) );
          geometry.applyMatrix( matrix.makeTranslation( 0, 0, side * depth/2 ) );
        } break;
        default:
      }
      return geometry;
    }

    var matrixBuild = new THREE.Matrix4();
    return function(i, j, value) {
      var x = scales.x( i );
      var y = scales.y( value );
      var z = scales.z( j );
      var color = lut.getColor( value );

      // generate header
      if (value > 0) {
        matrixBuild.makeTranslation( x + barX/2, y - barY/2, z + barZ/2 );
        resultGeometry.merge( getPlanedGeomentry('y', barX, barZ, barY, 1, color), matrixBuild );
      }

      // generate sides
      // see j - 1;
      value = space.dataGetValue(i, j-1, isYUp);
      var prevY = scales.y( value );
      var diffY = y - prevY;
      if (diffY !== 0) {
        if ( isYUp ? diffY > 0 : diffY < 0 ) { // current greater
          matrixBuild.makeTranslation( x + barX/2, prevY + diffY/2, z + barZ/2 );
          resultGeometry.merge( getPlanedGeomentry('z', barX, diffY, barZ, -1, color ), matrixBuild );
        }
        else { // prev greater
          var prevZ = scales.z(j-1);
          var prevColor = lut.getColor( value );
          matrixBuild.makeTranslation( x + barX/2, prevY + diffY/2, prevZ + barZ/2 );
          resultGeometry.merge( getPlanedGeomentry('z', barX, diffY, barZ, 1, prevColor ), matrixBuild );
        }
      }

      // check last
      if (z == scales.z(maxZ - 1)) {
        var nextY = scales.y(0);
        var diffY = nextY - y;
        matrixBuild.makeTranslation( x + barX/2, nextY - diffY/2, z + barZ/2 );
        resultGeometry.merge( getPlanedGeomentry('z', barX, diffY, barZ, 1, color ), matrixBuild );
      }

      // see i - 1;
      value = space.dataGetValue(i-1, j, isYUp);
      prevY = scales.y( value );
      diffY = y - prevY;
      if (diffY !== 0) {
        if ( isYUp ? diffY > 0 : diffY < 0 ) { // current greater
          matrixBuild.makeTranslation( x + barX/2, prevY + diffY/2, z + barZ/2 );
          resultGeometry.merge( getPlanedGeomentry('x', barZ, diffY, barX, -1, color ), matrixBuild );
        }
        else { // prev greater
          var prevX = scales.x(i-1);
          var prevColor = lut.getColor( value );
          matrixBuild.makeTranslation( prevX + barX/2, prevY + diffY/2, z + barZ/2 );
          resultGeometry.merge( getPlanedGeomentry('x', barZ, diffY, barX, 1, prevColor ), matrixBuild );
        }
      }

      // check last
      if (x == scales.x(maxX - 1)) {
        var nextY = scales.y(0);
        var diffY = nextY - y;
        matrixBuild.makeTranslation( x + barX/2, nextY - diffY/2, z + barZ/2 );
        resultGeometry.merge( getPlanedGeomentry('x', barZ, diffY, barX, 1, color ), matrixBuild );
      }
    };
  }
};

THREEChart.Graph.prototype.constructor = THREEChart.Graph;

THREEChart.Graph.Texture = function() {
  var wireTexture = new THREE.ImageUtils.loadTexture( 'app/common/img/three.js/square.png' ); // r71
  // var wireTexture = new THREE.TextureLoader().load( 'app/common/img/three.js/square.png' ); // r73
  wireTexture.wrapS = wireTexture.wrapT = THREE.RepeatWrapping;
  wireTexture.repeat.set( 1, 1 );

  return function() {
    return wireTexture.clone(); // r71
    // return wireTexture; // r73
  };
};
THREEChart.Graph.wireTexture = THREEChart.Graph.Texture();
