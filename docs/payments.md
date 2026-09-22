# Chi tiết các cổng thanh toán (theo trạng thái thực tế trong code, không theo tài liệu/README)

| Cổng | Trạng thái thực tế | Nơi implement | Vấn đề chính |
|---|---|---|---|
| **VietQR (chuyển khoản ngân hàng)** | Đang dùng cho luồng #1 chính | `front: src/components/vietqr.tsx`, `back: /payments/generate-session` + `/verify-session` | Không xác minh giao dịch thật — user tự bấm "đã trả", admin xác nhận tay qua email. Nghi ngờ bug amount trong URL QR (chuỗi đã format thay vì số nguyên). |
| **PayPal.me (link cá nhân)** | Đang dùng cho luồng #1 chính | `front: src/components/paypal/paypal-me.tsx` | Cùng cơ chế tự khai + admin xác nhận tay, không qua PayPal API thật nào để verify. |
| **PayPal Orders API (chuẩn)** | **Đã code đầy đủ ở cả 2 phía nhưng KHÔNG được dùng** | `back: POST /payments/orders`, `/capture`; `front: src/components/paypal/paypal.tsx` + `checkout-paypal.tsx` | Component frontend tồn tại, implement đúng `createOrder/onApprove`, nhưng không được import vào page nào → dead code. Đây là luồng "đúng nhất" về mặt an ninh (PayPal server xác nhận thật) nhưng bị bỏ không dùng. |
| **Sepay (cổng thanh toán VN, có IPN)** | **Backend có, frontend KHÔNG gọi** | `back: POST /payments/sepay/checkout`, `/sepay/ipn`, `/sepay/webhook`; `front: src/services/payment.tsx` (`sepayCheckout`, không ai gọi) | Có sẵn idempotency tốt nhất (dedup theo `order_invoice_number`) nhưng UI không dùng. `verifySignature` (HMAC) có code nhưng không được gọi ở webhook/IPN handler — chỉ check header tĩnh, không verify chữ ký theo payload → dễ giả mạo nếu header bị lộ. |
| **PayOS** | **Chưa hoạt động** — dead code | `back: src/payments/payos.service.ts` | Khởi tạo với credential rỗng `new PayOS('', '', '')`, không đăng ký vào `payments.module.ts`, không có biến env nào. Có trong `package.json`/README nhưng chưa từng chạy được. |

## Kết luận về cổng thanh toán đang thực sự vận hành course chính

**Không có cổng thanh toán tự động nào đang hoạt động cho việc bán course chính của platform.** Toàn bộ quy trình là: khách tự khai đã chuyển khoản/PayPal.me → gửi email cho admin → admin tự kiểm tra sao kê → admin bấm link xác nhận tay. Nếu đây là chủ đích (mô hình thủ công tạm thời) thì không sao, nhưng nếu không phải chủ đích thì đây là rủi ro lớn nhất của toàn hệ thống (ai cũng có thể tự "hoàn tất" đơn hàng mà không cần trả tiền — xem `open-questions.md` #1–#3).

## Vấn đề tiền tệ/giá xuyên suốt hệ thống

- Backend: `Course.price` không có cột currency đi kèm, PayPal path coi là USD, Sepay path nhân với tỉ giá hardcode `26000` để ra VND.
- Frontend: tỉ giá `26000` lặp lại độc lập ở 3 file khác nhau (`email-client-param.tsx`, `buy-course/page.tsx`, `tool-store-constants.ts`) — không có nguồn chung, dễ lệch khi tỉ giá thực thay đổi.
- Admin: form tạo course chỉ có 1 field `price` số, không chọn currency.

→ Nếu dự định bán đa tiền tệ hoặc cần tỉ giá chính xác theo thời gian thực, đây là phần cần thiết kế lại từ đầu, không phải sửa nhỏ.
