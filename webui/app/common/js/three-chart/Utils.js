/**
 * THREEChart Utils module
 */

THREEChart.Utils = function() {};

THREEChart.Utils.getTextTexture = function( text, textParameters, textAlign ) {
  /*
    IMPORTANT!!!
    canvas has own size, and future texture will be depend on it!
  */
  text = text.toString();
  textParameters = textParameters || {};
  textAlign = textAlign || "center";
  var color = textParameters.color || { r: 51, g: 51, b: 51, a: 1.0 };
  var fontFace = textParameters.fontFace || "Verdana";
  var fontSize = textParameters.fontSize || 24;
  var fontWeight = textParameters.fontWeight || "Normal";
  var borderThickness = textParameters.borderThickness || 4;

  // create canvas for text
  var canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  var context = canvas.getContext('2d');

  // fill text
  context.font = fontWeight +  ' ' + fontSize + 'px ' + fontFace;
  context.lineWidth = borderThickness;
  context.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + color.a + ')';
  context.textBaseline = 'middle';
  if ( textAlign !== "center" )
    context.textAlign = textAlign;

  /* multiline text support */
  var lines = text.split("\n");
  // centered y by canvas size and font size multiple by lines count
  var y = ( canvas.height - fontSize*(lines.length-1) )/2;
  for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      var x = 0;
      if (textAlign === "center")
        x = (canvas.width - context.measureText(line).width)/2; // centered x by canvas size and text width
      else if (textAlign === "left")
        x = 0;
      else // right
        x = canvas.width;

      context.fillText(line, x, y);
      y += fontSize;
  }

  // canvas contents will be used for a texture
  var texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

THREEChart.Utils.getTextGeometry = function( text, scale, position, textParameters, textAlign ) {
  var texture = THREEChart.Utils.getTextTexture( text, textParameters, textAlign );
  var materials = [
    new THREE.MeshBasicMaterial({map: texture, side: THREE.FrontSide, depthWrite: false, transparent: true }),
    new THREE.MeshBasicMaterial({map: texture, side: THREE.BackSide, depthWrite: false, transparent: true}),
  ];

  // TODO to PlaneBufferGeometry for r73
  var geometry = new THREE.PlaneGeometry(1, 1);
  for (var i = 0, len = geometry.faces.length; i < len; i++) {
    var face = geometry.faces[i].clone();
    face.materialIndex = 1;
    geometry.faces.push(face);
  }

  // BackSide as flipped vertically of original texture
  // TODO dynamic fill UVs
  geometry.faceVertexUvs[0].push( // faces[2]
    [
      new THREE.Vector2( 0, 0 ),
      new THREE.Vector2( 0, 1 ),
      new THREE.Vector2( 1, 0 )
    ]
  );
  geometry.faceVertexUvs[0].push( // faces[3]
    [
      new THREE.Vector2( 0, 1 ),
      new THREE.Vector2( 1, 1 ),
      new THREE.Vector2( 1, 0 )
    ]
  );

  var material = new THREE.MeshFaceMaterial(materials);
  var mesh = new THREE.Mesh( geometry, material );
  mesh.rotation.x = -Math.PI/2;
  mesh.scale.copy( scale );
  mesh.position.copy( position );

  var box = new THREE.Box3().setFromObject( mesh ); // for align
  if (textAlign === 'left')
    mesh.position.x += box.size().x/2;
  else if (textAlign === 'right')
    mesh.position.x -= box.size().x/2;

  mesh.userData.offsetCorrection = { // for preventLabelsSizeAttenuation
    scale: mesh.scale.x,
    position: mesh.position.x,
    dir: textAlign === 'left' ? 1 : -1
  };

  return mesh;
};

THREEChart.Utils.getTextSprite = function( text, scale, position, textParameters ) {
  var texture = THREEChart.Utils.getTextTexture( text, textParameters );

  var spriteMaterial = new THREE.SpriteMaterial(
    { map: texture, depthWrite: false } );
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.copy( scale );
  sprite.position.copy( position );
  return sprite;
};

// prevent size attenuation of sprites, works well for perspective camera
// useful threads:
// https://github.com/mrdoob/three.js/issues/4852
// http://stackoverflow.com/questions/24246632/three-js-sizeattenuation-to-sprite-material
THREEChart.Utils.preventLabelsSizeAttenuation = function() {
  this.enabled = true;
  this.scaleFactor = 1;
  this.multiplier = 4;

  var scaleFactorDelimiter = 55; // obtained experimentally
  var v = new THREE.Vector3();

  this.setScaleFactor = function(canvasHeight) {
    this.scaleFactor = canvasHeight/scaleFactorDelimiter;
  };

  this.update = function(labels, cameraPosition) {
    if (this.enabled && labels) for (var i = labels.children.length-1; i >= 0; i--) {
      var sprite = labels.children[i];
      v.subVectors( sprite.position, cameraPosition );
      sprite.scale.x = v.length()*this.multiplier/this.scaleFactor;
      sprite.scale.y = v.length()/this.scaleFactor;

      if ( sprite.userData.offsetCorrection ) { // x position correction
        // sprite.quaternion.x = camera.quaternion.x;
        var factor = sprite.scale.x - sprite.userData.offsetCorrection.scale;
        sprite.position.x =
          sprite.userData.offsetCorrection.position + sprite.userData.offsetCorrection.dir * factor/2;
      }
    }
  };
};

THREEChart.Utils.preventLabelsSizeAttenuation.prototype.constructor = THREEChart.Utils.preventLabelsSizeAttenuation;
