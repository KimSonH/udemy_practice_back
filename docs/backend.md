# Backend — `udemy_practice_back` (luồng bán course)

## Stack & cấu hình

- NestJS 11, TypeORM 0.3 (`synchronize: false`, migrations ở `src/migrations`), PostgreSQL.
  ✅ **Đã verify (2026-08-10) bằng cách chạy thật local**: DB dev từng thiếu 4 migration mới nhất (bao gồm 1 migration đổi toàn bộ tên cột sang snake_case) — đã chạy `npm run migration:run` để fix, xác nhận `GET /courses` và `POST /authentication/register` hoạt động đúng sau đó. Chi tiết: xem Nhóm 0 trong `open-questions.md`.
  ⚠️ **Phát hiện phụ**: `.env` hiện tại thiếu `SITE_URL`/`SEPAY_*` mà Joi schema (`src/app.module.ts`) bắt buộc — app không boot được ở dạng `node dist/main.js` với `.env` gốc, cần set thêm biến qua môi trường deploy. Xem Nhóm 0 trong `open-questions.md`.
- Auth: JWT qua `@nestjs/jwt` + `passport-jwt`. Swagger tại `/api`.
- SDK thanh toán trong `package.json`: `@payos/node`, `@paypal/paypal-server-sdk`, `sepay-pg-node`.
- Modules trong `src/app.module.ts`: Users, Admin, Authentication, ClassMarkers, Categories, Courses, UdemyQuestionBanks, CourseSets, Organizations, **Payments**, **UserCourses**, MassCourses, MassAccounts, UserPremium, PaymentsPremium, CourseContents, CourseSessions.
  - **Không có** module Cart, Order, Coupon/Discount, hay Transaction/Payment-record riêng — `UserCourse` đóng vai trò "order record".
- `.env.example`: có biến cho Postgres, JWT (user/admin/refresh/verify), PayPal (`PAYPAL_CLIENT_ID/SECRET`), Sepay (`SEPAY_ENV/MERCHANT_ID/SECRET_KEY/SUCCESS_URL/ERROR_URL/CANCEL_URL/PAYMENT_METHOD/CURRENCY/WEBHOOK_SECRET_KEY/IPN_SECRET_KEY`). **Không có biến PayOS nào** dù package đã cài.
- Joi schema validate env khi boot (`app.module.ts`) **bắt buộc** biến Sepay nhưng **không bắt buộc** `PAYPAL_CLIENT_ID/SECRET` → PayPal có thể misconfig âm thầm mà app vẫn start.
- CORS (`src/main.ts:30-39`) hardcode `localhost:3000`, `localhost:3001` + 2 URL Vercel — không đọc từ env.

## Entity liên quan tới bán course

Xem chi tiết quan hệ ở `data-model.md`. Tóm tắt nhanh:

| Entity | Vai trò | Điểm đáng chú ý |
|---|---|---|
| `Course` (`src/courses/entities/courses.entity.ts`) | Sản phẩm bán | `price: numeric(10,2)` nullable, `type: 'free'\|'paid'` (string tự do, không enum DB), `categoryName` là string thô — **không có FK** tới `CategoryCourse` |
| `UserCourse` (`src/user-courses/entities/user-course.entity.ts`) | **Chính là "order/enrollment record"** | `status: 'pending'\|'completed'\|'failed'` lưu dạng `varchar` không có DB enum/check constraint; **không có cột `price`/`amount`/`currency`** — số tiền thực tế chỉ nằm trong `orderData` (JSON thô từ cổng thanh toán) |
| `CategoryCourse` (`src/categories/...`) | Danh mục | Có CRUD admin đầy đủ nhưng **không liên kết FK** với `Course.categoryName` → dễ lệch dữ liệu |
| `Organization` | Nhóm "seller"/đơn vị ra đề | 1:M với `Course` |
| `Payment`, `PaymentAccount` | — | **Class rỗng, không decorate `@Entity`, không có bảng DB thật** — chỉ còn tên |
| `TBTransaction` | Sổ cái giao dịch ngân hàng thô từ Sepay webhook | Độc lập với order/course, không dedup |
| `UserPremium` | Bản ghi mua "premium account" (sản phẩm khác, không phải course) | Giống hệt cấu trúc `UserCourse` |

