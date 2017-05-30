/**
 * THREEChart Magnifier module
 */

THREEChart.Magnifier = function (scene, space, floor, domElement) {

  this.scene = scene;
  this.space = space;
  this.domElement = domElement;

  this.cameraControls = undefined;
  this.domElementRenderer = undefined;

  this.enabled = true;
  this.zoomDomElement = undefined;
  this.resetDomElement = undefined;

  this.onRegenerateClient = undefined;
  this.onRegenerateServer = undefined;

  // ---
  var scope = this;
  var y = space.coordinateGrid.y;

  // y zoom objects
  var yZoomRange = space.yZoomRange();
  var yZoomFactor = space.yZoomFactor();

  var STATE = { NONE: -1, CLIENT: 0, SERVER: 1 };
  var state = STATE.NONE;

  // selection objects
  var projectionArea = floor;
  var selectionStaticPoint;
  var selectionArea;
  var selectionAreaColors = [];
  selectionAreaColors[STATE.CLIENT] = 0xffa474;
  selectionAreaColors[STATE.SERVER] = 0xff9999;

  var mouse = new THREE.Vector2();
  var raycaster = new THREE.Raycaster();

  this.update = function(controls, domElementRenderer) {
    scope.cameraControls = controls;
    scope.domElementRenderer = domElementRenderer;
  };

  this.toggleResetDomElement = function(show) {
    scope.resetDomElement.style.display = show ? '' : 'none';
  };

  function recalculateMousePosition(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = ( ( event.clientX - rect.left ) / canvas.width ) * 2 - 1;
    mouse.y = - ( ( event.clientY - rect.top ) / canvas.height ) * 2 + 1;

    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
  }

  function onMouseDown( event ) {
    if ( scope.enabled === false ) return;
    event.preventDefault();

    if ( event.button !== THREE.MOUSE.LEFT || state !== STATE.NONE )
      return;

    if ( event.shiftKey === true )
      state = STATE.CLIENT;
    else if ( event.ctrlKey === true )
      state = STATE.SERVER;
    else
      return;

    recalculateMousePosition( scope.domElementRenderer, event );
    raycaster.setFromCamera( mouse, scope.cameraControls.object );
    var intersects = raycaster.intersectObject( projectionArea );
    if ( intersects.length > 0 ) {
      scope.cameraControls.enabled = false; // disable controls
      selectionStaticPoint = intersects[0].point; // save static point for selection area
      selectionArea.material.color.setHex( selectionAreaColors[state] );

      document.addEventListener( 'mousemove', onMouseMove, false );
      document.addEventListener( 'mouseup', onMouseUp, false );
      // console.log('INTERSECT!', selectionStaticPoint);
    } else
      state = STATE.NONE;
  }

  function onMouseMove(event) {
    if ( scope.enabled === false ) return;
    event.preventDefault();

    recalculateMousePosition( scope.domElementRenderer, event );

    raycaster.setFromCamera( mouse, scope.cameraControls.object );
    var intersects = raycaster.intersectObject( projectionArea );
    if ( intersects.length > 0 ) {
      /*
        area as
        0(x0z0)       1(x1z0)
        *-------------*
        |             |
        *-------------*
        2(x0z1)       3(x1z1)
        where
          0 is static(mousedown) corner - selectionStaticPoint
          3 is dynamic(mouse move) corner - point
      */

      var point = intersects[0].point; // dynamic point
      selectionArea.geometry.vertices[0].set( selectionStaticPoint.x, 0, selectionStaticPoint.z );
      selectionArea.geometry.vertices[1].set( point.x, 0, selectionStaticPoint.z );
      selectionArea.geometry.vertices[2].set( selectionStaticPoint.x, 0, point.z );
      selectionArea.geometry.vertices[3].set( point.x, 0, point.z );
      selectionArea.geometry.verticesNeedUpdate = true;
      selectionArea.visible = true;
    }
  }

  function onMouseUp( event ) {
    if ( scope.enabled === false ) return;
    event.preventDefault();

    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );

    // get selection area coordinates
    var x0 = selectionArea.geometry.vertices[0].x;
    var x1 = selectionArea.geometry.vertices[3].x;
    var xRange = [];
    xRange[0] = x0 < x1 ? x0 : x1;
    xRange[1] = x0 < x1 ? x1 : x0;

    var z0 = selectionArea.geometry.vertices[0].z;
    var z1 = selectionArea.geometry.vertices[3].z;
    var zRange = [];
    zRange[0] = z0 < z1 ? z0 : z1;
    zRange[1] = z0 < z1 ? z1 : z0;

    if ( state === STATE.CLIENT ) {
      scope.space.updateRanges(xRange, zRange);
      if ( scope.onRegenerateClient ) {
        scope.onRegenerateClient();
        scope.toggleResetDomElement(true);
      }
    } else if ( state === STATE.SERVER ) {
      var dataForServer = scope.space.getDataInRange(xRange, zRange);
      if ( scope.onRegenerateServer )
        scope.onRegenerateServer(dataForServer);
    } else
      console.warn( 'Magnifier: bad state: ', state );

    state = STATE.NONE;
    selectionArea.visible = false;
    scope.cameraControls.enabled = true;
  }

  function yZoomChange(zoomIn, zoomFactor) {
    if (zoomFactor !== undefined)
      yZoomFactor = zoomFactor;
    else {
      if (zoomIn) {
        if ( yZoomFactor >= yZoomRange[1] )
          return;
        ++yZoomFactor;
      } else {
        if ( yZoomFactor <= yZoomRange[0] )
          return;
        --yZoomFactor;
      }

      scope.zoomDomElement.getElementsByTagName('option')[yZoomFactor-1].selected = 'selected';
    }

    scope.space.updateZoomFactor(yZoomFactor);
    if (scope.onRegenerateClient)
      scope.onRegenerateClient();
  }

  function init() {
    // create selection as mesh
    var geometry = new THREE.PlaneGeometry( 1, 1 );
    var position = new THREE.Matrix4();
    geometry.applyMatrix( position.makeRotationX( -Math.PI/2 ) );
    // FIXME strange behavior on transparent selection area:
    // not show on some camera positions (zoomed and panned)
    var material = new THREE.MeshBasicMaterial(
      { color: 0xffffff, opacity: 0.85, transparent: true, side: THREE.DoubleSide }
    );
    material.depthWrite = false;
    material.depthTest = false;
    selectionArea = new THREE.Mesh( geometry, material );
    selectionArea.visible = false;
    scene.add(selectionArea);
  }

  function createResetDomElement() {
    scope.resetDomElement = document.createElement('a');
    scope.resetDomElement.className = 'small';
    scope.resetDomElement.style.margin = '0 10px';
    scope.resetDomElement.style.cursor = 'pointer';

    scope.resetDomElement.innerHTML = '<i class="fa fa-search-minus"></i> Show all';
    scope.resetDomElement.addEventListener( 'click',
      function() {
        scope.space.resetRanges();
        if (scope.onRegenerateClient)
          scope.onRegenerateClient();
        scope.toggleResetDomElement(false);
      }, false );

    scope.toggleResetDomElement(false);
  }

  function createZoomDomElement() {
    scope.zoomDomElement = document.createElement('div');
    scope.zoomDomElement.style.padding = '5px';

    var zoomOut = document.createElement('button');
    zoomOut.className = 'btn btn-xs btn-default';
    zoomOut.innerHTML = '<i class="fa fa-minus"></i>';
    zoomOut.addEventListener( 'click', function() { yZoomChange(false); }, false );
    scope.zoomDomElement.appendChild(zoomOut);

    var indicator = document.createElement('select');
    indicator.style.margin = '1px 5px';
    var option;
    for (var i = yZoomRange[0]; i <= yZoomRange[1]; ++i) {
      option = document.createElement('option');
      if (i === yZoomFactor)
        option.selected = 'selected';
      option.value = i;
      option.innerHTML = 'x' + i;
      indicator.appendChild(option);
    }
    indicator.addEventListener( 'change', function() {
      yZoomChange(undefined, this.value);
    }, false );
    scope.zoomDomElement.appendChild(indicator);

    var zoomIn = document.createElement('button');
    zoomIn.className = 'btn btn-xs btn-default';
    zoomIn.innerHTML = '<i class="fa fa-plus"></i>';
    zoomIn.addEventListener( 'click', function() { yZoomChange(true); }, false );
    scope.zoomDomElement.appendChild(zoomIn);

    // to prevent other mousedown events
    scope.zoomDomElement.addEventListener( 'mousedown', function(e) {
      e.stopPropagation();
    }, false );
  }

  createResetDomElement();
  createZoomDomElement();
  init();
  this.domElement.addEventListener( 'mousedown', onMouseDown, false );
};

THREEChart.Magnifier.prototype.constructor = THREEChart.Magnifier;
