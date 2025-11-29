# 🕸️ Social Network Analysis & Visualization

Một công cụ trực quan hóa và phân tích mạng xã hội (Social Network Analysis) dựa trên nền tảng Web. Dự án sử dụng **Python** để xử lý dữ liệu thô và **Vis.js** để hiển thị đồ thị tương tác, tích hợp các thuật toán Toán rời rạc.

![Demo Screenshot](./demo-image.png)
*(Bạn hãy chụp ảnh màn hình web của bạn, lưu tên là demo-image.png và để cùng thư mục để ảnh hiện ở đây)*

## 🚀 Tính năng nổi bật

* **Trực quan hóa đồ thị:** Hiển thị mạng lưới người dùng với giao diện tương tác (kéo thả, zoom, vật lý mô phỏng).
* **Xử lý dữ liệu tự động:** Script Python tự động chuyển đổi file CSV sang JSON và tạo các kết nối ngẫu nhiên (nếu thiếu).
* **Tối ưu hiệu năng:** Thanh trượt (Slider) giúp giới hạn số lượng Node hiển thị để tránh giật lag.
* **Thuật toán Phân tích (Graph Theory):**
    * 🔍 **Tìm KOL (Degree Centrality):** Tự động phát hiện và highlight người có tầm ảnh hưởng lớn nhất (nhiều kết nối nhất).
    * apmap **Tìm đường đi ngắn nhất (BFS):** Tìm lộ trình kết nối giữa 2 người dùng bất kỳ trong mạng lưới (mô phỏng lý thuyết "6 bậc phân cách").

## 🛠️ Công nghệ sử dụng

* **Frontend:** HTML5, CSS3 (Dashboard Style), JavaScript (ES6).
* **Visualization Library:** [Vis.js Network](https://visjs.org/).
* **Backend / Data Processing:** Python 3, Pandas.
* **Data Format:** CSV (Input), JSON (Output).

## 📂 Cấu trúc thư mục

```text
├── users.csv          # Dữ liệu nguồn (Danh sách người dùng)
├── process_data.py    # Script Python xử lý data & tạo edges
├── data.json          # File dữ liệu được sinh ra cho Web đọc
├── index.html         # Giao diện chính
├── style.css          # Giao diện tối (Dark mode)
├── main.js            # Logic hiển thị & Thuật toán đồ thị
└── README.md          # Tài liệu hướng dẫn
