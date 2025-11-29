let network = null;
let allNodes = [];
let allEdges = [];
let currentNodes = [];
let currentEdges = [];
let adjacencyMap = new Map();
let nodeMap = new Map();
let connectionDetails = new Map();
let weakConnectionsMap = new Map(); // Lưu những người có 1-3 điểm chung
const DEFAULT_BORDER_COLOR = '#007acc';

// 1. Tải dữ liệu ban đầu
async function loadGraph() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();

        allNodes = data.nodes;
        allEdges = data.edges;

        // Mặc định load 50 node đầu tiên
        applyFilter();
        updateLimitLabel();

    } catch (error) {
        document.getElementById('analysisResult').innerHTML = "Lỗi: Không đọc được data.json. Hãy chạy Python và Live Server.";
    }
}

// 2. Cập nhật label slider
function updateLimitLabel() {
    document.getElementById('limitLabel').innerText = document.getElementById('nodeLimit').value;
}

// 3. Lọc dữ liệu theo số lượng (Slider)
function applyFilter() {
    const limit = parseInt(document.getElementById('nodeLimit').value);

    // Cắt danh sách node
    currentNodes = allNodes.slice(0, limit);
    const validIds = new Set(currentNodes.map(n => n.id));

    // Chỉ giữ lại edges nối giữa các node đang hiện
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

    const options = {
        nodes: {
            shape: 'circularImage',
            borderWidth: 2,
            size: 25,
            color: { border: '#007acc', background: '#fff' },
            font: { color: '#fff' }
        },
        edges: {
            color: { color: '#555', highlight: '#ff0000' },
            width: 1,
            smooth: { type: 'continuous' }
        },
        physics: {
            enabled: true,
            barnesHut: { gravitationalConstant: -4000, springLength: 120 }
        },
        interaction: { hover: true }
    };

    network = new vis.Network(container, data, options);

    // Sự kiện Click vào Node
    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const node = nodeMap.get(params.nodes[0]);
            showNodeInfo(node); // Gọi hàm hiển thị mới
        } else {
            showNodeInfo(null); // Click ra ngoài thì ẩn đi
        }
    });
}

// 5. [NEW] Hàm hiển thị thông tin (KHÔNG CÒN CODE HTML Ở ĐÂY NỮA)
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

    // Nếu không chọn ai
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

        clearWeakConnectionsGrid();
        return;
    }

    // Nếu có chọn -> Hiện khung và điền dữ liệu
    defaultMsg.style.display = 'none';
    content.style.display = 'block';
    card.classList.add('is-active');

    img.src = node.image;
    name.innerText = node.label;
    group.innerText = node.group;
    id.innerText = `ID: ${node.id}`;

    // Tạo các thẻ tag tính cách
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

    populateConnectionsGrid(node.id, connectionsGrid);

    // Tìm và highlight weak connections (1-3 điểm chung)
    const weakConnections = findWeakConnections(node.id);
    weakConnectionsMap.set(node.id, weakConnections);

    if (network) {
        const neighbors = Array.from(adjacencyMap.get(node.id) || []);
        const weakIds = weakConnections.map(w => w.id);

        // Focus trước, sau đó mới highlight để không bị override
        network.focus(node.id, { scale: 1.1, animation: true });

        // Dùng setTimeout để đảm bảo highlight chạy sau khi vis.js render xong
        setTimeout(() => {
            highlightConnections(node.id, neighbors, weakIds);
        }, 50);
    }

    // Hiển thị weak connections trong sidebar
    populateWeakConnectionsGrid(node.id, weakConnections);
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

// 7. CHẠY THUẬT TOÁN (CORE LOGIC - GIỮ NGUYÊN)
function runAlgorithm() {
    const algo = document.getElementById('algoSelect').value;
    const resultBox = document.getElementById('analysisResult');

    if (algo === 'influence') {
        // Thuật toán 1: Tìm KOL
        let maxDegree = -1;
        let bestNode = null;

        currentNodes.forEach(node => {
            const degree = currentEdges.filter(e => e.from === node.id || e.to === node.id).length;
            if (degree > maxDegree) {
                maxDegree = degree;
                bestNode = node;
            }
        });

        if (bestNode) {
            network.selectNodes([bestNode.id]);
            network.focus(bestNode.id, { scale: 1.2, animation: true });
            resultBox.innerHTML = `<strong>KOL:</strong> ${bestNode.label} (ID: ${bestNode.id}) - ${maxDegree} kết nối.`;
        }

    } else if (algo === 'path') {
        // Thuật toán 2: BFS
        const startId = parseInt(document.getElementById('startNode').value);
        const endId = parseInt(document.getElementById('endNode').value);

        if (!startId || !endId) return;

        const path = findShortestPathBFS(startId, endId);

        if (path) {
            network.setSelection({ nodes: path }, { highlightEdges: false });
            network.focus(endId, { animation: true });
            resultBox.innerHTML = `<strong>BFS:</strong> ${path.length - 1} bước. Lộ trình: ${path.join(" ➔ ")}`;
        } else {
            resultBox.innerText = "Không tìm thấy đường đi.";
        }
    }
}

