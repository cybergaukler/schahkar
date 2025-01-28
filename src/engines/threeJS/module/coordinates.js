export function placementToCoordinates(placement) {
  const column = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexOf(placement.charAt(0));
  const row = -1 * parseInt(placement.charAt(1));
  return { x: column, y: 0, z: row };
}

export function coordinatesToPlacement(coordinates) {
  const column = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][coordinates.x];
  const row = -1 * coordinates.z;
  return `${column}${row}`;
}