## Endpoint liên quan tới bán course

### Catalog (public) — `src/courses/courses.controller.ts`
`GET /courses`, `/courses/video`, `/courses/random-courses`, `/courses/random-video-courses`, `/courses/organization`, `/courses/group-by-category-name`, `/courses/group-by-organization-name`, `/courses/:id` — tất cả public, lọc `status = 'active'`.

### Enrollment / "order" — `src/user-courses/`
- `POST /user-courses` — **JWT user**, tạo `UserCourse` **trực tiếp từ body client gửi lên, kể cả field `status`** → xem cảnh báo an ninh ở `open-questions.md` (#1).
- `GET /user-courses/by-user-id`, `GET /user-courses`, `GET /user-courses/:id` — chỉ trả về bản ghi `status='completed'` của chính user → đây là "cổng kiểm tra quyền truy cập" mà frontend dùng.
- `PATCH /user-courses/:id`, `DELETE /user-courses/:id` — **không kiểm tra ownership** với `req.user.id`.
- Admin: `GET /admin/user-courses` (tìm kiếm/paginate toàn bộ), `PATCH /admin/user-courses/change-status/:id`.

### Thanh toán — `src/payments/payments.controller.ts`
| Endpoint | Guard | Mô tả |
|---|---|---|
| `POST /payments/orders` | JWT user | Tạo PayPal order; tạo `UserCourse(status='pending', orderBy='paypal')` |
| `POST /payments/orders/:orderID/capture` | JWT user | Capture PayPal; `COMPLETED` → `UserCourse.status='completed'` |
| `GET /payments/generate-session` | **Không guard** | Tạo `UserCourse(status='pending')` + trả JWT session tự ký (dùng cho luồng VietQR/PayPal.me tự khai) |
| `POST /payments/verify-session` | **Không guard** | Verify JWT rồi set `status='completed'` **không kiểm tra lại với cổng thanh toán nào** |
| `POST /payments/verify-session-success` | **Không guard** | Verify JWT, trả info user+course, không đổi status |
| `POST /payments/sepay/checkout` | JWT user | Tạo redirect Sepay hosted-checkout, giá tính từ `course.price` (DB) × tỉ giá hardcode `26000` |
| `POST /payments/sepay/webhook` | `WebhookGuard` (header tĩnh) | Ghi giao dịch ngân hàng thô vào `tb_transactions`, không liên quan tới order |
| `POST /payments/sepay/ipn` | `IpnGuard` (header tĩnh) | **Luồng fulfillment thật của Sepay**: parse `userId/courseId` từ `order_invoice_number`, dedup trước khi tạo `UserCourse(status='completed')` |

Song song: `src/payments-premium/` + `src/user-premium/` là **một sản phẩm khác** (bán account premium bên thứ 3), cùng pattern nhưng không phải course.

## Auth & phân quyền

- Hai principal hoàn toàn tách biệt: `User` (khách) và `Admin` (có field `role`), mỗi bên có JWT secret/strategy/guard riêng (`jwt.strategy.ts` vs `jwt-admin.strategy.ts`).
- `Admin.role` tồn tại nhưng **không có `RolesGuard`** — auth admin hiện tại là nhị phân (có JWT admin hay không), không phân quyền theo role.
- Nhiều endpoint bán course chỉ guard ở mức "đã đăng nhập", không check ownership (xem bảng trên).
- `src/course-contents/`, `src/course-sessions/` (phần nội dung, ngoài phạm vi chính) **không có guard nào** — nghĩa là việc "đã trả tiền chưa" chỉ được kiểm tra ở tầng `user-courses` (khi frontend chủ động gọi), chứ không có server-side gating thật sự trên chính nội dung.

## Đánh giá nhanh mức độ hoàn thiện

- **PayOS**: khai báo trong `package.json`/README nhưng code (`payos.service.ts`) khởi tạo với credential rỗng, **không đăng ký vào module nào** → dead code, chưa hoạt động.
- **Sepay `verifySignature`**: có implement HMAC nhưng **không được gọi ở đâu cả** — webhook/IPN chỉ check header tĩnh, không verify signature theo payload.
- Chi tiết đầy đủ, xếp theo mức độ nghiêm trọng: `open-questions.md`.
