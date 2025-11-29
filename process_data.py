import pandas as pd
import json
import networkx as nx
import random

# --- CẤU HÌNH TỶ LỆ KẾT BẠN ---
PROB_SAME_GROUP = 0.15 
PROB_DIFF_GROUP = 0.01

try:
    df_users = pd.read_csv('users.csv')
    print(f"✅ Đã đọc được {len(df_users)} người dùng.")
except Exception as e:
    print("❌ Lỗi: Không tìm thấy file users.csv.")
    exit()

nodes = []
edges = []
G = nx.Graph()

# 2. Xử lý User
print("⏳ Đang xử lý dữ liệu...")
user_list = []

for index, row in df_users.iterrows():
    user_id = int(row['id'])
    group = str(row['group'])
    
    # Tạo node
    user_obj = {
        "id": user_id,
        "label": str(row['label']),
        "group": group,
        "image": f"https://i.pravatar.cc/150?u={user_id}",
        "shape": "circularImage",
        "title": f"ID: {user_id}\nGroup: {group}"
    }
    nodes.append(user_obj)
    user_list.append(user_obj)

# 3. Kết bạn ngẫu nhiên
print("⏳ Đang tạo kết nối...")
for i in range(len(user_list)):
    for j in range(i + 1, len(user_list)):
        u1 = user_list[i]
        u2 = user_list[j]
        
        p = PROB_SAME_GROUP if u1['group'] == u2['group'] else PROB_DIFF_GROUP
            
        if random.random() < p:
            edges.append({"from": u1['id'], "to": u2['id']})
            G.add_edge(u1['id'], u2['id'])

# 4. Tính độ nổi tiếng (Size)
degrees = dict(G.degree())
for node in nodes:
    d = degrees.get(node['id'], 0)
    node['value'] = 15 + (d * 2) 

# 5. XUẤT RA FILE .JSON (Sửa lại chỗ này cho khớp với web)
final_data = {"nodes": nodes, "edges": edges}

# Ghi thẳng ra file JSON chuẩn
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(final_data, f, ensure_ascii=False, indent=2)

print(f"✅ XONG! Đã tạo file 'data.json' với {len(edges)} mối quan hệ.")