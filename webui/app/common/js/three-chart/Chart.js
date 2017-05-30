var THREEChart = {};

/**
 * THREEChart Chart module
    REMINDER: Coordinate system as
      Y(Green)
      |_X(Red)
      /
     Z(Blue)
 */

THREEChart.Chart = function (domElement, debug) {
  this.domElement = domElement;

  // Variables
  //--------------------------------------------------------------------------
  // API

  // lights options
  this.lights = {
    ambient: {
      color: 0xf2ecce//0xfffddf // 0xcdb891 //cac4b0
    },
    spot: {
      color: 0xffffff,
      intensity: 0.5,
      position: new THREE.Vector3(0, 300, 500)
    }
  };

  // camera options
  this.camera = {
    hov: 45,
    // position: new THREE.Vector3(-23, 33, 23)
    // position: new THREE.Vector3(-24, 22, 12)
    position: new THREE.Vector3(-24, 22, 13)
  };

  // controls options
  this.controls = {
    type: 'orbit',
    trackball: {
      rotateSpeed: 10,
      zoomSpeed: 15,
      staticMoving: true,
      autoRotate: false
    },
    orbit: {
      rotateSpeed: 1.0,
      zoomSpeed: 1.5,
      staticMoving: true,
      autoRotate: false
    }
  };

  // renderer options
  this.renderer = {
    backgroundColor: 0xffffff
  };

  this.nodataLabelMetrics = {
    scale: {
      x: 20/1.4,
      y: 5/1.4,
      z: 1.0
    },
    position: {
      x: 0,
      y: 1,
      z: 0
    }
  };

  this.onServerMagnifier = undefined; // callback for server magni	fying

  //--------------------------------------------------------------------------
  // Private
  var scope = this;

  var config;

  var controlsDomElement;
  var stats;
  var scene, renderer;
  var camera, controls;
  var chartFloor;
  var chartGrid;
  var chartAxis, chartAxisLabels;
  var chartMesh;
  var chartNoDataLabel;
  var space, magnifier;
  var labelsZoomPrevent;

  // Methods
  //--------------------------------------------------------------------------
  // API

  this.update = function(data, newConfig) {
    config = newConfig;

    // 1. create coordinate space for new data
    space.updateData( data, config.metrics.valueDown&&config.metrics.valueDown.length);
    if ( !space.isValid() ) { // check space is valid
      clear();
      toggleNoDataLabel(true);
      return;
    }

    toggleNoDataLabel(false);
    magnifier.toggleResetDomElement(false);

    // 2. create grid for current chart
    regenerateGrid();

    // 3. create axis and labels
    regenerateAxis();

    // 4. create graph object for created space
    regenerateGraph();
  };

  this.invalidateSize = function() {
    var width = scope.domElement.width();
    var height = scope.domElement.height();
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelsZoomPrevent.setScaleFactor(height);
  };

  this.destroy = function() {
    THREEChart.Chart.animate.release( render );
    THREEChart.Chart.renderers.release( renderer );
    window.removeEventListener('resize', scope.invalidateSize);
    clear();
  };

  //--------------------------------------------------------------------------
  // Private
  function init() {
    var height = scope.domElement.height();
    var width = scope.domElement.width();
    var originalElement = scope.domElement[0]; // non jquery

    // create scene
    scene = new THREE.Scene();

    // add stats and axis for debug run
    if ( debug ) {
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      scope.domElement.append( stats.domElement );

      var axes = new THREE.AxisHelper( 100 );
      scene.add( axes );
    }
    else
      stats = { update: function(){} }; // dummy for render

    // create div controls
    controlsDomElement = document.createElement('div');
    controlsDomElement.style.position = 'absolute';
    controlsDomElement.style.right = '15px';
    scope.domElement.append( controlsDomElement );

    // add lights
    var ambientLight = new THREE.AmbientLight( scope.lights.ambient.color ); // ambient
    var spotLight = new THREE.SpotLight( scope.lights.spot.color, scope.lights.ambient.intensity ); // spot
    spotLight.position.copy( scope.lights.spot.position );
    scene.add( ambientLight, spotLight );

    // create space object
    space = new THREEChart.Space();

    // add floor
    var floor = new THREEChart.Floor(space);
    chartFloor = addObjectToScene( chartFloor, floor.getFloor() );

    // create magnifier object
    // IMPORTANT to create before controls to intercept 'mousedown' event
    // set controls later
    magnifier = new THREEChart.Magnifier( scene, space, chartFloor, originalElement );
    controlsDomElement.appendChild( magnifier.zoomDomElement );
    controlsDomElement.appendChild( magnifier.resetDomElement );
    magnifier.onRegenerateClient = function() {
      regenerateAxis();
      regenerateGraph();
    };
    magnifier.onRegenerateServer = function(dataForServer) {
      if ( !scope.onServerMagnifier )
        return;

      scope.onServerMagnifier(dataForServer, function(data) {
        space.updateDataInRange( data );
        regenerateAxis();
        regenerateGraph();
        magnifier.toggleResetDomElement(true);
      });
    };

    // create camera
    camera = new THREE.PerspectiveCamera( scope.camera.hov, width/height, 1, 1000 );
    camera.position.copy(  scope.camera.position );

    // create camera controls
    if ( scope.controls.type == 'orbit' ) {
      controls = new THREE.OrbitControls(camera, originalElement);
      // controls.maxPolarAngle = Math.PI/2; // radians
    }
    else
      controls = new THREE.TrackballControls(camera, originalElement);

    controls.rotateSpeed = scope.controls[scope.controls.type].rotateSpeed;
    controls.zoomSpeed = scope.controls[scope.controls.type].zoomSpeed;
    controls.staticMoving = scope.controls[scope.controls.type].staticMoving;
    controls.autoRotate = scope.controls[scope.controls.type].autoRotate;
    controls.noKeys = true;

    // fill renderer
    renderer = THREEChart.Chart.renderers.get();
    renderer.setClearColor( scope.renderer.backgroundColor );
    renderer.sortObjects = false;
    renderer.setSize(width, height);
    scope.domElement.append( renderer.domElement );

    // set controls and renderer domElement after created it
    magnifier.update( controls, renderer.domElement );

    // for prevent labels size attenuation
    labelsZoomPrevent = new THREEChart.Utils.preventLabelsSizeAttenuation();
    labelsZoomPrevent.setScaleFactor( height );

    window.addEventListener( 'resize', scope.invalidateSize, false );
    originalElement.addEventListener( 'dblclick', defaultControls, false );
  }

  function regenerateGrid() {
    var grid = new THREEChart.Grid(space);
    chartGrid = addObjectToScene( chartGrid, grid.getGrid() );
  }

  function regenerateAxis() {
    var axis = new THREEChart.Axis(space, config);
    chartAxis = addObjectToScene( chartAxis, axis.getAxis() );
    chartAxisLabels = addGroupToScene( chartAxisLabels, axis.getAxisLabels() );
  }

  function regenerateGraph() {
    var graph = new THREEChart.Graph(space);
    chartMesh = addObjectToScene( chartMesh, graph.getGraph() );
  }

  function addObjectToScene(object, newObject) {
    if (object)
      scene.remove(object);
    if (newObject)
      scene.add(newObject);
    return newObject;
  }

  function addGroupToScene(group, array) {
    if (group)
      group.children.length = 0;
    else {
      group = new THREE.Group();
      scene.add(group);
    }

    group.add.apply(group, array);
    return group;
  }

  // clear some chart objects
  function clear() {
    if (!scene)
      return;

    if (chartGrid) {
      scene.remove(chartGrid);
      chartGrid = undefined;
    }
    if (chartAxis) {
      scene.remove(chartAxis);
      chartAxis = undefined;
    }
    if (chartAxisLabels)
      chartAxisLabels.children.length = 0;
    if (chartMesh) {
      scene.remove(chartMesh);
      chartMesh = undefined;
    }
  }

  function toggleNoDataLabel(show) {
    show = show || false;
    if (!chartNoDataLabel) {
      chartNoDataLabel = THREEChart.Utils.getTextSprite(
        /*'Нет данных'*/'No data',
        new THREE.Vector3( scope.nodataLabelMetrics.scale.x, scope.nodataLabelMetrics.scale.y, scope.nodataLabelMetrics.scale.z ),
        new THREE.Vector3( scope.nodataLabelMetrics.position.x, scope.nodataLabelMetrics.position.y, scope.nodataLabelMetrics.position.z ) );
      scene.add(chartNoDataLabel);
    }

    chartNoDataLabel.visible = show;
    if (show)
      controls.reset();
    controls.enabled = !show;
    controlsDomElement.style.display = show ? 'none' : '';
    magnifier.enabled = !show;
  }

  // change controls to default
  function defaultControls() {
    controls.reset();
  }

  // main render routine
  function render() {
    labelsZoomPrevent.update( chartAxisLabels, camera.position );
    stats.update();
    // controls.update(); // needs only for autoRotate
    renderer.render(scene, camera);
  }

  init();
  THREEChart.Chart.animate.add(render);
};

