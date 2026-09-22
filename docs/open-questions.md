# Cần bạn xác nhận / giải thích

Xếp theo mức độ nghiêm trọng. Nhóm 0 là **blocker hạ tầng** đã xử lý xong. Nhóm 1 là **an ninh** — đã verify bằng API thật, KHÔNG còn là nghi vấn. Nhóm 2–3 là thiếu tính năng/không rõ ràng.

## Nhóm 0 — Blocker: DB dev local lệch migration — ĐÃ FIX (2026-08-10)

**Đã xử lý:** Chạy `npm run migration:run` trên DB dev local (`nestjs` trong container `postgres`) theo xác nhận của bạn. Cả 4 migration còn thiếu đã áp dụng thành công (`ChangePriceTypeCourse`, `AddTBTransaction`, `UpdateNameTable`, `UpdateTableCourseSetAndUdemyQuestionBank` — bảng migrations giờ dừng đúng ở id 12). Verify lại: `GET /courses` → 200 OK, `POST /authentication/register` → 201 OK. Không còn lỗi cột camelCase/snake_case.

**Cần bạn xác nhận thêm 1 việc liên quan:** môi trường staging/production hiện tại đã chạy đủ 12 migration này chưa? Nếu production đang lệch giống DB dev vừa rồi thì đây là sự cố đang treo thật, không phải chỉ ở máy dev.

**Phát hiện phụ trong lúc verify — `.env` hiện tại thiếu biến bắt buộc, app không boot được ở dạng build `node dist/main.js`:** Joi schema trong `src/app.module.ts` yêu cầu `SITE_URL`, `SEPAY_ENV`, `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY`, `SEPAY_CURRENCY`, `SEPAY_WEBHOOK_SECRET_KEY`, `SEPAY_IPN_SECRET_KEY` — nhưng file `.env` hiện tại trong repo **không có biến nào trong nhóm này**. Test bằng `node dist/main.js` với `.env` gốc → crash ngay lúc boot (`Config validation error: "SITE_URL" is required...`). Tôi phải tự set tạm các biến này qua shell (không sửa file `.env`) để verify tiếp. **Cần bạn xác nhận**: các biến Sepay/SITE_URL này có đang được set ở nơi khác khi deploy thật (biến môi trường server, secret manager...) không, hay `.env` trong repo đang thiếu sót thật? Nếu là thiếu sót thật, nên bổ sung vào `.env.example` ít nhất, để dev mới không bị crash khi mới clone repo.

## Nhóm 1 — Lỗ hổng cho phép lấy course mà không trả tiền (nghiêm trọng)

1. **`POST /user-courses` (back, `src/user-courses/user-courses.controller.ts:46-49`) cho phép user tự tạo bản ghi sở hữu course với `status` VÀ `userId` tự chọn.**
   **✅ ĐÃ VERIFY BẰNG API THẬT (2026-08-10), CONFIRMED — không còn là nghi vấn đọc code, là exploit tái hiện được:**
   - Tạo 2 user test qua `/authentication/register`: User A (id=2) và User B (id=3).
   - Đăng nhập User A, gọi `POST /user-courses` với body `{"userId":2,"courseId":1,"status":"completed","orderBy":"self-test-exploit","orderId":"EXPLOIT-1","orderData":"{}"}` (course id=1 là course `type: "paid"` thật trong DB, tên "Javascript") → **201 Created**, `status: "completed"`.
   - Gọi lại `GET /user-courses/by-user-id` bằng token User A → course đó **xuất hiện trong danh sách course đã sở hữu**. Tức là User A tự cấp cho mình quyền truy cập 1 course trả phí mà không hề thanh toán, không qua bất kỳ cổng thanh toán nào.
   - Test thêm phần "tự chọn `userId` bất kỳ": vẫn dùng token User A, gọi `POST /user-courses` với `"userId":3` (id của User B, không phải id của chính mình) và `status:"completed"` → **201 Created** — sau đó **đăng nhập bằng token User B và gọi `GET /user-courses/by-user-id` thấy course đó xuất hiện trong danh sách của User B**. Xác nhận: một user bất kỳ có thể tự ý cấy bản ghi "đã mua course" vào tài khoản của NGƯỜI KHÁC, không chỉ tài khoản của chính mình.
   - Đã dọn dữ liệu test (xoá 2 bản ghi `user_course` vừa tạo). 2 tài khoản test còn sót lại trong DB dev: `migration-check@example.com` (id 2) và `audit-userB@example.com` (id 3) — mật khẩu `Test1234!`, bạn có thể xoá nếu muốn dọn DB.
   → **Cần bạn xác nhận**: đây có phải bug không, hay có tầng kiểm soát nào khác (ví dụ chỉ FE gọi endpoint này theo cách an toàn, endpoint để dành cho mục đích nội bộ khác) mà tôi chưa thấy?

