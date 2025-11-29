import { findTopInfluencer } from './js/algorithms/degreeCentrality.js';
import { findShortestPathBFS } from './js/algorithms/bfs.js';

let network = null;
let allNodes = [];
let allEdges = [];
let currentNodes = [];
let currentEdges = [];
let adjacencyMap = new Map();
let nodeMap = new Map();
let connectionDetails = new Map();
let weakConnectionsMap = new Map();
const DEFAULT_BORDER_COLOR = '#007acc';

// 1. Tải dữ liệu ban đầu
async function loadGraph() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        allNodes = data.nodes;
        allEdges = data.edges;
        applyFilter();
        updateLimitLabel();
    } catch (error) {
        document.getElementById('analysisResult').innerHTML = "Lỗi: Không đọc được data.json.";
    }
}

// 2. Cập nhật label slider
function updateLimitLabel() {
    document.getElementById('limitLabel').innerText = document.getElementById('nodeLimit').value;
}

// 3. Lọc dữ liệu theo số lượng
function applyFilter() {
    const limit = parseInt(document.getElementById('nodeLimit').value);
    currentNodes = allNodes.slice(0, limit);
    const validIds = new Set(currentNodes.map(n => n.id));
    currentEdges = allEdges.filter(e => validIds.has(e.from) && validIds.has(e.to));
    buildAdjacencyMap();
    drawNetwork(currentNodes, currentEdges);
    updateStats();
    document.getElementById('analysisResult').innerHTML = "Đã cập nhật hiển thị.";
}

// 4. Vẽ đồ thị
function drawNetwork(nodes, edges) {
    const container = document.getElementById('network');
    const data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    const nodeCount = nodes.length;
    let physicsConfig;

    if (nodeCount <= 50) {
        physicsConfig = {
            enabled: true,
            barnesHut: { gravitationalConstant: -4000, springLength: 120, springConstant: 0.04, damping: 0.09 },
            stabilization: { enabled: true, iterations: 150, updateInterval: 50 }
        };
    } else if (nodeCount <= 100) {
        physicsConfig = {
            enabled: true,
            barnesHut: { gravitationalConstant: -15000, springLength: 300, springConstant: 0.02, damping: 0.2, avoidOverlap: 1 },
            stabilization: { enabled: true, iterations: 300, updateInterval: 100 }
        };
    } else {
        physicsConfig = {
            enabled: true,
            barnesHut: { gravitationalConstant: -25000, springLength: 400, springConstant: 0.01, damping: 0.3, avoidOverlap: 1 },
            stabilization: { enabled: true, iterations: 500, updateInterval: 100, fit: true },
            maxVelocity: 50, minVelocity: 0.75
        };
    }

    const options = {
        nodes: {
            shape: 'circularImage',
            borderWidth: 2,
            size: nodeCount > 100 ? 18 : (nodeCount > 50 ? 22 : 25),
            color: { border: '#007acc', background: '#fff' },
            font: { color: '#fff', size: nodeCount > 100 ? 10 : 12 }
        },
        edges: {
            color: { color: '#555', highlight: '#ff0000' },
            width: 1,
            smooth: false
        },
        physics: physicsConfig,
        interaction: {
            hover: nodeCount <= 100,
            zoomView: true,
            dragView: true,
            hideEdgesOnDrag: nodeCount > 50,
            hideEdgesOnZoom: nodeCount > 50
        }
    };

    network = new vis.Network(container, data, options);

    if (nodeCount > 50) {
        const resultBox = document.getElementById('analysisResult');
        resultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang ổn định đồ thị...';
        network.once('stabilizationIterationsDone', function () {
            network.setOptions({ physics: { enabled: false } });
            resultBox.innerHTML = `Đồ thị đã ổn định (${nodeCount} nodes).`;
        });
    }

    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const node = nodeMap.get(params.nodes[0]);
            showNodeInfo(node);
        } else {
            showNodeInfo(null);
        }
    });

    setTimeout(() => {
        resetNodeHighlights();
        updateConnectionsCount(0);
        clearWeakConnectionsGrid();
        document.getElementById('defaultMessage').style.display = 'block';
        document.getElementById('userInfoContent').style.display = 'none';
        document.getElementById('nodeDetails').classList.remove('is-active');
    }, 0);
}

