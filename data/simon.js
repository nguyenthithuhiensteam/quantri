// Nguyên tắc học lấy từ "Phương pháp học Simon" (Hữu Vinh Phương Lược), dùng để thiết kế cách học trong app.
window.SIMON = {
  // Mốc ôn tập theo đường cong quên lãng (sách mục 4.3 Thẻ nhớ): 1, 2, 4, 7, 15 ngày.
  intervals: [1, 2, 4, 7, 15],
  tips: [
    { t: "Đơn vị học nhỏ nhất", d: "Mỗi ngày chỉ cần một chương: đọc ý chính, tự giải thích lại, làm một tình huống. Học từng khối nhỏ thì dễ duy trì." },
    { t: "Thẻ nhớ", d: "Ôn thẻ vào những lúc thời gian rảnh lẻ tẻ như chờ xe hay giờ nghỉ. Ôn lại sau 1, 2, 4, 7 và 15 ngày theo đường cong quên lãng." },
    { t: "Phương pháp Feynman", d: "Giải thích lại bài học bằng lời của chính bạn, như đang dạy cho người khác. Chỗ nào bạn nói chưa trôi là chỗ bạn chưa hiểu." },
    { t: "Kỹ thuật Pomodoro", d: "Học tập trung 25 phút rồi nghỉ 5 phút. Cất điện thoại ra xa để không bị xao lãng." },
    { t: "Ghi chú Cornell", d: "Chia ghi chép thành 3 phần: từ khóa/câu hỏi, nội dung ghi chép và tóm tắt ngắn. Phần tóm tắt giúp bạn nhớ lâu." },
    { t: "Mục tiêu có khởi đầu và kết thúc", d: "Đặt mục tiêu rõ ràng, ví dụ xong một cuốn trong 16 ngày, và tự thưởng khi đạt được." },
    { t: "Học thật, không học giả", d: "Đọc hiểu chưa phải là học xong. Chỉ khi bạn áp dụng được vào tình huống thật thì mới là đã học." },
    { t: "Ma trận Eisenhower", d: "Ưu tiên việc quan trọng nhưng chưa gấp, như học và rèn kỹ năng, trước khi nó trở thành việc gấp." }
  ]
};
