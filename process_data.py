import pandas as pd
import json
import networkx as nx
import random

# --- CẤU HÌNH TỶ LỆ KẾT BẠN ---
# Cùng nhóm thì 30% khả năng là bạn bè
PROB_SAME_GROUP = 0.15 
# Khác nhóm thì chỉ 1% khả năng thôi
PROB_DIFF_GROUP = 0.01

try:
    # 1. Đọc file CSV người dùng bro vừa nhập
    df_users = pd.read_csv('users.csv')
    print(f"Đã đọc được {len(df_users)} người dùng.")
except Exception as e:
    print("Lỗi: Không tìm thấy file users.csv. Nhớ lưu file Excel sang CSV nhé!")
    exit()

nodes = []
edges = []
G = nx.Graph()

# 2. Xử lý User & Thêm ảnh tự động
print("Đang xử lý dữ liệu người dùng...")
user_list = [] # Lưu tạm để tí nữa dùng random

for index, row in df_users.iterrows():
    user_id = int(row['id'])
    group = str(row['group'])
    
    # Tạo link ảnh avatar ngẫu nhiên theo ID
    image_url = f"https://i.pravatar.cc/150?u={user_id}"
    
    user_obj = {
        "id": user_id,
        "label": str(row['label']),
        "group": group,
        "image": image_url,
        "shape": "circularImage", # Bắt buộc có dòng này để hiện ảnh tròn
        "title": f"ID: {user_id}\nGroup: {group}" # Hover chuột vào sẽ thấy
    }
    nodes.append(user_obj)
    user_list.append(user_obj)

# 3. Tự động se duyên (Kết bạn)
print("Đang tự động kết nối bạn bè...")
for i in range(len(user_list)):
    for j in range(i + 1, len(user_list)):
        u1 = user_list[i]
        u2 = user_list[j]
        
        # Xác suất kết bạn
        if u1['group'] == u2['group']:
            p = PROB_SAME_GROUP
        else:
            p = PROB_DIFF_GROUP
            
        if random.random() < p:
            # Tạo cạnh nối
            edges.append({"from": u1['id'], "to": u2['id']})
            G.add_edge(u1['id'], u2['id'])

# 4. Tính lại kích thước Node theo độ nổi tiếng
degrees = dict(G.degree())
for node in nodes:
    d = degrees.get(node['id'], 0)
    # Công thức: Node nhỏ nhất size 15, cứ thêm 1 bạn thì to thêm chút
    node['value'] = d * 2 

# 5. Xuất ra file JSON
final_data = {"nodes": nodes, "edges": edges}
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(final_data, f, ensure_ascii=False, indent=2)

print(f"XONG! Đã tạo data.json với {len(edges)} mối quan hệ.")