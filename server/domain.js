export function getLight(actual, expected) {
  if (actual === expected) return 'GREEN'
  return actual > expected ? 'YELLOW' : 'RED'
}

// pg returns NUMERIC columns as strings, so std yards arrive as '1.80'.
// Working in hundredths of a yard avoids floating point drift.
export function getExpectedFabric(targetQty, stdFabricYards) {
  const hundredths = Math.round(Number(stdFabricYards) * 100) * targetQty
  return hundredths / 100
}

export function getWastagePct(actualYards, expectedYards) {
  const wastage = ((actualYards - expectedYards) / expectedYards) * 100
  return Math.round(wastage * 100) / 100
}