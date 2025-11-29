var network = null;
var nodesDataset = null;
var edgesDataset = null;

// --- HÀM TẢI DỮ LIỆU TỪ FILE JSON (Đã xử lý bởi Python) ---
async function loadDataAndDraw(limitCount) {
    try {
        // 1. Đọc file data.json (File này do Python tạo ra, chứa cả nodes và edges)
        const response = await fetch('data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const graphData = await response.json();

        // 2. Xử lý giới hạn số lượng hiển thị (nếu người dùng nhập số nhỏ hơn tổng data)
        let nodes = graphData.nodes;
        let edges = graphData.edges;

        if (limitCount < nodes.length) {
            // Cắt bớt danh sách nodes
            nodes = nodes.slice(0, limitCount);
            
            // Tạo Set các ID tồn tại để lọc edges nhanh hơn
            const validNodeIds = new Set(nodes.map(n => n.id));
            
            // Chỉ giữ lại các edge nối giữa các node còn tồn tại
            edges = edges.filter(e => validNodeIds.has(e.from) && validNodeIds.has(e.to));
        }

        // Lưu ý: Python đã tính sẵn 'value' (kích thước) và tạo sẵn 'image' (avatar) 
        // nên ta không cần loop tính toán lại ở đây nữa.

        // 3. Vẽ biểu đồ
        drawGraph({ nodes: nodes, edges: edges });
        
        // Reset trạng thái UI
        resetInfoCard();
        document.getElementById('physicsToggle').checked = true;

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        alert("Lỗi: Không thể đọc file data.json. Hãy chắc chắn rằng bạn đã chạy script Python để tạo file này và đang mở web bằng Live Server.");
    }
}

// --- HÀM VẼ GRAPH ---
function drawGraph(data) {
    var container = document.getElementById('mynetwork');
    
    nodesDataset = new vis.DataSet(data.nodes);
    edgesDataset = new vis.DataSet(data.edges);

    var visData = { nodes: nodesDataset, edges: edgesDataset };
    
    var options = {
        nodes: {
            shape: 'circularImage', // Đảm bảo hiển thị ảnh tròn
            brokenImage: 'https://via.placeholder.com/150?text=Error', // Fallback nếu ảnh lỗi
            scaling: {
                min: 15,
                max: 60,
                label: { enabled: true, min: 14, max: 24 }
            },
            font: { 
                size: 16, 
                face: 'Inter', 
                color: '#ffffff', 
                strokeWidth: 3, 
                strokeColor: '#000000',
                multi: false,
                vadjust: 0
            },
            borderWidth: 3, 
            borderWidthSelected: 6,
            shadow: true
        },
        edges: {
            color: { color: '#ffffff', opacity: 0.15 }, 
            width: 1,
            smooth: { type: 'continuous' },
            shadow: false
        },
        physics: {
            stabilization: false,
            forceAtlas2Based: {
                gravitationalConstant: -100, 
                centralGravity: 0.005,
                springLength: 200,
                springConstant: 0.05
            },
            maxVelocity: 100,
            solver: 'forceAtlas2Based',
            timestep: 0.3,
        },
        interaction: { 
            hover: true,
            tooltipDelay: 200,
            hideEdgesOnDrag: true
        },
        groups: {
            useDefaultGroups: true
        }
    };

    if (network !== null) {
        network.destroy();
        network = null;
    }

    network = new vis.Network(container, visData, options);

    // --- SỰ KIỆN CLICK ---
    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            var nodeId = params.nodes[0];
            var node = nodesDataset.get(nodeId);
            var connectedEdges = network.getConnectedEdges(nodeId);
            
            updateInfoCard(node, connectedEdges.length);
            highlightNode(nodeId);
        } else {
            resetHighlight();
            resetInfoCard();
        }
    });
}

// --- CÁC HÀM XỬ LÝ GIAO DIỆN ---

function regenerateGraph() {
    var count = parseInt(document.getElementById('nodeCount').value);
    if (count < 2) count = 2;
    
    // Gọi hàm loadDataAndDraw mới để đọc từ data.json
    loadDataAndDraw(count);
}

function updateInfoCard(node, connectionCount) {
    document.getElementById('info-placeholder').style.display = 'none';
    document.getElementById('info-content').style.display = 'block';
    
    document.getElementById('node-id').innerText = node.id;
    document.getElementById('node-label').innerText = node.label;
    
    document.getElementById('node-connections').innerText = connectionCount + " bạn bè";
}

function resetInfoCard() {
    document.getElementById('info-placeholder').style.display = 'block';
    document.getElementById('info-content').style.display = 'none';
}

function togglePhysics() {
    var isEnabled = document.getElementById('physicsToggle').checked;
    network.setOptions({ physics: { enabled: isEnabled } });
}

function toggleShadow() {
    var isEnabled = document.getElementById('shadowToggle').checked;
    network.setOptions({ 
        nodes: { shadow: isEnabled },
        edges: { shadow: isEnabled }
    });
}

function highlightNode(selectedId) {
    var allNodes = nodesDataset.get();
    var connectedNodes = network.getConnectedNodes(selectedId);
    var updates = [];

    // Làm mờ tất cả
    for (var i = 0; i < allNodes.length; i++) {
        updates.push({ 
            id: allNodes[i].id, 
            color: { background: '#222', border: '#333' }, // Màu tối khi bị mờ
            font: { color: '#555', strokeWidth: 0 },
            opacity: 0.2 
        });
    }
    nodesDataset.update(updates);

    // Làm sáng node chọn
    var highlightUpdates = [];
    highlightUpdates.push({ 
        id: selectedId, 
        color: null, 
        font: { color: '#fff', size: 20, strokeWidth: 4, strokeColor: '#000' },
        borderWidth: 6
    });

    // Làm sáng node hàng xóm
    connectedNodes.forEach(function(id) {
        highlightUpdates.push({ 
            id: id, 
            color: null, 
            font: { color: '#fff', strokeWidth: 2, strokeColor: '#000' },
            borderWidth: 4,
            shapeProperties: { borderDashes: [5, 5] } 
        });
    });
    nodesDataset.update(highlightUpdates);
}

function resetHighlight() {
    var allNodes = nodesDataset.get();
    var updates = [];
    for (var i = 0; i < allNodes.length; i++) {
        updates.push({ 
            id: allNodes[i].id, 
            color: null, 
            font: { size: 16, face: 'Inter', color: '#ffffff', strokeWidth: 3, strokeColor: '#000000' },
            opacity: 1,
            borderWidth: 3,
            shapeProperties: { borderDashes: false }
        });
    }
    nodesDataset.update(updates);
}

// --- KHỞI CHẠY LẦN ĐẦU ---
window.onload = function() {
    regenerateGraph();
};