THREEChart.ChartRenderers = function () {
  var LIMIT = 6; // limit of renderers

  var queueFree = [];
  var queueUsed = [];

  var get = function() {
    if ( queueUsed.length == LIMIT )
      throw "THREEChart.ChartRenderers:get: renderers limit reached!";

    if ( !queueFree.length )
      queueFree.push( new THREE.WebGLRenderer( { antialias: true } ) );
    var renderer = queueFree.shift();
    queueUsed.push( renderer );
    return renderer;
  };
  var release = function( renderer ) {
    var index = queueUsed.indexOf(renderer);
    if (index == -1)
      throw "THREEChart.ChartRenderers:release: bad renderer instance for release!";

    queueUsed.splice(index, 1);
    queueFree.push( renderer );
  };

  return {
    get: get,
    release: release
  };
};

THREEChart.Animate = function() {
  var animateLoop = 0;
  var apps = [];

  var add = function(animateCallback) {
    apps.push(animateCallback);
    if (animateLoop === 0) {
      console.info('THREEChart.Animate: START ANIMATE LOOP');
      animate();
    }
  };
  var release = function(animateCallback) {
    var index = apps.indexOf(animateCallback);
    if (index == -1)
      throw "THREEChart.Animate:release: bad animateCallback instance for release!";

    apps.splice(index, 1);
    if (apps.length === 0) {
      console.info('THREEChart.Animate: CANCEL ANIMATE LOOP');
      window.cancelAnimationFrame(animateLoop);
      animateLoop = 0;
    }
  };

  function animate() {
    animateLoop = window.requestAnimationFrame( animate );
    for ( var i = 0; i < apps.length; ++i )
      apps[i]();
  }

  return {
    add: add,
    release: release
  };
};

THREEChart.Chart.prototype.constructor = THREEChart.Chart;
THREEChart.Chart.renderers = THREEChart.ChartRenderers();
THREEChart.Chart.animate = THREEChart.Animate();
