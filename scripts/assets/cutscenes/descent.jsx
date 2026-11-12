// The way down to the ginkgo (v0.93): her room's floor to the courtyard, floor by floor, in the game's own corridors on
// the seventh day (photographed from the 3D hospital), her walking slowly on ahead, resting on the third floor, a line
// of words on each. From black and to black, between the text cards. EffectCraft: build-cutscenes.js fills SCENE in.
var SCENE = __SCENE__;
function imp(p) { return app.project.importFile(new ImportOptions(new File(p))); }
function key(prop, times, values) { for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]); }
var W = 540, H = 960, FPS = 24;
var SEG = SCENE.segment, XF = SCENE.crossfade;
var DUR = SCENE.floors.length * SEG + XF;
var c = app.project.items.addComp(SCENE.name, W, H, 1, DUR, FPS);
c.bgColor = [0, 0, 0];
var walk = imp(SCENE.walk), rest = imp(SCENE.rest);

for (var i = 0; i < SCENE.floors.length; i++) {
  var F = SCENE.floors[i];
  var t0 = i * SEG, t1 = t0 + SEG + XF;
  function fade(l) {
    l.inPoint = t0; l.outPoint = t1;
    key(l.property("Transform").property("Opacity"), [t0, t0 + XF, t1 - XF, t1], [0, 100, 100, 0]);
  }
  // the corridor, coming slowly closer
  var plate = imp(F.plate);
  var p = c.layers.add(plate);
  var cover = Math.max(W / plate.width, H / plate.height) * 100;
  var grow = F.still ? 1 : 1.09;
  key(p.property("Transform").property("Scale"), [t0, t1], [[cover, cover], [cover * grow, cover * grow]]);
  p.property("Transform").property("Position").setValue([W / 2, H / 2]);
  fade(p);
  // her: walking on ahead, a little smaller as she goes, a little up and down with each step; or resting
  var g = c.layers.add(F.rest ? rest : walk);
  var t = g.property("Transform");
  t.property("Anchor Point").setValue([(F.rest ? rest : walk).width / 2, (F.rest ? rest : walk).height]);
  if (F.rest) {
    t.property("Position").setValue(F.at);
    t.property("Scale").setValue([F.mirror ? -F.scale : F.scale, F.scale]);
  } else {
    var pos = t.property("Position");
    for (var s = 0; s <= 8; s++) {
      var k = s / 8;
      var x = F.at[0] + (F.to[0] - F.at[0]) * k, y = F.at[1] + (F.to[1] - F.at[1]) * k - (s % 2 ? 4 : 0);
      pos.setValueAtTime(t0 + (SEG + XF) * k, [x, y]);
    }
    key(t.property("Scale"), [t0, t1], [[F.scale, F.scale], [F.scale * 0.82, F.scale * 0.82]]);
  }
  g.property("Effects").addProperty("ADBE HUE SATURATION").property("Master Saturation").setValue(-100);
  fade(g);
  // the line for this floor, low on the screen over a soft shade
  var shade = c.layers.addSolid([0, 0, 0], "shade", W, 150, 1);
  shade.property("Transform").property("Position").setValue([W / 2, H - 80]);
  shade.inPoint = t0; shade.outPoint = t1;
  key(shade.property("Transform").property("Opacity"), [t0, t0 + XF, t1 - XF, t1], [0, 55, 55, 0]);
  for (var j = 0; j < F.lines.length; j++) {
    var tx = c.layers.addText(F.lines[j]);
    var doc = tx.property("Source Text").value;
    doc.font = "Batang"; doc.fontSize = 27; doc.fillColor = [1, 1, 1]; doc.justification = ParagraphJustification.CENTER_JUSTIFY;
    tx.property("Source Text").setValue(doc);
    tx.property("Transform").property("Position").setValue([W / 2, H - 100 + j * 42]);
    tx.inPoint = t0 + XF * 0.6; tx.outPoint = t1 - XF * 0.4;
    key(tx.property("Transform").property("Opacity"), [t0 + XF * 0.6, t0 + XF * 1.4, t1 - XF * 1.2, t1 - XF * 0.4], [0, 100, 100, 0]);
  }
}

// her slow steps, never two at once (EffectCraft plays only one of overlapping sound layers)
var STEPS = SCENE.steps || [];
for (var n = 0; n < STEPS.length; n++) {
  var S = STEPS[n];
  var snd = c.layers.add(imp(S.file));
  snd.startTime = S.at; snd.inPoint = S.at; snd.outPoint = S.at + 0.3;
  snd.property("Audio").property("Audio Levels").setValue([S.gain, S.gain]);
}

var black = c.layers.addSolid([0, 0, 0], "black", W, H, 1);
key(black.property("Transform").property("Opacity"), [0, 0.8, DUR - 0.9, DUR], [100, 0, 0, 100]);
app.project.save(new File(SCENE.save));
writeLn("ok " + SCENE.name);