// 5. Hiển thị thông tin node
function showNodeInfo(node) {
    const defaultMsg = document.getElementById('defaultMessage');
    const content = document.getElementById('userInfoContent');
    const card = document.getElementById('nodeDetails');
    const img = document.getElementById('uAvatar');
    const name = document.getElementById('uName');
    const group = document.getElementById('uGroup');
    const id = document.getElementById('uID');
    const traitsList = document.getElementById('uTraitsList');
    const connectionsGrid = document.getElementById('uConnectionsGrid');

    if (!node) {
        defaultMsg.style.display = 'block';
        content.style.display = 'none';
        card.classList.remove('is-active');
        traitsList.innerHTML = '';
        connectionsGrid.innerHTML = '';
        if (network) {
            network.unselectAll();
            resetNodeHighlights();
        }
        updateConnectionsCount(0);
        clearWeakConnectionsGrid();
        return;
    }

    defaultMsg.style.display = 'none';
    content.style.display = 'block';
    card.classList.add('is-active');

    img.src = node.image;
    name.innerText = node.label;
    group.innerText = node.group;
    id.innerText = `ID: ${node.id}`;

    traitsList.innerHTML = '';
    if (node.traits && node.traits.length > 0) {
        node.traits.forEach(trait => {
            const span = document.createElement('span');
            span.className = 'trait-tag glow-chip';
            span.innerText = trait;
            traitsList.appendChild(span);
        });
    } else {
        traitsList.innerHTML = '<span style="color:#777; font-size:12px">Không có dữ liệu</span>';
    }

    const strongNeighbors = Array.from(adjacencyMap.get(node.id) || []);
    populateConnectionsGrid(node.id, connectionsGrid);
    updateConnectionsCount(strongNeighbors.length);

    const weakConnections = findWeakConnections(node.id);
    weakConnectionsMap.set(node.id, weakConnections);

    if (network) {
        const weakIds = weakConnections.map(w => w.id);
        highlightConnections(node.id, strongNeighbors, weakIds);
    }

    populateWeakConnectionsGrid(node.id, weakConnections);
}

function updateConnectionsCount(count) {
    const badge = document.getElementById('connectionsCount');
    if (badge) badge.innerText = count;
}

// 6. Logic ẩn hiện input thuật toán
function toggleAlgoInputs() {
    const algo = document.getElementById('algoSelect').value;
    const desc = document.getElementById('algoDesc');
    const inputs = document.getElementById('pathInputs');
    inputs.style.display = 'none';

    if (algo === 'influence') {
        desc.innerText = "Lý thuyết: Degree Centrality. Tính toán số lượng kết nối của mỗi đỉnh để tìm người quan trọng nhất.";
    } else if (algo === 'path') {
        desc.innerText = "Lý thuyết: BFS (Breadth-First Search). Tìm đường đi ngắn nhất giữa hai đỉnh trong đồ thị không trọng số.";
        inputs.style.display = 'block';
    } else {
        desc.innerText = "Chọn một thuật toán để phân tích.";
    }
}

// 7. Chạy thuật toán
function runAlgorithm() {
    const algo = document.getElementById('algoSelect').value;
    const resultBox = document.getElementById('analysisResult');

    if (algo === 'influence') {
        const { node: bestNode, degree: maxDegree } = findTopInfluencer(currentNodes, currentEdges);
        if (bestNode) {
            network.selectNodes([bestNode.id]);
            resultBox.innerHTML = `<strong>KOL:</strong> ${bestNode.label} (ID: ${bestNode.id}) - ${maxDegree} kết nối.`;
        } else {
            resultBox.innerText = 'Không tìm được KOL (thiếu dữ liệu).';
        }
    } else if (algo === 'path') {
        const startId = parseInt(document.getElementById('startNode').value);
        const endId = parseInt(document.getElementById('endNode').value);
        if (!startId || !endId) return;

        const path = findShortestPathBFS(startId, endId, currentEdges);
        if (path) {
            highlightBFSPath(path);
            resultBox.innerHTML = `<strong>BFS:</strong> ${path.length - 1} bước. Lộ trình: ${path.join(' ➔ ')}`;
        } else {
            resultBox.innerText = 'Không tìm thấy đường đi.';
        }
    }
}

