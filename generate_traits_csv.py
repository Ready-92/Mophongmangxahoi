import csv
import random
from pathlib import Path

TRAIT_POOL = [
    "Hài hước", "Trầm tính", "Hướng nội", "Hướng ngoại", "Thẳng thắn", "Nhạy cảm",
    "Lãng mạn", "Thực tế", "Kỹ tính", "Hòa đồng", "Sáng tạo", "Lạnh lùng",
    "Thích Code", "Thích Game", "Mê Anime", "Yêu Mèo", "Yêu Chó", "Thích Gym",
    "Bóng đá", "Cầu lông", "Bơi lội", "Chạy bộ", "Leo núi", "Đạp xe",
    "Nghiện Trà sữa", "Mê Cà phê", "Team Bún đậu", "Team Phở", "Thích Đồ nướng",
    "Ăn chay", "Thích Đồ ngọt", "Ghét Hành",
    "Nhạc Pop", "Nhạc Rock", "Nhạc Indie", "Thích Rap", "Nhạc Bolero",
    "Thích Du lịch", "Thích Ngủ", "Mọt sách", "Xem phim Hàn", "Hóng drama",
    "Chụp ảnh", "Vẽ tranh", "Nấu ăn",
    "Dùng iPhone", "Dùng Android", "Team Windows", "Team Mac", "Thích AI",
    "Thích Chứng khoán", "Thích Tiền ảo"
]
TRAITS_PER_USER = 10


def pick_traits_for_user(user_id: int, group: str) -> list:
    seed = f"{group}-{user_id}"
    rng = random.Random(seed)
    return rng.sample(TRAIT_POOL, TRAITS_PER_USER)


def enrich_users_csv(input_path: Path, output_path: Path) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_path}")

    with input_path.open(newline='', encoding='utf-8-sig') as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)

    if not rows:
        raise ValueError("Input CSV không có dòng nào để xử lý.")

    fieldnames = reader.fieldnames or []
    trait_columns = [name for name in fieldnames if name.lower().startswith('trait')]
    if len(trait_columns) >= TRAITS_PER_USER:
        print("CSV đã có sẵn trait columns, giữ nguyên và không ghi đè.")
        return

    trait_headers = [f"trait{i+1}" for i in range(TRAITS_PER_USER)]
    output_fieldnames = fieldnames + trait_headers

    with output_path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=output_fieldnames)
        writer.writeheader()
        for row in rows:
            try:
                user_id = int(row.get('id', '').strip())
            except ValueError:
                raise ValueError("ID không hợp lệ, cần là số nguyên.")
            group = row.get('group', '').strip() or 'Unknown'
            traits = pick_traits_for_user(user_id, group)
            for idx, trait in enumerate(traits):
                row[trait_headers[idx]] = trait
            writer.writerow(row)

    print(f"✅ Đã tạo {output_path.name} với {len(rows)} bản ghi và {TRAITS_PER_USER} traits mỗi người.")


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="Tạo CSV có sẵn traits dựa trên users.csv.")
    parser.add_argument('--input', '-i', default='users.csv', help='File users nguồn (id,name,group).')
    parser.add_argument('--output', '-o', default='users_with_traits.csv', help='File CSV đầu ra có thêm traits.')
    args = parser.parse_args()

    enrich_users_csv(Path(args.input), Path(args.output))
