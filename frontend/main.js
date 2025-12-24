// CẤU HÌNH API BACKEND PYTHON
const API_URL = "http://127.0.0.1:5000";

let network = null;
let allNodes = [];
let allEdges = [];
let currentNodes = [];
let currentEdges = [];

// Map hỗ trợ UI
let adjacencyMap = new Map();
let nodeMap = new Map();
let connectionDetails = new Map();

const DEFAULT_BORDER_COLOR = '#007acc';

// 1. Tải dữ liệu ban đầu (GỌI API)
async function loadGraph() {
    try {
        const response = await fetch(`${API_URL}/api/graph`);
        if (!response.ok) throw new Error("Lỗi kết nối Server Python");
        
        const data = await response.json();
        allNodes = data.nodes;
        allEdges = data.edges;
        
        applyFilter();
        updateLimitLabel();
    } catch (error) {
        console.error(error);
        const resultBox = document.getElementById('analysisResult');
        if(resultBox) resultBox.innerHTML = `<span style="color:red">Lỗi: Không kết nối được Server Python (Port 5000).</span>`;
    }
}

// 2. Cập nhật từ slider -> input
function updateLimitLabel() {
    const value = document.getElementById('nodeLimit').value;
    const input = document.getElementById('nodeLimitInput');
    if (input) input.value = value;
}

// 2b. Cập nhật từ input -> slider
function updateLimitFromInput() {
    let value = parseInt(document.getElementById('nodeLimitInput').value) || 5;
    value = Math.max(5, Math.min(200, value));
    document.getElementById('nodeLimit').value = value;
    document.getElementById('nodeLimitInput').value = value;
}

// 3. Lọc dữ liệu theo số lượng
function applyFilter() {
    const limit = parseInt(document.getElementById('nodeLimit').value);
    
    currentNodes = allNodes.slice(0, limit);
    const validIds = new Set(currentNodes.map(n => n.id));
    currentEdges = allEdges.filter(e => validIds.has(e.from) && validIds.has(e.to));
    
    // Build Map
    buildAdjacencyMap();
    nodeMap = new Map();
    currentNodes.forEach(n => nodeMap.set(n.id, n));

    drawNetwork(currentNodes, currentEdges);
    updateStats();
    
    const resultBox = document.getElementById('analysisResult');
    if (resultBox) resultBox.textContent = "Đã cập nhật hiển thị.";
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
        physicsConfig = { enabled: true, barnesHut: { gravitationalConstant: -4000, springLength: 120 }, stabilization: { iterations: 150 } };
    } else {
        physicsConfig = { enabled: true, barnesHut: { gravitationalConstant: -25000, springLength: 400 }, stabilization: { iterations: 500 } };
    }

    const options = {
        nodes: {
            shape: 'circularImage',
            borderWidth: 2,
            size: 25,
            color: { border: DEFAULT_BORDER_COLOR, background: '#fff' },
            font: { color: '#fff' }
        },
        edges: {
            color: { color: '#555', highlight: '#ff0000' },
            width: 1,
            smooth: false
        },
        physics: physicsConfig,
        interaction: { hover: true, hideEdgesOnDrag: true }
    };

    network = new vis.Network(container, data, options);

    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const node = nodeMap.get(params.nodes[0]);
            showNodeInfo(node);
        } else {
            showNodeInfo(null);
        }
    });
}

