from flask import Flask, jsonify, request
from flask_cors import CORS
from modules import data_loader, algo_kol, algo_bfs, algo_weak

app = Flask(__name__)
CORS(app)

# Load dữ liệu ngay khi bật server
data_loader.load_data()

@app.route('/api/graph', methods=['GET'])
def get_graph():
    return jsonify(data_loader.get_full_data())

# File: backend/app.py

@app.route('/api/analyze/kol', methods=['GET'])
def api_kol():
    # 1. Chỉ lấy edges (vì algo_kol chỉ cần edges)
    edges = data_loader.get_edges()
    
    # 2. GỌI HÀM: CHỈ TRUYỀN EDGES (Xóa biến nodes đi nếu có)
    # Sai: algo_kol.find_top_influencer(nodes, edges)
    # Đúng: 👇
    best_id, degree = algo_kol.find_top_influencer(edges)
    
    # 3. Lấy thông tin node từ ID để trả về
    if best_id is None:
        return jsonify({"node": None, "degree": 0})

    best_node = data_loader.get_node_by_id(best_id)
    
    return jsonify({
        "node": best_node,
        "degree": degree
    })
@app.route('/api/analyze/path', methods=['POST'])
def api_path():
    data = request.json
    adj = data_loader.get_adjacency()
    path = algo_bfs.find_shortest_path(data.get('start'), data.get('end'), adj)
    return jsonify({"found": bool(path), "path": path if path else []})

@app.route('/api/analyze/weak', methods=['POST'])
def api_weak():
    data = request.json
    results = algo_weak.find_weak_connections(
        data.get('user_id'), 
        data_loader.get_nodes(), 
        data_loader.get_adjacency(), 
        data.get('current_nodes', [])
    )
    # Map thêm thông tin node để trả về cho FE
    for item in results:
        item['node'] = data_loader.get_node_by_id(item['id'])
    return jsonify(results)

if __name__ == '__main__':
    print("🚀 Server đang chạy tại http://127.0.0.1:5000")
    app.run(debug=True, port=5000)