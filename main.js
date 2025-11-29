let network = null;
let allNodes = [];
let allEdges = [];
let currentNodes = [];
let currentEdges = [];

// 1. Tải dữ liệu ban đầu
async function loadGraph() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        allNodes = data.nodes;
        allEdges = data.edges;
        
        // Mặc định load 50 node đầu tiên
        applyFilter();
        
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
    network.on("click", function(params) {
        if(params.nodes.length > 0) {
            const node = currentNodes.find(n => n.id === params.nodes[0]);
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
    const img = document.getElementById('uAvatar');
    const name = document.getElementById('uName');
    const group = document.getElementById('uGroup');
    const id = document.getElementById('uID');
    const traitsList = document.getElementById('uTraitsList');

    // Nếu không chọn ai
    if (!node) {
        defaultMsg.style.display = 'block';
        content.style.display = 'none';
        return;
    }

    // Nếu có chọn -> Hiện khung và điền dữ liệu
    defaultMsg.style.display = 'none';
    content.style.display = 'block';

    img.src = node.image;
    name.innerText = node.label;
    group.innerText = node.group;
    id.innerText = `ID: ${node.id}`;

    // Tạo các thẻ tag tính cách
    traitsList.innerHTML = ''; 
    if (node.traits && node.traits.length > 0) {
        node.traits.forEach(trait => {
            const span = document.createElement('span');
            span.className = 'trait-tag';
            span.innerText = trait;
            traitsList.appendChild(span);
        });
    } else {
        traitsList.innerHTML = '<span style="color:#777; font-size:12px">Không có dữ liệu</span>';
    }
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
    network.unselectAll();
    network.fit();
    document.getElementById('analysisResult').innerText = "Đã reset.";
}

function updateStats() {
    const stats = `Nodes: ${currentNodes.length} | Edges: ${currentEdges.length}`;
    document.getElementById('graphStats').innerText = stats;
}

window.onload = loadGraph;