// 5. Hiển thị thông tin node (CÓ GỌI API WEAK CONNECTIONS)
async function showNodeInfo(node) {
    const defaultMsg = document.getElementById('defaultMessage');
    const content = document.getElementById('userInfoContent');
    const card = document.getElementById('nodeDetails');
    const img = document.getElementById('uAvatar');
    const name = document.getElementById('uName');
    const group = document.getElementById('uGroup');
    const id = document.getElementById('uID');
    const traitsList = document.getElementById('uTraitsList');
    const connectionsGrid = document.getElementById('uConnectionsGrid');
    const weakGrid = document.getElementById('uWeakConnectionsGrid');

    // Reset UI
    if (!node) {
        if (defaultMsg) defaultMsg.style.display = 'block';
        if (content) content.style.display = 'none';
        if (card) card.classList.remove('is-active');
        if (traitsList) traitsList.innerHTML = '';
        if (connectionsGrid) connectionsGrid.innerHTML = '';
        if (weakGrid) weakGrid.innerHTML = '';
        if (network) { network.unselectAll(); resetNodeHighlights(); }
        updateConnectionsCount(0);
        return;
    }

    // Show Content
    if (defaultMsg) defaultMsg.style.display = 'none';
    if (content) content.style.display = 'flex';
    if (card) card.classList.add('is-active');

    // Fill Data
    if (img) img.src = node.image;
    if (name) name.textContent = node.label;
    if (group) group.textContent = node.group;
    if (id) id.textContent = `ID: ${node.id}`;

    // Traits
    if (traitsList) {
        traitsList.innerHTML = '';
        if (node.traits && node.traits.length > 0) {
            node.traits.forEach(trait => {
                const span = document.createElement('span');
                span.className = 'trait-tag glow-chip';
                span.textContent = trait;
                traitsList.appendChild(span);
            });
        }
    }

    // Strong Connections
    const strongNeighbors = Array.from(adjacencyMap.get(node.id) || []);
    populateConnectionsGrid(node.id, connectionsGrid);
    updateConnectionsCount(strongNeighbors.length);

    // --- GỌI API PYTHON TÌM WEAK CONNECTIONS ---
    if(weakGrid) weakGrid.innerHTML = '<div class="empty-text"><i class="fas fa-spinner fa-spin"></i> Đang phân tích...</div>';
    
    try {
        const res = await fetch(`${API_URL}/api/analyze/weak`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                user_id: node.id, 
                current_nodes: currentNodes.map(n => n.id) 
            })
        });
        
        const weakData = await res.json();

        // Highlight
        if (network) {
            const weakIds = weakData.map(w => w.id);
            highlightConnections(node.id, strongNeighbors, weakIds);
            network.focus(node.id, { scale: 1.1, animation: true });
        }

        populateWeakConnectionsGridUI(weakData);

    } catch (e) {
        console.error(e);
        if(weakGrid) weakGrid.innerHTML = '<div class="empty-text">Lỗi Server.</div>';
    }
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
    const btnRun = document.getElementById('btnRunAlgo');

    if (inputs) inputs.style.display = 'none';
    if (btnRun) btnRun.disabled = false;

    if (algo === 'influence') {
        desc.textContent = "Lý thuyết: Degree Centrality (Python tính toán).";
    } else if (algo === 'path') {
        desc.textContent = "Lý thuyết: BFS (Breadth-First Search).";
        if (inputs) inputs.style.display = 'block';
    } else {
        desc.textContent = "Chọn một thuật toán để phân tích.";
        if (btnRun) btnRun.disabled = true;
    }
}

