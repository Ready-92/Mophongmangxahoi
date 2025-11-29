export function findShortestPathBFS(start, end, edges = []) {
    if (start == null || end == null) return null;
    if (start === end) return [start];
    if (!Array.isArray(edges) || edges.length === 0) return null;

    const adjacency = new Map();

    const addNeighbor = (from, to) => {
        if (!adjacency.has(from)) {
            adjacency.set(from, new Set());
        }
        adjacency.get(from).add(to);
    };

    edges.forEach(edge => {
        if (edge?.from != null && edge?.to != null) {
            addNeighbor(edge.from, edge.to);
            addNeighbor(edge.to, edge.from);
        }
    });

    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
        const neighbors = adjacency.get(node) || [];

        for (const neighbor of neighbors) {
            if (visited.has(neighbor)) continue;
            const newPath = [...path, neighbor];
            if (neighbor === end) {
                return newPath;
            }
            visited.add(neighbor);
            queue.push(newPath);
        }
    }

    return null;
}
