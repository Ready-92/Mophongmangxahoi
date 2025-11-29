import pandas as pd
import json
import random

# ================= CẤU HÌNH LOGIC =================
# 1. Số lượng tính cách mỗi người sẽ có
NUM_TRAITS_PER_USER = 10 

# 2. Ngưỡng để kết bạn (Chung ít nhất bao nhiêu tính cách thì nối?)
# Bạn yêu cầu 3-4 hoặc 5. Tôi để mặc định là 4 (khá khó, tạo nhóm rất chất lượng)
MIN_SHARED_TRAITS = 4

# 3. KHO TÍNH CÁCH (POOL) - Khoảng 50 cái để random cho đa dạng
TRAIT_POOL = [
    # Tính cách
    "Hài hước", "Trầm tính", "Hướng nội", "Hướng ngoại", "Thẳng thắn", "Nhạy cảm", 
    "Lãng mạn", "Thực tế", "Kỹ tính", "Hòa đồng", "Sáng tạo", "Lạnh lùng",
    # Sở thích
    "Thích Code", "Thích Game", "Mê Anime", "Yêu Mèo", "Yêu Chó", "Thích Gym",
    "Bóng đá", "Cầu lông", "Bơi lội", "Chạy bộ", "Leo núi", "Đạp xe",
    # Ăn uống
    "Nghiện Trà sữa", "Mê Cà phê", "Team Bún đậu", "Team Phở", "Thích Đồ nướng", 
    "Ăn chay", "Thích Đồ ngọt", "Ghét Hành",
    # Nghệ thuật / Giải trí
    "Nhạc Pop", "Nhạc Rock", "Nhạc Indie", "Thích Rap", "Nhạc Bolero",
    "Thích Du lịch", "Thích Ngủ", "Mọt sách", "Xem phim Hàn", "Hóng drama",
    "Chụp ảnh", "Vẽ tranh", "Nấu ăn",
    # Công nghệ / Khác
    "Dùng iPhone", "Dùng Android", "Team Windows", "Team Mac", "Thích AI",
    "Thích Chứng khoán", "Thích Tiền ảo"
]
# ===================================================

def create_json_advanced():
    try:
        # 1. Đọc file CSV (Chỉ cần ID, Name, Group)
        try:
            df = pd.read_csv('users.csv', skipinitialspace=True, encoding='utf-8-sig')
        except:
            df = pd.read_csv('users.csv', skipinitialspace=True, encoding='utf-16')

        print(f"--- Đã đọc {len(df)} users từ file CSV ---")

        nodes = []
        
        # 2. Tạo danh sách Nodes và Random Tính cách
        for index, row in df.iterrows():
            user_id = int(row.get('id', index + 1))
            user_name = row.get('name', f"User {user_id}")
            group = row.get('group', 'Unknown')
            
            # --- LOGIC RANDOM TÍNH CÁCH ---
            # Lấy ngẫu nhiên 10 tính cách KHÔNG TRÙNG nhau từ kho
            my_traits = random.sample(TRAIT_POOL, NUM_TRAITS_PER_USER)
            
            # Tạo chuỗi hiển thị đẹp
            display_traits = ", ".join(my_traits)

            # Link ảnh (Giả lập)
            image_url = f"https://i.pravatar.cc/150?u={user_id}"

            node = {
                "id": user_id,
                "label": str(user_name),
                "group": str(group),
                "image": image_url,
                "shape": "circularImage",
                "traits": my_traits,          # List dùng để tính toán
                "display_traits": display_traits, # Chuỗi dùng để hiển thị
                "title": f"Tên: {user_name}\nNhóm: {group}\n\nSở thích:\n- " + "\n- ".join(my_traits),
                "value": 20
            }
            nodes.append(node)

        # 3. LOGIC KẾT BẠN (So khớp phức tạp)
        edges = []
        connection_count = 0
        
        print(f"--- Đang so khớp (Mỗi người {NUM_TRAITS_PER_USER} tính cách, cần trùng >= {MIN_SHARED_TRAITS}) ---")

        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)): 
                user_a = nodes[i]
                user_b = nodes[j]

                # Tìm điểm chung
                set_a = set(user_a['traits'])
                set_b = set(user_b['traits'])
                shared = list(set_a.intersection(set_b))
                
                # Nếu số điểm chung >= Ngưỡng
                if len(shared) >= MIN_SHARED_TRAITS:
                    edges.append({
                        "from": user_a['id'],
                        "to": user_b['id'],
                        "title": f"Chung {len(shared)} điểm: {', '.join(shared)}" # Tooltip khi hover vào dây
                    })
                    connection_count += 1

        # 4. Xuất file JSON
        final_data = {"nodes": nodes, "edges": edges}
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=4)
            
        print(f"------------------------------------------------")
        print(f"✅ XONG! Đã tạo {connection_count} kết nối.")
        print(f"📊 Trung bình mỗi người có: {round(connection_count * 2 / len(nodes), 1)} bạn bè.")
        if connection_count == 0:
            print("⚠️ CẢNH BÁO: Không có kết nối nào! Hãy giảm 'MIN_SHARED_TRAITS' xuống 3.")

    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    create_json_advanced()