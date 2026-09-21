# Data model — entity liên quan tới bán course

Nguồn: `udemy_practice_back/src/**/entities/*.entity.ts`. Chỉ liệt kê field/relation liên quan tới bán hàng, không liệt kê field nội dung (video/question).

```mermaid
erDiagram
  Organization ||--o{ Course : "1:M"
  Course ||--o{ CourseSet : "1:M (bộ đề, không phải cart)"
  Course ||--o{ UserCourse : "1:M"
  User ||--o{ UserCourse : "1:M"
  User ||--o{ UserPremium : "1:M (sản phẩm khác)"
  CategoryCourse -.-o Course : "KHÔNG có FK — chỉ liên kết qua chuỗi tên"
```

## `Course`
- `id`, `name`, `slug` (unique), `description`, `content`, `thumbnailImageUrl`
- `price: numeric(10,2)` — **nullable**, không có `currency` đi kèm
- `type: string` — thực tế dùng `'free' | 'paid'`, không có DB enum/check constraint
- `status: string` — thực tế dùng `'active'`/khác, không có DB enum
- `categoryName: string` — **chuỗi tự do, không FK** tới `CategoryCourse`
- Quan hệ: `organization` (M:1), `courseSets` (1:M), `userCourses` (1:M), `courseSessions` (1:M — nội dung video, ngoài phạm vi)

## `UserCourse` — đóng vai trò "order/enrollment record"
- `userId`, `courseId`
- `status: 'pending' | 'completed' | 'failed'` — TS union nhưng cột DB là `varchar` thường, không enum/check constraint
- `orderId` — id đơn hàng phía cổng thanh toán
- `orderData` — **JSON thô** trả về từ cổng thanh toán (nơi duy nhất chứa số tiền thực tế đã trả, nếu có)
- `orderBy: string` — tên cổng (`'paypal'`, `'vietqr'`...)
- **Không có** cột `amount`/`price`/`currency` chuẩn hoá riêng — muốn biết đã thu bao nhiêu tiền phải tự parse `orderData`.

## `CategoryCourse`
- `id`, `name`, `description`
- Có CRUD admin đầy đủ (`categories.course.admin.controller.ts`) nhưng **đứng độc lập, không FK từ `Course`** → dữ liệu category ở admin và category gán trên course có thể lệch nhau (sai chính tả, khác hoa/thường...).

## `Organization`
- `id`, `name`, `slug`, `description`, `thumbnailImageUrl`
- 1:M với `Course` — dùng để nhóm course theo "nhà cung cấp"/đơn vị ra đề, filter ở catalog.

## `Payment`, `PaymentAccount`
- **Class rỗng** (`export class Payment {}`), không có decorator `@Entity`, không map ra bảng DB thật. Chỉ còn lại như tên gợi nhớ, không lưu trữ gì.

## `TBTransaction` (bảng `tb_transactions`)
- Sổ cái giao dịch ngân hàng thô do Sepay webhook đẩy vào (gateway, số tiền vào/ra, số dư luỹ kế, số tham chiếu).
- **Độc lập hoàn toàn với `Course`/`UserCourse`** — không có FK nối 2 phía, và **không có cơ chế dedup** khi webhook gọi lại (retry) → có thể bị insert trùng dòng.

## `UserPremium` (sản phẩm khác — bán account premium bên thứ 3, không phải course)
- Cùng khuôn với `UserCourse`: `accountEmail`, `accountId`, `orderId`, `orderData`, `orderBy`, `status`.
- Nêu ở đây để không nhầm với `UserCourse` khi đọc code — 2 bảng độc lập, không liên quan tới `Course`.

## Nhận xét tổng quát về data model bán hàng

1. **Không có bảng Order/Invoice/Transaction chuẩn hoá** — `UserCourse` gánh luôn vai trò order record, nhưng thiếu field `amount`/`currency` chuẩn, khiến việc đối soát/báo cáo doanh thu sau này sẽ phải parse JSON thô từng dòng.
2. **Không có Coupon/Discount entity** — giá là số cố định duy nhất trên `Course`.
3. **Không có Cart/Wishlist entity** — mọi luồng mua đều là 1-course-1-lần, khớp với việc frontend không có trang cart cho course chính.
4. **Category không có tính tham chiếu (referential integrity)** — rủi ro dữ liệu về lâu dài.
