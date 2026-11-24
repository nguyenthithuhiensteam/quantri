# Rèn Tứ Thư Lãnh Đạo

Ứng dụng web giúp tự rèn kỹ năng **lãnh đạo – quản trị** dựa trên bộ *Tứ thư lãnh đạo* của tác giả Hòa Nhân. Cách học trong app áp dụng *Phương pháp học Simon*.

## Nội dung

| Cuốn | Chủ đề |
|---|---|
| 🧭 Thuật lãnh đạo | Mục tiêu, hành động, tự tin, kiềm chế, quyết sách, thời cơ, thời gian, học tập… |
| 🗣️ Thuật dụng ngôn | Hội nghị, thuyết phục, phê bình, khích lệ, diễn thuyết, lắng nghe, đàm phán… |
| 🤝 Thuật xử thế | Giao tiếp, uy tín, lễ nghi, cấp trên, cấp dưới, đồng nghiệp, khách hàng… |
| 🏛️ Thuật quản trị | Nhìn người, dùng người, đề bạt, tín nhiệm, trao quyền, thưởng phạt, hợp tác… |

Mỗi cuốn có 16 chương, tổng cộng 64 chương. Mỗi chương gồm:

- 3 ý chính
- 1 câu trích
- Dàn ý các mục trong sách
- 1 tình huống quản trị có phân tích
- 3 thẻ ôn tập
- 1 thử thách áp dụng

## Tính năng

- **Hôm nay**: bài học tiếp theo, thẻ cần ôn, thử thách mỗi ngày, đồng hồ Pomodoro 25/5 và chuỗi ngày học liên tiếp.
- **Bài học**: mỗi chương học theo 4 bước: đọc ý chính → tự giải thích lại (Feynman) → luyện tình huống → hoàn thành.
- **Ôn thẻ**: lặp lại ngắt quãng sau 1, 2, 4, 7 và 15 ngày, theo đường cong quên lãng trong sách Simon.
- **Tình huống**: 64 tình huống. Thứ tự các phương án được xáo trộn mỗi lần làm.
- **Nhật ký**: ghi chép theo kiểu Cornell (từ khóa, ghi chép, tóm tắt).
- **Tiến độ**: lịch 35 ngày gần nhất và tiến độ theo từng cuốn. Có nút sao lưu và khôi phục dữ liệu (tệp JSON).

- **Tài khoản & đồng bộ** (tùy chọn): đăng nhập bằng email/mật khẩu hoặc Google, tiến độ tự đồng bộ giữa các thiết bị qua Firebase. Có nút đăng xuất và xóa tài khoản.

Khi chưa cấu hình Firebase, app chạy ở chế độ lưu trên trình duyệt (localStorage).

## Bật tài khoản & đồng bộ (Firebase, gói Spark miễn phí)

1. Tạo dự án tại https://console.firebase.google.com.
2. **Authentication → Sign-in method**: bật *Email/Password* (và *Google* nếu muốn).
3. **Authentication → Settings → Authorized domains**: thêm `nguyenthithuhiensteam.github.io`.
4. **Firestore Database → Create database** (chế độ production), rồi vào tab **Rules**, dán nội dung tệp `firestore.rules` và bấm **Publish**.
5. **Project settings → Your apps → Web (</>)**: đăng ký app, sao chép đối tượng `firebaseConfig` vào tệp `firebase-config.js`.

## Cách mở

- **Trên máy tính**: tải kho về và mở tệp `index.html` bằng trình duyệt.
- **Trên điện thoại**: bật GitHub Pages cho kho (Settings → Pages → Deploy from a branch → `main` / root), rồi mở đường link GitHub cấp. Trên điện thoại, chọn "Thêm vào màn hình chính" để dùng như một app.

## Cấu trúc

```
index.html, styles.css, app.js
sync.js, firebase-config.js, firestore.rules              – tài khoản & đồng bộ
data/lanh-dao.js, dung-ngon.js, xu-the.js, quan-tri.js   – nội dung 64 chương
data/simon.js                                            – nguyên tắc học Simon
```

Nội dung bài học là phần tóm lược, diễn giải lại để tự ôn luyện, kèm một câu trích ngắn ở mỗi chương. Kho không chứa sách gốc. Hãy đọc sách gốc để hiểu đầy đủ.
