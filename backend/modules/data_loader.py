import json
import collections
import os

GRAPH_DATA = {}
NODES = []
EDGES = []
ADJACENCY = collections.defaultdict(set)

def load_data():
    global GRAPH_DATA, NODES, EDGES, ADJACENCY
    # Tìm file data.json ở thư mục cha (backend/)
    file_path = os.path.join(os.path.dirname(__file__), '..', 'data.json')
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            GRAPH_DATA = json.load(f)
            NODES = GRAPH_DATA.get('nodes', [])
            EDGES = GRAPH_DATA.get('edges', [])
            
            # Xây dựng bản đồ kết nối (Adjacency Map)
            ADJACENCY.clear()
            for edge in EDGES:
                u, v = edge['from'], edge['to']
                ADJACENCY[u].add(v)
                ADJACENCY[v].add(u)
                
            print(f"✅ [MODULE] Data Loaded: {len(NODES)} nodes.")
            return True
    except FileNotFoundError:
        print("❌ Lỗi: Không thấy file data.json trong thư mục backend!")
        return False

def get_nodes(): return NODES
def get_edges(): return EDGES
def get_adjacency(): return ADJACENCY
def get_full_data(): return GRAPH_DATA
def get_node_by_id(user_id):
    return next((n for n in NODES if n['id'] == user_id), None)