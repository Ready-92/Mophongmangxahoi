import pandas as pd
import json
import random
from collections import defaultdict

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

def _read_users_csv(path='users.csv'):
    """Đọc CSV với logging rõ ràng khi phải fallback encoding."""
    try:
        df = pd.read_csv(path, skipinitialspace=True, encoding='utf-8-sig')
        print("✅ Đọc CSV bằng UTF-8 thành công.")
        return df
    except UnicodeError:
        print("⚠️ UTF-8 thất bại, thử đọc bằng UTF-16...")
        df = pd.read_csv(path, skipinitialspace=True, encoding='utf-16')
        print("✅ Đọc CSV bằng UTF-16 thành công.")
        return df


def _validate_users_df(df: pd.DataFrame) -> pd.DataFrame:
    required_columns = {'id', 'name'}
    missing = required_columns - set(df.columns.str.lower())
    if missing:
        raise ValueError(f"Thiếu cột bắt buộc trong users.csv: {', '.join(missing)}")

    normalized = {col: col.lower() for col in df.columns}
    df = df.rename(columns=normalized)

    has_sex = 'sex' in df.columns
    has_group = 'group' in df.columns
    if not has_sex and not has_group:
        raise ValueError("Cần có chí ít một cột 'sex' hoặc 'group'.")

    # Chuẩn hóa tên cột về chữ thường để tránh lỗi viết hoa/thường.
    if df['id'].isnull().any():
        raise ValueError("Cột 'id' không được để trống.")

    df['id'] = df['id'].astype(int)
    if df['id'].duplicated().any():
        dup_ids = df.loc[df['id'].duplicated(), 'id'].tolist()
        raise ValueError(f"ID bị trùng lặp: {dup_ids}")

    df['name'] = df['name'].fillna('').astype(str).str.strip()
    if has_sex:
        df['sex'] = df['sex'].fillna('Unknown').astype(str)
    if has_group:
        df['group'] = df['group'].fillna('Unknown').astype(str)

    return df


def _extract_traits_from_df(df: pd.DataFrame) -> pd.DataFrame:
    """Trích xuất traits từ CSV nếu có, ngược lại random như cũ."""
    # Tìm các cột trait (trait1, trait2, ... hoặc bắt đầu bằng 'trait')
    trait_columns = [col for col in df.columns if col.lower().startswith('trait')]
    
    if len(trait_columns) >= 10:
        # CSV có sẵn traits - sử dụng chúng
        print(f"✅ Phát hiện {len(trait_columns)} cột traits trong CSV, sử dụng dữ liệu có sẵn.")
        
        # Tạo cột 'traits' từ các cột trait
        def extract_row_traits(row):
            traits = []
            for col in trait_columns[:10]:  # Lấy tối đa 10 traits đầu
                trait = str(row[col]).strip()
                if trait and trait.lower() != 'nan':
                    traits.append(trait)
            return traits
        
        df['traits'] = df.apply(extract_row_traits, axis=1)
        
        # Kiểm tra và log
        empty_traits = df['traits'].apply(len) == 0
        if empty_traits.any():
            print(f"⚠️ Cảnh báo: {empty_traits.sum()} người không có traits.")
            
    else:
        # CSV không có traits - random như cũ
        print(f"⚠️ Không tìm thấy đủ 10 cột traits trong CSV. Sẽ random {NUM_TRAITS_PER_USER} traits cho mỗi người.")
        df['traits'] = df['id'].apply(_deterministic_traits)
    
    return df


def _deterministic_traits(user_id: int) -> list:
    """Sinh danh sách traits cố định dựa trên user_id để dễ tái lập kết quả."""
    rng = random.Random(user_id)
    return rng.sample(TRAIT_POOL, NUM_TRAITS_PER_USER)


def create_json_advanced():
    try:
        df = _read_users_csv()
        df = _validate_users_df(df)
        df = _extract_traits_from_df(df)  # Trích xuất traits từ CSV hoặc random
        print(f"--- Đã đọc {len(df)} users hợp lệ từ file CSV ---")

        nodes = []

        for _, row in df.iterrows():
            user_id = int(row['id'])
            user_name = row['name'] or f"User {user_id}"
            sex = row.get('sex') or row.get('group') or 'Unknown'

            # Sử dụng traits đã được xử lý
            my_traits = row['traits']
            display_traits = ", ".join(my_traits)
            image_url = f"https://i.pravatar.cc/150?u={user_id}"

            node = {
                "id": user_id,
                "label": str(user_name),
                "sex": str(sex),
                "image": image_url,
                "shape": "circularImage",
                "traits": my_traits,
                "display_traits": display_traits,
                "title": f"Tên: {user_name}\nGiới tính: {sex}\n\nSở thích:\n- " + "\n- ".join(my_traits),
                "value": 20
            }
            nodes.append(node)

        print(f"--- Đang so khớp (Mỗi người {NUM_TRAITS_PER_USER} tính cách, cần trùng >= {MIN_SHARED_TRAITS}) ---")

        trait_to_users = defaultdict(list)
        shared_traits = defaultdict(set)

        for node in nodes:
            user_id = node['id']
            for trait in node['traits']:
                for other_id in trait_to_users[trait]:
                    key = tuple(sorted((user_id, other_id)))
                    shared_traits[key].add(trait)
                trait_to_users[trait].append(user_id)

        edges = []
        for (user_a, user_b), traits in shared_traits.items():
            if len(traits) >= MIN_SHARED_TRAITS:
                trait_list = ', '.join(sorted(traits))
                edges.append({
                    "from": user_a,
                    "to": user_b,
                    "title": f"Chung {len(traits)} điểm: {trait_list}"
                })

        final_data = {"nodes": nodes, "edges": edges}
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=4)

        print("------------------------------------------------")
        print(f"✅ XONG! Đã tạo {len(edges)} kết nối.")
        if nodes:
            avg_friends = round(len(edges) * 2 / len(nodes), 1)
            print(f"📊 Trung bình mỗi người có: {avg_friends} bạn bè.")
        if not edges:
            print("⚠️ CẢNH BÁO: Không có kết nối nào! Hãy giảm 'MIN_SHARED_TRAITS' xuống 3.")

    except Exception as e:
        print(f"❌ Lỗi: {e}")


if __name__ == "__main__":
    create_json_advanced()