// 7. Chạy thuật toán (GỌI API PYTHON)
async function runAlgorithm() {
    const algo = document.getElementById('algoSelect').value;
    const resultBox = document.getElementById('analysisResult');

    showNodeInfo(null); // Reset selection

    if (algo === 'influence') {
        resultBox.innerHTML = "⏳ Python đang tìm KOL...";
        try {
            const res = await fetch(`${API_URL}/api/analyze/kol`);
            const data = await res.json();
            
            if (data.node) {
                network.selectNodes([data.node.id]);
                network.focus(data.node.id, { scale: 1.2, animation: true });
                resultBox.innerHTML = `<strong>KOL (Backend):</strong> ${data.node.label} (ID: ${data.node.id}) - ${data.degree} kết nối.`;
            } else {
                resultBox.textContent = "Không tìm thấy dữ liệu.";
            }
        } catch (e) {
            resultBox.textContent = "Lỗi kết nối Server Python.";
        }

    } else if (algo === 'path') {
        const startId = parseInt(document.getElementById('startNode').value);
        const endId = parseInt(document.getElementById('endNode').value);
        if (!startId || !endId) {
            resultBox.textContent = 'Vui lòng nhập ID hợp lệ.';
            return;
        }

        resultBox.textContent = "⏳ Python đang tìm đường...";

        try {
            const res = await fetch(`${API_URL}/api/analyze/path`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ start: startId, end: endId })
            });
            const data = await res.json();

            if (data.found) {
                highlightBFSPath(data.path);
                resultBox.innerHTML = `<strong>BFS (Backend):</strong> ${data.path.length - 1} bước. Lộ trình: ${data.path.join(' ➔ ')}`;
            } else {
                resultBox.textContent = "Không tìm thấy đường đi.";
            }
        } catch (e) {
            resultBox.textContent = "Lỗi kết nối Server Python.";
        }
    }
}

// 8. Highlight đường đi BFS
function highlightBFSPath(path) {
    if (!network || !path) return;
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

    // Highlight edges logic
    const edgeUpdates = [];
    for (let i = 0; i < path.length - 1; i++) {
        const fromId = path[i];
        const toId = path[i + 1];
        currentEdges.forEach((edge) => {
            if ((edge.from === fromId && edge.to === toId) || (edge.from === toId && edge.to === fromId)) {
                edgeUpdates.push({
                    id: edge.id,
                    color: { color: '#00ff00', highlight: '#00ff00' },
                    width: 4,
                    shadow: { enabled: true, color: 'rgba(0, 255, 0, 0.8)', size: 10 }
                });
            }
        });
    }
    if (edgeUpdates.length > 0) network.body.data.edges.update(edgeUpdates);
}

// 9. Reset Helpers
function resetEdgeHighlights() {
    if (!network) return;
    const edgeUpdates = currentEdges.map((edge) => ({
        id: edge.id, color: { color: '#555', highlight: '#ff0000' }, width: 1, shadow: { enabled: false }
    }));
    network.body.data.edges.update(edgeUpdates);
}

function resetGraph() {
    if (!network) return;
    network.unselectAll();
    resetNodeHighlights();
    resetEdgeHighlights();
    showNodeInfo(null);
    document.getElementById('analysisResult').innerText = "Đã reset.";
}

function updateStats() {
    const stats = document.getElementById('graphStats');
    if(stats) stats.textContent = `Nodes: ${currentNodes.length} | Edges: ${currentEdges.length}`;
}

// 10. Data Structures & Grid Helpers
function buildAdjacencyMap() {
    adjacencyMap = new Map();
    connectionDetails = new Map();
    
    currentNodes.forEach(n => adjacencyMap.set(n.id, new Set()));
    
    currentEdges.forEach(edge => {
        if (adjacencyMap.has(edge.from)) adjacencyMap.get(edge.from).add(edge.to);
        if (adjacencyMap.has(edge.to)) adjacencyMap.get(edge.to).add(edge.from);
        
        connectionDetails.set(`${edge.from}-${edge.to}`, edge.title || '');
        connectionDetails.set(`${edge.to}-${edge.from}`, edge.title || '');
    });
}

function populateConnectionsGrid(nodeId, container) {
    if(!container) return;
    container.innerHTML = '';
    const neighbors = Array.from(adjacencyMap.get(nodeId) || []);
    
    if (neighbors.length === 0) {
        container.innerHTML = '<div class="empty-text">Chưa có kết nối.</div>';
        return;
    }
    
    neighbors.forEach(nid => {
        const neighbor = nodeMap.get(nid);
        if(neighbor) {
            const sharedRaw = connectionDetails.get(`${nodeId}-${nid}`);
            // Xử lý chuỗi traits an toàn
            let traits = [];
            if(sharedRaw && sharedRaw.includes('Chung')) {
                const parts = sharedRaw.split(':');
                if(parts.length > 1) traits = parts[1].split(',').filter(t=>t.trim());
            }
            container.appendChild(createConnectionCard(neighbor, traits, false));
        }
    });
}