2. **`GET /payments/generate-session` và `POST /payments/verify-session` (back) không có guard, và `verify-session` set `status='completed'` mà không kiểm tra lại với cổng thanh toán nào.**
   **Đã xác nhận với bạn (2026-08-10): đây LÀ CHỦ ĐÍCH THIẾT KẾ** — mô hình "khách tự khai đã chuyển khoản/PayPal.me, admin xác nhận tay qua email" là quy trình bạn chọn dùng, không phải bug.
   Ghi chú rủi ro đi kèm (biết để chủ động, không phải yêu cầu sửa): vì endpoint không có guard, về mặt kỹ thuật ai có được `sessionId` (JWT tự ký, gửi qua email cho admin) đều có thể tự gọi `verify-session` mà không cần là admin — nếu link email này từng bị lộ (forward nhầm, log server, proxy cache...) thì người ngoài có thể tự hoàn tất đơn hàng của chính họ mà admin chưa thực sự xác nhận đã nhận tiền. Rủi ro thấp trong vận hành bình thường (link random, JWT ký bằng secret, chỉ gửi qua email) nhưng nên biết trước khi mở rộng quy mô.

3. **`PATCH /user-courses/:id` và `DELETE /user-courses/:id` không kiểm tra ownership** — `update()`/`remove()` (`src/user-courses/user-courses.controller.ts:151-171`) chỉ nhận `@Param('id')`, hoàn toàn không dùng `@Req() req: RequestWithUser`.
   **✅ ĐÃ VERIFY BẰNG API THẬT (2026-08-10), CONFIRMED:** Dùng token User A tạo 1 bản ghi enrollment (id=1, thuộc về User A). Đăng nhập bằng token **User B** (một tài khoản hoàn toàn khác), gọi `DELETE /user-courses/1` → **200 OK, `"User course deleted successfully"`**. Kiểm tra lại bằng token User A: danh sách course đã mua **về 0**, bản ghi đã bị User B xoá thành công. Xác nhận: bất kỳ user đã đăng nhập nào cũng xoá được record sở hữu course của người khác nếu biết/đoán được id (id là số nguyên tăng dần từ 1 — rất dễ đoán, có thể duyệt tuần tự 1,2,3... để xoá quyền truy cập của toàn bộ user khác trên hệ thống).
   Đây là lỗ hổng nặng nhất trong số các lỗ hổng đã tìm — không chỉ "mất tiền" (mục #1) mà còn cho phép **phá hoại**: ai đó có thể âm thầm xoá quyền truy cập course đã mua của người khác.

4. **`POST /payments/orders` (tạo PayPal order) nhận `price` trực tiếp từ client, không so khớp với `course.price` trong DB** — về lý thuyết client có thể yêu cầu PayPal charge một số tiền khác giá thật (dù PayPal vẫn charge đúng số đó nên thiệt hại là ngược — trả ít hơn giá course).

**Nếu các mục 1–4 không phải chủ đích**, đây là việc nên vá trước tiên vì ảnh hưởng trực tiếp tới doanh thu thực tế.

## Nhóm 2 — Tính năng bán hàng bị thiếu hoàn toàn (cần bạn xác nhận có nằm trong roadmap không)

5. **Không có trang quản lý đơn hàng/doanh thu ở admin** — chỉ có bảng "User Courses" (enrollment), không thấy số tiền đã thu, không có báo cáo doanh thu, dashboard admin là placeholder rỗng.
6. **Không có coupon/mã giảm giá** ở cả 3 repo.
7. **Không có quản lý category dạng danh sách chuẩn** ở admin (dù có model + API) — category trên course là text tự do.
8. **Không có refund logic** ở đâu trong hệ thống.
9. **Upload ảnh thumbnail ở admin không hoạt động** (logic bị comment out) — admin hiện phải tự có URL ảnh sẵn từ nơi khác rồi dán vào form.

→ Đây có phải các phần **chưa làm tới** (đang trong roadmap) hay là **cố ý bỏ** vì dùng quy trình thủ công ngoài hệ thống (Excel, Zalo, email...)? Nếu bạn xác nhận, tôi có thể ưu tiên giúp bạn lên kế hoạch xây các phần này.

## Nhóm 3 — Không rõ ràng / nghi ngờ bug kỹ thuật (mức độ thấp hơn, nên xác minh)

10. **Nghi ngờ bug**: URL VietQR ở trang course chính (`front/src/components/vietqr.tsx`) nhúng amount dưới dạng chuỗi đã format tiền tệ (`"780.000 ₫"`) thay vì số nguyên — khác với cách làm ở `/buy-course/page.tsx` (dùng số nguyên đúng). Có thể khiến QR code hiển thị sai số tiền cần chuyển. **Bạn có thể xác nhận giúp bằng cách thử tạo 1 QR thật và soi amount hiển thị không?**
11. **Tỉ giá USD→VND hardcode `26000`** ở 3 nơi khác nhau trong front + back, không có nguồn chung, không tự cập nhật theo tỉ giá thực. Có cần tôi gom về 1 config chung không?
12. **PayOS được khai báo trong package.json/README nhưng chưa từng hoạt động** (credential rỗng, chưa đăng ký module). Bạn có định dùng PayOS thật không, hay bỏ luôn khỏi dependency cho gọn?
13. **Sepay có sẵn ở backend (kể cả IPN, dedup tốt) nhưng frontend không có UI gọi tới** — chỉ VietQR tĩnh + PayPal.me đang được dùng thực tế. Có định bật Sepay checkout thật lên UI không?
14. **Biến env khả năng bị lệch tên**: `front/src/lib/session.ts` đọc `process.env.SESSION_SECRET`, nhưng `.env` đang checked-in có `NEXT_PUBLIC_SESSION_SECRET`. Nếu đúng vậy ở production, session verify có thể luôn fail âm thầm. Cần kiểm tra lại file `.env` thật đang deploy (không phải file trong repo) để xác nhận biến nào mới đúng.
15. **`src/lib/config.ts` (front) require `NEXT_PUBLIC_BUY_COURSE` là URL bắt buộc, nhưng `.env` trong repo không có biến này** — nếu đúng vậy, app sẽ crash lúc build/start trừ khi có `.env` khác (không có trong repo) đang được dùng thật. Bạn xác nhận giúp file `.env` nào là "thật" đang chạy production?
16. **3 "sản phẩm" bán hàng khác nhau dùng chung nhiều component UI** (course chính / mua hộ course Udemy / bán license tool) — không sai, nhưng dễ gây nhầm lẫn khi sửa code (sửa 1 chỗ tưởng ảnh hưởng course chính nhưng thực ra là sản phẩm khác). Bạn có muốn tách rõ 3 luồng này ra thành module riêng biệt hơn không, hay giữ nguyên vì đang hoạt động ổn?
17. **Field `isShown` trên nội dung course** (admin) — tôi suy đoán đây có thể là cờ "cho xem trước miễn phí" nhưng không có tài liệu/comment xác nhận ý định gốc. Bạn xác nhận giúp ý nghĩa đúng của field này?

---

Bạn muốn tôi ưu tiên xử lý mục nào trước? Gợi ý của tôi: xác nhận Nhóm 1 trước (vì liên quan trực tiếp tới việc mất tiền thật), sau đó mới quyết định có build thêm Nhóm 2 hay không.
