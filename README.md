# 🕸️ Social Network Graph Simulator

Dự án tái tạo mạng lưới xã hội để phân tích các kết nối, thuật toán tìm KOL và đường đi ngắn nhất dựa trên dữ liệu CSV và Vis.js.

## 🧱 Cấu trúc & Luồng dữ liệu

1. **`users.csv`** (hoặc `users_with_traits.csv`). Chuẩn hóa gồm `id`, `name`, `sex`. Script backend sẽ dùng cột `sex` để hiển thị và xác định hành vi seed trait; nếu cần lưu thêm `group` cũ thì giữ như metadata nhưng không bắt buộc.
2. **`process_data.py`**: đọc CSV, trích `traits`, so khớp theo `MIN_SHARED_TRAITS` (mặc định 4) để tạo `nodes` và `edges`, xuất `data.json`.
3. **`main.js` + `index.html` + `style.css`**: Frontend (Vis.js) đọc `data.json`, render mạng xã hội, hỗ trợ highlight BFS, degree centrality, sidebar thông tin người dùng, glow path và reset.

## 🛠️ Scripts chính

### 1. `generate_traits_csv.py`
```bash
python generate_traits_csv.py --input users.csv --output users_with_traits.csv
```
Tạo `users_with_traits.csv` mới với 200 records và 10 traits mỗi người dựa trên kho `TRAIT_POOL`. Dùng seed kéo từ `sex + id` nên luôn tái lập được cùng tập traits.

### 2. `process_data.py`
```bash
python process_data.py
```
Hoạt động với CSV hiện tại (mặc định `users.csv`). Ứng với `users_with_traits.csv` mới, hàm `_extract_traits_from_df()` sẽ phát hiện các cột `trait*` và dùng chúng luôn, không cần random nữa.

### 3. Frontend
Mở `index.html` trong trình duyệt (hoặc dùng `python -m http.server`) để xem đồ thị. Các chức năng:
- Chọn thuật toán: `none`, `influence` (degree centrality) hoặc `path` (BFS) với glow path/border.
- Input slider + số lượng người mới (slide/input number) cùng control run/reset.
- Sidebar hiển thị traits, weak connections.
Frontend không auto-zoom khi click node và luôn giữ trạng thái graph bình thường.

## ⚙️ Cấu hình quan trọng
- `NUM_TRAITS_PER_USER` `= 10`: theo mặc định.
- `MIN_SHARED_TRAITS` `= 4`: threshold để tạo cạnh; giảm nếu ít kết nối.
- `TRAIT_POOL`: bộ trait dùng để random trường hợp CSV không cung cấp.
- Vis.js options trong `main.js` (physics, hide edges, overlay) đã tối ưu cho tối đa 200 nodes.

## 🧪 Quy trình làm việc

1. Chạy `generate_traits_csv.py` nếu muốn data có traits rõ ràng (nhớ đặt `users_with_traits.csv`).
2. Chạy `process_data.py` để rebuild `data.json`.
3. Mở `index.html` để hiển thị graph, thử slider, chọn thuật toán.

Nếu cần nhiều dataset khác nhau, nhân đôi `users.csv` rồi thay input/trait columns thích hợp, script backend sẽ vẫn chạy.