// Thuật toán BFS thuần túy (GIỮ NGUYÊN)
function findShortestPathBFS(start, end) {
    if (start === end) return [start];
    let queue = [[start]];
    let visited = new Set();
    visited.add(start);

    while (queue.length > 0) {
        let path = queue.shift();
        let node = path[path.length - 1];
        let neighbors = [];
        currentEdges.forEach(e => {
            if (e.from === node && !visited.has(e.to)) neighbors.push(e.to);
            if (e.to === node && !visited.has(e.from)) neighbors.push(e.from);
        });
        for (let neighbor of neighbors) {
            let newPath = [...path, neighbor];
            if (neighbor === end) return newPath;
            visited.add(neighbor);
            queue.push(newPath);
        }
    }
    return null;
}

function resetGraph() {
    if (!network) return;
    network.unselectAll();
    network.fit();
    document.getElementById('analysisResult').innerText = "Đã reset.";
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
        if (adjacencyMap.has(edge.from)) {
            adjacencyMap.get(edge.from).add(edge.to);
        }
        if (adjacencyMap.has(edge.to)) {
            adjacencyMap.get(edge.to).add(edge.from);
        }

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

    const sortedNeighbors = neighbors
        .map(id => nodeMap.get(id))
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label));

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

    buttons.forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });

    panels.forEach(panel => {
        panel.classList.toggle('is-active', panel.dataset.tab === tab);
    });
}

// Tìm những người có 1-3 điểm chung (weak connections)
function findWeakConnections(nodeId) {
    const selectedNode = nodeMap.get(nodeId);
    if (!selectedNode || !selectedNode.traits) return [];

    const myTraits = new Set(selectedNode.traits);
    const strongNeighbors = adjacencyMap.get(nodeId) || new Set();
    const weakConnections = [];

    currentNodes.forEach(otherNode => {
        if (otherNode.id === nodeId) return; // Bỏ qua chính mình
        if (strongNeighbors.has(otherNode.id)) return; // Đã là kết nối mạnh (>=4 điểm)
        if (!otherNode.traits) return;

        // Tính số điểm chung
        const sharedTraits = otherNode.traits.filter(t => myTraits.has(t));
        const sharedCount = sharedTraits.length;

        if (sharedCount >= 1 && sharedCount <= 3) {
            weakConnections.push({
                id: otherNode.id,
                node: otherNode,
                sharedCount: sharedCount,
                sharedTraits: sharedTraits
            });
        }
    });

    // Sắp xếp theo số điểm chung giảm dần
    weakConnections.sort((a, b) => b.sharedCount - a.sharedCount);
    return weakConnections;
}

// Highlight nodes với màu khác nhau
function highlightConnections(selectedId, strongIds, weakIds) {
    const allNodeIds = currentNodes.map(n => n.id);
    const updates = [];

    allNodeIds.forEach(id => {
        let borderColor = DEFAULT_BORDER_COLOR; // Mặc định
        let borderWidth = 2;
        let shadow = false;
        let shadowColor = '';

        if (id === selectedId) {
            borderColor = '#00ff00'; // Xanh lá - node được chọn
            borderWidth = 4;
            shadow = true;
            shadowColor = 'rgba(0, 255, 0, 0.8)';
        } else if (strongIds.includes(id)) {
            borderColor = '#007acc'; // Xanh dương - kết nối mạnh (>=4 điểm)
            borderWidth = 3;
            shadow = true;
            shadowColor = 'rgba(0, 122, 204, 0.8)';
        } else if (weakIds.includes(id)) {
            borderColor = '#ffa500'; // Cam - kết nối yếu (1-3 điểm)
            borderWidth = 3;
            shadow = true;
            shadowColor = 'rgba(255, 165, 0, 0.6)';
        }

        updates.push({
            id: id,
            color: { border: borderColor },
            borderWidth: borderWidth,
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

// Hiển thị weak connections trong sidebar
function populateWeakConnectionsGrid(nodeId, weakConnections) {
    let container = document.getElementById('uWeakConnectionsGrid');

    // Tạo container nếu chưa có
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

    // Giới hạn hiển thị 10 người đầu
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

window.onload = loadGraph;