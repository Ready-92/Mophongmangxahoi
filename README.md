# 🕸️ Social Network Analysis System (Hệ thống Phân tích Mạng Xã hội)

Dự án mô phỏng và phân tích mạng xã hội dựa trên lý thuyết đồ thị (Graph Theory). Hệ thống được thiết kế theo mô hình **Tách biệt dữ liệu và Hiển thị**:
* **Backend (Python):** Chịu trách nhiệm xử lý dữ liệu thô, chuẩn hóa, tính toán độ tương đồng (similarity) và tạo ra cấu trúc mạng lưới (Nodes & Edges).
* **Frontend (Web/JS):** Chịu trách nhiệm trực quan hóa (Visualization) và tương tác người dùng.

![Demo Screenshot](./demo-image.png)

## 🚀 Tính năng & Thuật toán

### 1. Xử lý dữ liệu thông minh (Python)
* **Auto-matching:** Tự động phân tích sở thích/tính cách của User từ dữ liệu CSV.
* **Logic kết bạn:** Sử dụng thuật toán so khớp tập hợp (Set Intersection). Hai người dùng chỉ trở thành "bạn bè" khi có số lượng sở thích chung vượt qua ngưỡng quy định (Threshold).

### 2. Phân tích chuyên sâu (Graph Theory)
Hệ thống tích hợp các thuật toán Toán rời rạc để trả lời các câu hỏi về mạng lưới:

* **🔍 Tìm KOL (Degree Centrality):**
    * *Nguyên lý:* Đỉnh (Node) nào có bậc (degree) cao nhất - tức là có nhiều kết nối nhất - sẽ là người có tầm ảnh hưởng lớn nhất.
    * *Ứng dụng:* Xác định người nổi tiếng, trung tâm của cộng đồng.

* **apmap 6 Bậc phân cách (Six Degrees of Separation / BFS):**
    * *Nguyên lý:* Sử dụng thuật toán **Breadth-First Search (Tìm kiếm theo chiều rộng)** để tìm đường đi ngắn nhất giữa 2 người bất kỳ.
    * *Ý nghĩa:* Chứng minh lý thuyết "Thế giới nhỏ": Mọi người trên thế giới đều có thể kết nối với nhau qua không quá 5 người trung gian.

## 🛠️ Kiến trúc Hệ thống

Dự án chia làm 2 phần rõ rệt để đảm bảo tính logic và hiệu năng:

### Backend (Xử lý Logic)
* **Ngôn ngữ:** Python 3.
* **Thư viện:** Pandas (xử lý CSV), Random (giả lập dữ liệu thiếu).
* **Nhiệm vụ:** Đọc `users.csv` -> Tính toán Logic kết nối -> Xuất ra `data.json`.

### Frontend (Hiển thị)
* **Ngôn ngữ:** HTML5, CSS3, JavaScript.
* **Thư viện:** Vis.js (Render đồ thị).
* **Nhiệm vụ:** Đọc `data.json` -> Vẽ đồ thị -> Xử lý sự kiện click/zoom.

## 📂 Cấu trúc thư mục

```text
├── users.csv          # [INPUT] Dữ liệu nguồn (Danh sách người dùng & Tính cách)
├── process_data.py    # [BACKEND] Python Script: Xử lý logic, tính toán edges
├── data.json          # [DATABASE] File trung gian chứa cấu trúc đồ thị chuẩn
├── index.html         # [FRONTEND] Giao diện chính
├── style.css          # [UI] Giao diện tối (Dark mode)
├── main.js            # [LOGIC UI] Điều khiển thư viện vẽ hình & tương tác
└── README.md          # Tài liệu báo cáo
