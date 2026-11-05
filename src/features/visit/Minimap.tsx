import { StyleSheet, Text, View } from 'react-native';
import { memo } from 'react';
import { canStand, charAt, pathTo, type Cell, type Pose } from './hospitalMap';

// The cells around you, north up: where you are and which way you face, and the way to the goal as a line of dots
// (docs/병원_지도.md). Nobody is marked on it: people are for finding by walking.
const REACH = 4;
const SIZE = 9;
const AMBER = '#d9a441';
const ARROW = ['▲', '▶', '▼', '◀'];

function Minimap({ pose, goal }: { pose: Pose; goal: Cell | null }) {
  const onPath = new Set((goal ? pathTo(pose.floor, pose, goal) : []).map((c) => `${c.x},${c.y}`));
  const rows = [];
  for (let dy = -REACH; dy <= REACH; dy++) {
    const cells = [];
    for (let dx = -REACH; dx <= REACH; dx++) {
      const x = pose.x + dx;
      const y = pose.y + dy;
      const c = charAt(pose.floor, x, y);
      const here = dx === 0 && dy === 0;
      const isGoal = !!goal && goal.x === x && goal.y === y;
      const fill = c === '=' ? '#7a3434' : c === '+' ? '#8a6a2c' : c === 'E' || c === 'S' ? '#3f5d78' : canStand(pose.floor, x, y) ? 'rgba(240,235,223,0.85)' : 'rgba(0,0,0,0.55)';
      cells.push(
        <View key={dx} style={[styles.cell, { backgroundColor: fill }]}>
          {here ? (
            <Text style={styles.you}>{ARROW[pose.dir]}</Text>
          ) : isGoal ? (
            <View style={styles.goal} />
          ) : onPath.has(`${x},${y}`) ? (
            <View style={styles.dot} />
          ) : null}
        </View>
      );
    }
    rows.push(
      <View key={dy} style={styles.row}>
        {cells}
      </View>
    );
  }
  return (
    <View style={styles.box} pointerEvents="none" accessibilityLabel="미니맵">
      {rows}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(0,0,0,0.5)', padding: 1 },
  row: { flexDirection: 'row' },
  cell: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  you: { color: '#a3263f', fontSize: 9, lineHeight: 10, fontWeight: '700' },
  goal: { width: 7, height: 7, backgroundColor: AMBER, borderWidth: 1, borderColor: '#000' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: AMBER },
});

// Drawn again only when you move or the goal does, not on every redraw of the screen around it.
const same = (a: Cell | null, b: Cell | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y);
export default memo(Minimap, (a, b) => a.pose.floor === b.pose.floor && a.pose.dir === b.pose.dir && same(a.pose, b.pose) && same(a.goal, b.goal));
