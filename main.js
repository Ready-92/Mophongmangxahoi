let network = null;

// Hàm tải dữ liệu từ file data.json
async function loadGraph() {
    const statusDiv = document.getElementById('statusData');
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đọc file data.json...';
    
    try {
        // Fetch file JSON
        const response = await fetch('data.json');
        
        if (!response.ok) {
            throw new Error("Không tìm thấy file data.json. Hãy chạy file Python trước!");
        }

        const data = await response.json();

        // Kiểm tra dữ liệu
        if (!data.nodes || !data.edges) {
            throw new Error("File JSON thiếu nodes hoặc edges.");
        }

        drawNetwork(data.nodes, data.edges);
        
        statusDiv.innerHTML = `<i class="fas fa-check-circle" style="color:green"></i> Đã tải: ${data.nodes.length} Users`;

    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = `<span style="color:red">Lỗi: ${error.message}</span>`;
    }
}

// Hàm vẽ đồ thị
function drawNetwork(nodes, edges) {
    const container = document.getElementById('network');
    
    const data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    const options = {
        nodes: {
            // LƯU Ý: Không set shape: 'dot' ở đây để nhận shape 'circularImage' từ JSON
            borderWidth: 2,
            size: 25, 
            color: {
                border: '#ffffff',
                background: '#ffffff'
            },
            font: { color: '#ffffff', size: 14 }
        },
        edges: {
            color: { inherit: 'from', opacity: 0.4 },
            width: 1,
            smooth: { type: 'continuous' }
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -3000,
                centralGravity: 0.3,
                springLength: 150, // Dây dài ra để ảnh không chồng nhau
                damping: 0.09
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200
        }
    };

    network = new vis.Network(container, data, options);

    // Sự kiện click vào User
    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeInfo = nodes.find(n => n.id === nodeId);
            showDetails(nodeInfo);
        } else {
            document.getElementById('infoPanel').innerHTML = "<em>Click vào một ảnh đại diện trên bản đồ để xem thông tin.</em>";
        }
    });
}

// Hiển thị thông tin ra Sidebar
function showDetails(user) {
    const panel = document.getElementById('infoPanel');
    if(user) {
        panel.innerHTML = `
            <div style="text-align:center; margin-bottom:10px;">
                <img src="${user.image}" style="width:60px; height:60px; border-radius:50%; border:2px solid #ddd;">
            </div>
            <strong>ID:</strong> ${user.id} <br>
            <strong>Tên:</strong> ${user.label} <br>
            <strong>Nhóm:</strong> ${user.group} <br>
            <hr>
            <span style="color:green; font-size:12px;">● Đang hoạt động</span>
        `;
    }
}

// Hàm bật tắt vật lý
function togglePhysics() {
    if(network) {
        const isEnabled = document.getElementById('physicsToggle').checked;
        network.setOptions({ physics: { enabled: isEnabled } });
    }
}

// Tự động chạy khi mở web
window.onload = loadGraph;