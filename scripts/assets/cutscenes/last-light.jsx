// The last light (docs/계획서.md, happy ending 4): the grey courtyard, the girl under the ginkgo turning to look at
// you, a light that fills the screen, and the world in colour when it goes. Built from the hospital drawings.
// An EffectCraft (After Effects-style) script: build-cutscenes.js fills in the folders and runs it.
var DIR = "__DIR__";  // the cut-out layers, and where the project is saved
var SKY = "__SKY__";
function imp(p) { return app.project.importFile(new ImportOptions(new File(p))); }
var W = 540, H = 960, DUR = 11, FPS = 24;
var TURN = 2.0;   // she starts to turn
var FLASH = 5.0;  // the screen is all white
var SWAP = 5.4;   // the world changes while nobody can see it
var CLEAR = 7.6;  // the white is gone
var c = app.project.items.addComp("last-light", W, H, 1, DUR, FPS);
c.bgColor = [0.6, 0.6, 0.6];

function layer3d(item, pos, scale) {
  var l = c.layers.add(item);
  l.threeDLayer = true;
  l.property("Transform").property("Position").setValue(pos);
  l.property("Transform").property("Scale").setValue([scale, scale, scale]);
  return l;
}
// grey until the white covers the screen, then colour
function greyThenColour(l, sat) {
  var s = l.property("Effects").addProperty("ADBE HUE SATURATION").property("Master Saturation");
  s.setValueAtTime(0, -100); s.setValueAtTime(SWAP - 0.05, -100); s.setValueAtTime(SWAP, sat);
}
function key(prop, times, values) { for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]); }

var sky = layer3d(imp(SKY), [270, 200, 1600], 230);
greyThenColour(sky, 10);
var ground = layer3d(imp(DIR + "ground-crop.png"), [270, 860, 500], 600);
ground.property("Transform").property("X Rotation").setValue(90);
greyThenColour(ground, 0);
var tree = layer3d(imp(DIR + "ginkgo.png"), [270, 860, 520], 215);
tree.property("Transform").property("Anchor Point").setValue([176, 452, 0]);
greyThenColour(tree, 0);
// autumn: the green ink mapped to ginkgo gold, its dark lines to bark brown
var gold = tree.property("Effects").addProperty("ADBE Tint");
gold.property("Map Black To").setValue([0.22, 0.14, 0.05]);
gold.property("Map White To").setValue([1.0, 0.86, 0.32]);
key(gold.property("Amount to Tint"), [0, SWAP - 0.05, SWAP], [0, 0, 100]);

// haze where the ground meets the sky, so the horizon isn't a ruled line
var haze = c.layers.addSolid([1, 1, 1], "haze", W, H, 1);
var hr = haze.property("Effects").addProperty("ADBE Ramp");
hr.property("Start of Ramp").setValue([270, 470]); hr.property("Start Color").setValue([0.93, 0.93, 0.93]);
hr.property("End of Ramp").setValue([270, 640]); hr.property("End Color").setValue([0, 0, 0]);
haze.blendingMode = BlendingMode.SCREEN;
haze.property("Transform").property("Opacity").setValue(45);
haze.moveAfter(tree);

// her, between you and the tree: from behind, then over her shoulder, then facing you. Always grey (the drawings
// are ink, and it hides the green the keying leaves in her hair).
var POSES = [["turn-back", 175, -1, TURN + 0.25], ["turn-side", 230, TURN + 0.1, TURN + 0.75], ["turn-front", 165, TURN + 0.6, DUR + 1]];
for (var i = 0; i < POSES.length; i++) {
  var p = POSES[i];
  var g = layer3d(imp(DIR + p[0] + ".png"), [270, 1160, 120], 80);  // her chest cut-off below the frame
  g.property("Transform").property("Anchor Point").setValue([p[1], 546, 0]);
  g.property("Effects").addProperty("ADBE HUE SATURATION").property("Master Saturation").setValue(-100);
  var o = g.property("Transform").property("Opacity");
  if (p[2] < 0) key(o, [0, p[3] - 0.15, p[3]], [100, 100, 0]);
  else if (p[3] > DUR) key(o, [p[2], p[2] + 0.15], [0, 100]);
  else key(o, [p[2], p[2] + 0.15, p[3] - 0.15, p[3]], [0, 100, 100, 0]);
}

var cam = c.layers.addCamera("cam", [270, 480]);
var co = cam.property("Camera Options");
var zoom = co.property("Zoom").value;
key(cam.property("Transform").property("Position"), [0, DUR], [[270, 520, -zoom], [270, 520, -zoom + 220]]);
cam.property("Transform").property("Point of Interest").setValue([270, 560, 500]);
co.property("Depth of Field").setValue(1);
co.property("Aperture").setValue(14);
// looking at the tree, then at her as she turns
var fd = co.property("Focus Distance");
key(fd, [0, TURN - 0.2, TURN + 0.8], [zoom + 520, zoom + 500, zoom + 120 - 80]);

// the light: a glow behind the tree that swells, then white over everything
var glow = c.layers.addSolid([1, 1, 1], "glow", W, H, 1);
glow.blendingMode = BlendingMode.SCREEN;
var ramp = glow.property("Effects").addProperty("ADBE Ramp");
ramp.property("Ramp Shape").setValue(2);
ramp.property("Start of Ramp").setValue([270, 380]);
ramp.property("Start Color").setValue([1, 0.97, 0.88]);
ramp.property("End Color").setValue([0, 0, 0]);
key(ramp.property("End of Ramp"), [FLASH - 1.8, FLASH - 0.2], [[270, 420], [270, 1300]]);
key(glow.property("Transform").property("Opacity"), [FLASH - 2.0, FLASH - 0.2, CLEAR - 1.0, CLEAR + 0.4], [0, 100, 100, 0]);

var white = c.layers.addSolid([1, 1, 1], "white", W, H, 1);
key(white.property("Transform").property("Opacity"), [FLASH - 1.0, FLASH, CLEAR - 1.4, CLEAR], [0, 100, 100, 0]);
// a warm cast on the world that comes back, fading as it settles
var tint = c.layers.addSolid([1, 0.85, 0.55], "warm", W, H, 1);
tint.blendingMode = BlendingMode.SOFT_LIGHT;
key(tint.property("Transform").property("Opacity"), [SWAP - 0.05, SWAP, DUR], [0, 45, 15]);
// in from the black of the text card before, out to the amber of the one after (script.ts AMBER_WORLD #e3b64f)
var black = c.layers.addSolid([0, 0, 0], "black", W, H, 1);
key(black.property("Transform").property("Opacity"), [0, 0.8], [100, 0]);
var amber = c.layers.addSolid([0xe3 / 255, 0xb6 / 255, 0x4f / 255], "amber", W, H, 1);
key(amber.property("Transform").property("Opacity"), [DUR - 1.2, DUR - 0.1], [0, 100]);
app.project.save(new File(DIR + "last-light.ecproj"));
writeLn("ok zoom=" + zoom + " layers=" + c.numLayers);
