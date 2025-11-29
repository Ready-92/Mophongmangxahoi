export function findTopInfluencer(nodes = [], edges = []) {
    if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length === 0) {
        return { node: null, degree: -1 };
    }

    const degreeMap = new Map();
    nodes.forEach(node => degreeMap.set(node.id, 0));

    edges.forEach(edge => {
        if (degreeMap.has(edge.from)) {
            degreeMap.set(edge.from, degreeMap.get(edge.from) + 1);
        }
        if (degreeMap.has(edge.to)) {
            degreeMap.set(edge.to, degreeMap.get(edge.to) + 1);
        }
    });

    let bestNode = null;
    let maxDegree = -1;

    nodes.forEach(node => {
        const degree = degreeMap.get(node.id) ?? 0;
        if (degree > maxDegree) {
            maxDegree = degree;
            bestNode = node;
        }
    });

    return { node: bestNode, degree: maxDegree };
}
