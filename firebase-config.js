// Cấu hình Firebase để bật đăng nhập và đồng bộ.
// Để null thì app chạy ở chế độ lưu trên máy (không cần tài khoản).
// Cách lấy cấu hình: Firebase Console → Project settings → Your apps → Web app → "firebaseConfig".
// Đây không phải mật khẩu; dữ liệu được bảo vệ bằng quy tắc trong tệp firestore.rules.
window.FIREBASE_CONFIG = null;
/* Ví dụ sau khi điền:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "ten-du-an.firebaseapp.com",
  projectId: "ten-du-an",
  storageBucket: "ten-du-an.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
