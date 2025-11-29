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
            shape: 'circularImage', // Nhận diện ảnh
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
    
    network.on("click", function(params) {
        if(params.nodes.length > 0) {
            const node = currentNodes.find(n => n.id === params.nodes[0]);
            showNodeInfo(node);
        }
    });
}

// 5. Hiển thị mô tả khi chọn thuật toán
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

// 6. CHẠY THUẬT TOÁN (CORE LOGIC)
function runAlgorithm() {
    const algo = document.getElementById('algoSelect').value;
    const resultBox = document.getElementById('analysisResult');
    
    if (algo === 'influence') {
        // Thuật toán 1: Tìm KOL (Degree Centrality)
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
            // Highlight node này
            network.selectNodes([bestNode.id]);
            network.focus(bestNode.id, { scale: 1.2, animation: true });
            
            resultBox.innerHTML = `
                <strong>NGƯỜI ẢNH HƯỞNG NHẤT:</strong><br>
                Tên: ${bestNode.label} (ID: ${bestNode.id})<br>
                Số kết nối: ${maxDegree}<br>
                <span style="color:yellow">Đây là "trung tâm" của mạng lưới hiện tại.</span>
            `;
        }
        
    } else if (algo === 'path') {
        // Thuật toán 2: BFS tìm đường đi ngắn nhất
        const startId = parseInt(document.getElementById('startNode').value);
        const endId = parseInt(document.getElementById('endNode').value);
        
        if (!startId || !endId) {
            resultBox.innerText = "Vui lòng nhập đủ ID bắt đầu và kết thúc.";
            return;
        }
        
        const path = findShortestPathBFS(startId, endId);
        
        if (path) {
            // Highlight đường đi
            const edgeIds = [];
            for (let i = 0; i < path.length - 1; i++) {
                // Tìm edge nối 2 node liên tiếp
                const edge = currentEdges.find(e => 
                    (e.from === path[i] && e.to === path[i+1]) || 
                    (e.from === path[i+1] && e.to === path[i])
                );
                if(edge) edgeIds.push(edge.id); // Vis.js tự sinh ID cho edge nếu ko có, cần check lại dataset
            }
            
            network.setSelection({ nodes: path }, { highlightEdges: false });
            // BFS chỉ trả về nodes, ta cần highlight thủ công (đơn giản hoá là focus node đích)
            network.focus(endId, { animation: true });
            
            resultBox.innerHTML = `
                <strong>ĐƯỜNG ĐI NGẮN NHẤT (BFS):</strong><br>
                Độ dài: ${path.length - 1} bước.<br>
                Lộ trình: ${path.join(" ➔ ")}
            `;
        } else {
            resultBox.innerText = "Không tìm thấy đường đi giữa 2 người này (họ không thuộc cùng 1 cộng đồng).";
        }
    }
}

// Thuật toán BFS thuần túy
function findShortestPathBFS(start, end) {
    if (start === end) return [start];
    
    let queue = [[start]];
    let visited = new Set();
    visited.add(start);
    
    while (queue.length > 0) {
        let path = queue.shift();
        let node = path[path.length - 1];
        
        // Tìm các hàng xóm
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

// Reset về trạng thái ban đầu
function resetGraph() {
    network.unselectAll();
    network.fit();
    document.getElementById('analysisResult').innerText = "Đã reset.";
}

// Thống kê cơ bản
function updateStats() {
    const stats = `Nodes: ${currentNodes.length} | Edges: ${currentEdges.length}`;
    document.getElementById('graphStats').innerText = stats;
}

function showNodeInfo(node) {
    document.getElementById('nodeDetails').innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <img src="${node.image}" style="width:40px;height:40px;border-radius:50%">
            <div>
                <strong>${node.label}</strong><br>
                ID: ${node.id}
            </div>
        </div>
        <div style="margin-top:5px; font-size:12px;">Nhóm: ${node.group}</div>
    `;
}

window.onload = loadGraph;