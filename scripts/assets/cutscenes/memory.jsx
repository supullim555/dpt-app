// One of her memories as a short film (v0.92): a place, and the people in it standing at their depths in front of it,
// a slow camera with focus on the people, in grey ink with a faint sepia, from black and back to black so it sits
// between the text cards. An EffectCraft (After Effects-style) script: build-cutscenes.js fills in SCENE and runs it.
var SCENE = __SCENE__;
function imp(p) { return app.project.importFile(new ImportOptions(new File(p))); }
function key(prop, times, values) { for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]); }
var W = 540, H = 960, DUR = SCENE.duration, FPS = 24;
var c = app.project.items.addComp(SCENE.name, W, H, 1, DUR, FPS);
c.bgColor = [0, 0, 0];

// back to front, as listed: { file, pos [x, y, z], scale, anchor: 'bottom' | 'center', move?: [x, y, z] by the end,
// xRotation?: 90 to lie flat as ground, front?: true for a 2D layer always in front }
for (var i = 0; i < SCENE.layers.length; i++) {
  var L = SCENE.layers[i];
  var item = imp(L.file);
  var l = c.layers.add(item);
  // `front`: a plain 2D layer over the 3D place, always in front of it (pos is then in the frame's pixels)
  l.threeDLayer = !L.front;
  var t = l.property("Transform");
  if (L.anchor === "bottom") t.property("Anchor Point").setValue([item.width / 2, item.height, 0]);
  t.property("Scale").setValue([L.scale, L.scale, L.scale]);
  if (L.xRotation) t.property("X Rotation").setValue(L.xRotation);
  if (L.move) key(t.property("Position"), [0, DUR], [L.pos, [L.pos[0] + L.move[0], L.pos[1] + L.move[1], L.pos[2] + L.move[2]]]);
  else t.property("Position").setValue(L.pos);
  // a memory is grey ink: whatever colour the drawing had goes
  l.property("Effects").addProperty("ADBE HUE SATURATION").property("Master Saturation").setValue(-100);
}

var cam = c.layers.addCamera("cam", [270, 480]);
var co = cam.property("Camera Options");
var zoom = co.property("Zoom").value;
var cs = SCENE.camera; // { from: [x, y], to: [x, y], push, focus (z of what's sharp), aperture }
key(cam.property("Transform").property("Position"), [0, DUR], [[cs.from[0], cs.from[1], -zoom], [cs.to[0], cs.to[1], -zoom + cs.push]]);
key(cam.property("Transform").property("Point of Interest"), [0, DUR], [[cs.from[0], cs.from[1], 0], [cs.to[0], cs.to[1], 0]]);
co.property("Depth of Field").setValue(1);
co.property("Aperture").setValue(cs.aperture);
key(co.property("Focus Distance"), [0, DUR], [zoom + cs.focus, zoom + cs.focus - cs.push]);

// the faint sepia of a remembered day, and a darker edge
var warm = c.layers.addSolid([0.86, 0.74, 0.55], "warm", W, H, 1);
warm.blendingMode = BlendingMode.SOFT_LIGHT;
warm.property("Transform").property("Opacity").setValue(38);
var edge = c.layers.addSolid([1, 1, 1], "edge", W, H, 1);
var er = edge.property("Effects").addProperty("ADBE Ramp");
er.property("Ramp Shape").setValue(2);
er.property("Start of Ramp").setValue([270, 480]); er.property("Start Color").setValue([1, 1, 1]);
er.property("End of Ramp").setValue([270, 1150]); er.property("End Color").setValue([0.35, 0.35, 0.35]);
edge.blendingMode = BlendingMode.MULTIPLY;

var black = c.layers.addSolid([0, 0, 0], "black", W, H, 1);
key(black.property("Transform").property("Opacity"), [0, 1.0, DUR - 1.2, DUR], [100, 0, 0, 100]);
app.project.save(new File(SCENE.save));
writeLn("ok " + SCENE.name);