// 8. Highlight đường đi BFS
function highlightBFSPath(path) {
    if (!network || !path || path.length < 2) return;

    resetNodeHighlights();
    resetEdgeHighlights();

    const nodeUpdates = path.map((nodeId, index) => {
        let borderColor = '#00ff00';
        if (index === 0) borderColor = '#ff6b6b';
        if (index === path.length - 1) borderColor = '#4ecdc4';
        return {
            id: nodeId,
            color: { border: borderColor },
            borderWidth: 4,
            shadow: { enabled: true, color: borderColor, size: 20 }
        };
    });
    network.body.data.nodes.update(nodeUpdates);

    const edgeUpdates = [];
    for (let i = 0; i < path.length - 1; i++) {
        const fromId = path[i];
        const toId = path[i + 1];
        currentEdges.forEach((edge, idx) => {
            if ((edge.from === fromId && edge.to === toId) || (edge.from === toId && edge.to === fromId)) {
                edgeUpdates.push({
                    id: edge.id || idx,
                    color: { color: '#00ff00', highlight: '#00ff00' },
                    width: 4,
                    shadow: { enabled: true, color: 'rgba(0, 255, 0, 0.8)', size: 10 }
                });
            }
        });
    }
    if (edgeUpdates.length > 0) {
        network.body.data.edges.update(edgeUpdates);
    }
}

// 9. Reset edge highlights
function resetEdgeHighlights() {
    if (!network) return;
    const edgeUpdates = currentEdges.map((edge, idx) => ({
        id: edge.id || idx,
        color: { color: '#555', highlight: '#ff0000' },
        width: 1,
        shadow: { enabled: false }
    }));
    network.body.data.edges.update(edgeUpdates);
}

// 10. Reset Graph
function resetGraph() {
    if (!network) return;
    network.unselectAll();
    resetNodeHighlights();
    resetEdgeHighlights();
    showNodeInfo(null);
    document.getElementById('analysisResult').innerText = "Đã reset.";
}

function clearWeakConnectionsGrid() {
    const container = document.getElementById('uWeakConnectionsGrid');
    if (container) container.innerHTML = '<div class="empty-text">Chưa chọn người nào.</div>';
}

function updateStats() {
    const stats = `Nodes: ${currentNodes.length} | Edges: ${currentEdges.length}`;
    document.getElementById('graphStats').innerText = stats;
}

function buildAdjacencyMap() {
    adjacencyMap = new Map();
    nodeMap = new Map();
    connectionDetails = new Map();

    currentNodes.forEach(node => {
        nodeMap.set(node.id, node);
        adjacencyMap.set(node.id, new Set());
    });

    currentEdges.forEach(edge => {
        if (adjacencyMap.has(edge.from)) adjacencyMap.get(edge.from).add(edge.to);
        if (adjacencyMap.has(edge.to)) adjacencyMap.get(edge.to).add(edge.from);
        const keyForward = `${edge.from}-${edge.to}`;
        const keyBackward = `${edge.to}-${edge.from}`;
        connectionDetails.set(keyForward, edge.title || '');
        connectionDetails.set(keyBackward, edge.title || '');
    });
}

function populateConnectionsGrid(nodeId, container) {
    container.innerHTML = '';
    const neighbors = Array.from(adjacencyMap.get(nodeId) || []);

    if (neighbors.length === 0) {
        container.innerHTML = '<div class="empty-text">Chưa có kết nối nào.</div>';
        return;
    }

    const sortedNeighbors = neighbors.map(id => nodeMap.get(id)).filter(Boolean).sort((a, b) => a.label.localeCompare(b.label));

    sortedNeighbors.forEach(neighbor => {
        const card = document.createElement('div');
        card.className = 'connection-card';
        const sharedInfo = connectionDetails.get(`${nodeId}-${neighbor.id}`) || '';
        const sharedTraits = sharedInfo.replace('Chung', '').split(':').slice(1).join(':').trim();

        card.innerHTML = `
            <div class="conn-header">
                <div>
                    <div class="conn-name">${neighbor.label}</div>
                    <div class="conn-id">ID: ${neighbor.id}</div>
                </div>
                <button class="conn-view-btn" type="button">Xem</button>
            </div>
            <div class="conn-traits">
                ${(sharedTraits ? sharedTraits.split(',').map(t => `<span class="conn-chip">${t.trim()}</span>`).join('') : '<span class="conn-chip">Chưa rõ điểm chung</span>')}
            </div>
        `;

        card.querySelector('.conn-view-btn').addEventListener('click', () => {
            showNodeInfo(neighbor);
            switchInfoTab('traits');
        });

        container.appendChild(card);
    });
}

function switchInfoTab(tab) {
    const buttons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    buttons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.tab === tab));
    panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.tab === tab));
}