function populateWeakConnectionsGridUI(weakData) {
    const container = document.getElementById('uWeakConnectionsGrid');
    if (!container) return;
    container.innerHTML = '';

    if (!weakData || weakData.length === 0) {
        container.innerHTML = '<div class="empty-text">Không tìm thấy ai phù hợp.</div>';
        return;
    }

    weakData.slice(0, 10).forEach(item => {
        if (item.node) {
            container.appendChild(createConnectionCard(item.node, item.sharedTraits, true, item.sharedCount));
        }
    });
}

function createConnectionCard(targetNode, sharedTraitsList, isWeak, weakCount) {
    const card = document.createElement('div');
    card.className = isWeak ? 'connection-card weak-connection' : 'connection-card';
    
    const header = document.createElement('div');
    header.className = 'conn-header';
    header.innerHTML = `
        <div>
            <div class="conn-name">${targetNode.label}</div>
            <div class="conn-id">ID: ${targetNode.id} ${isWeak ? `• <span class="weak-badge">${weakCount} điểm</span>` : ''}</div>
        </div>
        <button class="conn-view-btn">Xem</button>
    `;
    
    header.querySelector('button').onclick = () => {
        showNodeInfo(targetNode);
        window.switchInfoTab('traits'); 
    };

    const traitsDiv = document.createElement('div');
    traitsDiv.className = 'conn-traits';
    if(sharedTraitsList && sharedTraitsList.length > 0) {
        sharedTraitsList.forEach(t => {
            const span = document.createElement('span');
            span.className = isWeak ? 'conn-chip weak-chip' : 'conn-chip';
            span.textContent = t.trim();
            traitsDiv.appendChild(span);
        });
    } else {
        const span = document.createElement('span');
        span.className = 'conn-chip';
        span.textContent = 'Chưa rõ';
        traitsDiv.appendChild(span);
    }

    card.appendChild(header);
    card.appendChild(traitsDiv);
    return card;
}

function highlightConnections(selectedId, strongIds, weakIds) {
    const updates = currentNodes.map(node => {
        let color = { border: DEFAULT_BORDER_COLOR };
        let width = 2;
        let shadow = { enabled: false };

        if (node.id === selectedId) {
            color = { border: '#00ff00' }; width = 4; shadow = { enabled: true, color: '#00ff00' };
        } else if (strongIds.includes(node.id)) {
            color = { border: '#007acc' }; width = 3;
        } else if (weakIds.includes(node.id)) {
            color = { border: '#ffa500' }; width = 3;
        }
        return { id: node.id, color: color, borderWidth: width, shadow: shadow };
    });
    network.body.data.nodes.update(updates);
}

function resetNodeHighlights() {
    if (!network) return;
    const updates = currentNodes.map(node => ({
        id: node.id, color: { border: DEFAULT_BORDER_COLOR }, borderWidth: 2, shadow: { enabled: false }
    }));
    network.body.data.nodes.update(updates);
}

// Export functions for HTML
window.updateLimitLabel = updateLimitLabel;
window.updateLimitFromInput = updateLimitFromInput;
window.applyFilter = applyFilter;
window.toggleAlgoInputs = toggleAlgoInputs;
window.runAlgorithm = runAlgorithm;
window.resetGraph = resetGraph;

window.switchInfoTab = function(tab) {
    const buttons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    buttons.forEach(btn => {
        if(btn.dataset.tab === tab) btn.classList.add('is-active');
        else btn.classList.remove('is-active');
    });
    panels.forEach(panel => {
        if(panel.dataset.tab === tab) panel.classList.add('is-active');
        else panel.classList.remove('is-active');
    });
};

// Start
window.onload = loadGraph;