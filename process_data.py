import pandas as pd
import json
import random

def create_json():
    try:
        # 1. Đọc file CSV
        df = pd.read_csv('users.csv')
        
        nodes = []
        ids_list = []

        # 2. Tạo danh sách Nodes (Người dùng)
        for index, row in df.iterrows():
            user_id = int(row.get('id', index + 1))
            name = str(row.get('name', f"User {user_id}"))
            group = str(row.get('group', 'Nhóm 1'))
            
            # Tạo link ảnh avatar ngẫu nhiên theo ID
            image_url = f"https://i.pravatar.cc/150?u={user_id}"

            node = {
                "id": user_id,
                "label": name,
                "group": group,
                "image": image_url,
                "shape": "circularImage",  # Quan trọng: Để hiển thị ảnh tròn
                "title": f"ID: {user_id}\nGroup: {group}",
                "value": random.randint(15, 30) # Kích thước node
            }
            nodes.append(node)
            ids_list.append(user_id)

        # 3. Tạo danh sách Edges (Kết nối ngẫu nhiên)
        edges = []
        for current_id in ids_list:
            # Mỗi người kết nối ngẫu nhiên với 1-3 người khác
            num_connections = random.randint(1, 3)
            targets = random.sample(ids_list, min(len(ids_list), num_connections))
            
            for target_id in targets:
                if current_id != target_id:
                    edges.append({
                        "from": current_id, 
                        "to": target_id
                    })

        # 4. Xuất ra file JSON
        final_data = {"nodes": nodes, "edges": edges}
        
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=4)
            
        print(f"✅ Đã tạo data.json thành công! ({len(nodes)} users)")

    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    create_json()