function findWeakConnections(nodeId) {
    const selectedNode = nodeMap.get(nodeId);
    if (!selectedNode || !selectedNode.traits) return [];

    const myTraits = new Set(selectedNode.traits);
    const strongNeighbors = adjacencyMap.get(nodeId) || new Set();
    const weakConnections = [];

    currentNodes.forEach(otherNode => {
        if (otherNode.id === nodeId) return;
        if (strongNeighbors.has(otherNode.id)) return;
        if (!otherNode.traits) return;

        const sharedTraits = otherNode.traits.filter(t => myTraits.has(t));
        const sharedCount = sharedTraits.length;

        if (sharedCount >= 1 && sharedCount <= 3) {
            weakConnections.push({ id: otherNode.id, node: otherNode, sharedCount, sharedTraits });
        }
    });

    weakConnections.sort((a, b) => b.sharedCount - a.sharedCount);
    return weakConnections;
}

function highlightConnections(selectedId, strongIds, weakIds) {
    const allNodeIds = currentNodes.map(n => n.id);
    const updates = [];

    allNodeIds.forEach(id => {
        let borderColor = DEFAULT_BORDER_COLOR;
        let borderWidth = 2;
        let shadow = false;
        let shadowColor = '';

        if (id === selectedId) {
            borderColor = '#00ff00';
            borderWidth = 4;
            shadow = true;
            shadowColor = 'rgba(0, 255, 0, 0.8)';
        } else if (strongIds.includes(id)) {
            borderColor = '#007acc';
            borderWidth = 3;
            shadow = true;
            shadowColor = 'rgba(0, 122, 204, 0.8)';
        } else if (weakIds.includes(id)) {
            borderColor = '#ffa500';
            borderWidth = 3;
            shadow = true;
            shadowColor = 'rgba(255, 165, 0, 0.6)';
        }

        updates.push({
            id,
            color: { border: borderColor },
            borderWidth,
            shadow: shadow ? { enabled: true, color: shadowColor, size: 15 } : { enabled: false }
        });
    });

    network.body.data.nodes.update(updates);
}

function resetNodeHighlights() {
    if (!network) return;
    const updates = currentNodes.map(node => ({
        id: node.id,
        color: { border: DEFAULT_BORDER_COLOR },
        borderWidth: 2,
        shadow: { enabled: false }
    }));
    network.body.data.nodes.update(updates);
}

function populateWeakConnectionsGrid(nodeId, weakConnections) {
    let container = document.getElementById('uWeakConnectionsGrid');

    if (!container) {
        const connectionsBox = document.querySelector('.tab-panel[data-tab="connections"] .connections-box');
        if (connectionsBox) {
            const weakSection = document.createElement('div');
            weakSection.className = 'weak-connections-section';
            weakSection.innerHTML = `
                <div class="weak-connections-title"><i class="fas fa-question-circle"></i> Có thể liên quan (1-3 điểm chung)</div>
                <div id="uWeakConnectionsGrid" class="connections-grid"></div>
            `;
            connectionsBox.appendChild(weakSection);
            container = document.getElementById('uWeakConnectionsGrid');
        }
    }

    if (!container) return;
    container.innerHTML = '';

    if (weakConnections.length === 0) {
        container.innerHTML = '<div class="empty-text">Không tìm thấy ai có 1-3 điểm chung.</div>';
        return;
    }

    const displayList = weakConnections.slice(0, 10);

    displayList.forEach(weak => {
        const card = document.createElement('div');
        card.className = 'connection-card weak-connection';

        card.innerHTML = `
            <div class="conn-header">
                <div>
                    <div class="conn-name">${weak.node.label}</div>
                    <div class="conn-id">ID: ${weak.node.id} • <span class="weak-badge">${weak.sharedCount} điểm chung</span></div>
                </div>
                <button class="conn-view-btn weak-btn" type="button">Xem</button>
            </div>
            <div class="conn-traits">
                ${weak.sharedTraits.map(t => `<span class="conn-chip weak-chip">${t}</span>`).join('')}
            </div>
        `;

        card.querySelector('.conn-view-btn').addEventListener('click', () => {
            showNodeInfo(weak.node);
            switchInfoTab('traits');
        });

        container.appendChild(card);
    });

    if (weakConnections.length > 10) {
        const moreText = document.createElement('div');
        moreText.className = 'empty-text';
        moreText.innerText = `...và ${weakConnections.length - 10} người khác`;
        container.appendChild(moreText);
    }
}

// Export functions to global scope for HTML onclick handlers
window.updateLimitLabel = updateLimitLabel;
window.applyFilter = applyFilter;
window.toggleAlgoInputs = toggleAlgoInputs;
window.runAlgorithm = runAlgorithm;
window.resetGraph = resetGraph;
window.switchInfoTab = switchInfoTab;

window.onload = loadGraph;
