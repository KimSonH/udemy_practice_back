# ADR 0001 — Lưu bài làm trên server (`test_attempt`)

- **Ngày:** 2026-09-21
- **Trạng thái:** Đề xuất — chờ duyệt
- **Liên quan:** [`features/test-attempts.md`](../features/test-attempts.md)

## Bối cảnh

Toàn bộ bài làm hiện nằm trong `localStorage` của trình duyệt, key
`udemy:test-session:v1:{courseId}:{setId}` (`udemy_practice_front/src/lib/test-storage.ts`).

Bốn hệ quả đo được:

1. **Đổi máy là mất.** Không có bản sao nào ngoài trình duyệt đó.
2. **Không có lịch sử.** Mỗi cặp (khoá, bộ đề) giữ đúng **một** attempt; làm lại
   ghi đè. Nên chỉ nói được "lần gần nhất", không nói được "cao nhất" hay
   "tiến bộ thế nào".
3. **Không có cái nhìn xuyên khoá.** `/my-courses` chỉ là danh sách card, không
   một dấu vết tiến độ. Học viên phải nhớ bằng đầu mình đang dở ở đâu.
4. **`/dashboard` đang phục vụ dữ liệu giả** (`data.json` mẫu của shadcn) trên
   production.

Quyết định "chỉ dùng localStorage" trước đây là có chủ đích và đã đúng khi tính
năng làm bài còn nhỏ. Yêu cầu mới — học viên phải biết mình đang ở khoá nào,
đang dở gì — không thể phục vụ tử tế bằng dữ liệu chỉ tồn tại trên một máy.

## Quyết định

Thêm bảng **`test_attempt`** ở backend làm nguồn sự thật cho bài làm của người
đã đăng nhập.

Năm điểm chốt:

1. **Tên là `TestAttempt`, không phải `CourseSession`.** `CourseSession` đã tồn
   tại và là **video bài giảng** (`upload_url`, `course_contents`, `order`).
   Dùng lại tên đó sẽ tạo hai khái niệm "session" trong cùng codebase.
2. **Server chấm điểm.** Logic `gradeQuestion` được port sang NestJS. Client gửi
   đáp án, server trả điểm và ghi `correct_count` / `total_count`.
3. **Giữ mọi attempt**, không ghi đè. Đây là thứ localStorage không làm được và
   là lý do chính để đụng tới backend.
4. **`localStorage` vẫn là bản ghi chính *trong lúc* làm bài**, và là kho lưu duy
   nhất cho khách chưa đăng nhập. Server nhận ở ba mốc: bắt đầu, heartbeat, nộp.
5. **Chỉ lưu lên server khi đã đăng nhập.** Không import ngược dữ liệu
   `localStorage` cũ lên server.

## Các phương án đã cân nhắc

### A. Giữ nguyên localStorage, tổng hợp tiến độ ở client

Quét `localStorage`, ghép tên khoá theo id với danh sách khoá server đã trả.
Không cần backend, không migration.

**Loại** vì không giải quyết được gốc: vẫn mất khi đổi máy, vẫn không có lịch
sử nên không có "điểm cao nhất", và mọi surface tiến độ phải render sau khi
mount (localStorage không tồn tại lúc render server) — tức là lại rơi vào đúng
bẫy hydration đã gặp ở màn bắt đầu.

### B. Dùng lại `CourseSession`

**Loại.** Entity đó mô tả video bài giảng. Nhồi bài thi vào sẽ để lại một bảng
mà nửa số cột luôn null tuỳ theo hàng đó là video hay bài thi.

### C. Server là kho duy nhất, ghi mỗi khi có thay đổi

**Loại.** JWT là cookie httpOnly và `fetchApi` là `server-only`, nên client
component không gọi thẳng NestJS được — mỗi lần ghi là hai chặng qua route
handler của Next. Ghi theo nhịp 300ms như localStorage hiện tại là không khả
thi, và mất mạng giữa bài thi sẽ làm hỏng bài.

### D. Client chấm điểm rồi gửi con số lên

**Loại** (bạn đã chốt). Rẻ hơn, nhưng `correct_count` khi đó là con số do trình
duyệt khai. Mọi thứ dựng trên nó về sau — chứng chỉ, xếp hạng, báo cáo cho tổ
chức — đều vô giá trị.

## Hệ quả

**Được:**

- Bài làm sống sót qua đổi máy, đổi trình duyệt, xoá site data.
- Có lịch sử → "điểm cao nhất", "so với lần trước", đồ thị tiến bộ.
- `GET /test-attempts/progress` là dữ liệu **server-rendered**, nên `/my-courses`
  và banner "Tiếp tục" không vướng hydration.
- Điểm số đáng tin vì server chấm.

**Mất / phải trả:**

- **Hai đường lưu trữ song song** trong runner (khách: local; đã đăng nhập:
  local + server). Đây là chi phí trực tiếp của việc giữ luồng làm thử không cần
  tài khoản.
- **Hai bản logic chấm điểm** (front cho khách, back cho người đã đăng nhập).
  Phải có test chặn hai bản lệch nhau.
- **Cột `jsonb` đầu tiên** trong repo — trước nay toàn scalar.
- **Migration phải chạy trước khi deploy backend.** Đã có tiền lệ: khi
  `AddExamTimingToCourse` chưa chạy mà entity đã hot-reload, mọi query course
  trả 400.
- Bài đang dở của người dùng hiện tại **sẽ không được đưa lên server**; nó vẫn
  nằm trong trình duyệt cũ cho tới khi bị ghi đè.
