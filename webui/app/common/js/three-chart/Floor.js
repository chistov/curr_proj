/**
 * THREEChart Floor module
 */

THREEChart.Floor = function (space) {
  this.enabled = true;

  var scope = this;

  this.getFloor = function() {
    if ( !scope.enabled )
      return;

    // Add x-z white floor
    var geometry = new THREE.PlaneBufferGeometry( space.xCoordinateWidth(), space.zCoordinateWidth() );
    var position = new THREE.Matrix4();
    geometry.applyMatrix( position.makeRotationX( - Math.PI / 2 ) );
    geometry.applyMatrix( position.makeTranslation( space.xCoordinateMiddle() , space.coordinateGrid.y, space.zCoordinateMiddle() ) );
    var material = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide });
    return new THREE.Mesh( geometry, material );
  };
};

THREEChart.Floor.prototype.constructor = THREEChart.Floor;
