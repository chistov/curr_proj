/**
 * THREEChart Grid module
 */

THREEChart.Grid = function (space) {
  this.grid = {
    enabled: true,
    step: 2,
    material: {
      color: 0x000000,
      opacity: 0.2
    }
  };

  var scope = this;

  var x = space.coordinateGrid.x;
  var z = space.coordinateGrid.z;
  var y = space.coordinateGrid.y;
  var yUp = space.coordinateGrid.yUp;
  var yDown = space.coordinateGrid.yDown;

  this.getGrid = function() {
    if (!scope.grid.enabled)
      return;

    var geometry = new THREE.Geometry();
    function addGridPlane(x_range, y_range, z_range, interval){
      if(x_range[0]!=x_range[1]) for(var x=x_range[0];x<=x_range[1];x+=interval) {
          geometry.vertices.push(new THREE.Vector3(x,y_range[0],z_range[0]));
          geometry.vertices.push(new THREE.Vector3(x,y_range[1],z_range[1]));
      }
      if(y_range[0]!=y_range[1]) for(var y=y_range[0];y<=y_range[1];y+=interval) {
          geometry.vertices.push(new THREE.Vector3(x_range[0],y,z_range[0]));
          geometry.vertices.push(new THREE.Vector3(x_range[1],y,z_range[1]));
      }
      if(z_range[0]!=z_range[1]) for(var z=z_range[0];z<=z_range[1];z+=interval) {
          geometry.vertices.push(new THREE.Vector3(x_range[0],y_range[0],z));
          geometry.vertices.push(new THREE.Vector3(x_range[1],y_range[1],z));
      }
    }

    // x-y
    addGridPlane(x, yUp, [z[0], z[0]], scope.grid.step); //x-yUp
    if (space.yDownEnabled)
      addGridPlane(x, yDown, [z[0], z[0]], scope.grid.step); //x-yDown

    // x-z
    addGridPlane(x, [yUp[0], yUp[0]], z, scope.grid.step); //x-z over plane
    addGridPlane(x, [yDown[1], yDown[1]], z, scope.grid.step); //x-z under plane

    var material = new THREE.LineBasicMaterial(
      { color: scope.grid.material.color,
        opacity: scope.grid.material.opacity,
        transparent: true,
      }
    );

    return new THREE.Line(geometry, material, THREE.LinePieces); // r71
    // return new THREE.LineSegments(geometry, material); // r73
  };
};

THREEChart.Grid.prototype.constructor = THREEChart.Grid;
