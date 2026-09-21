# Feature: Course Resources (HTML Cheatsheets)

## Mục tiêu
Cho phép admin lưu nhiều tài liệu HTML (cheatsheet, tài liệu ôn tập...) theo từng
Course và hiển thị chúng ở Front qua URL riêng, mỗi tài liệu render biệt lập để
không rò rỉ CSS/JS ra site.

## Phạm vi
- 1 Course có **n** CourseResource.
- Mỗi resource: tiêu đề, slug, nội dung HTML thô, cờ bật/tắt hiển thị, mức truy cập.
- Admin: màn danh sách CRUD riêng cho mỗi course + textarea HTML thô + kéo-thả sắp xếp.
- Front: danh sách + trang chi tiết, render bằng `<iframe srcDoc sandbox>`.

## Mô hình dữ liệu — bảng `course_resource`
| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | serial | PK |
| course_id | int | FK -> course(id), ON DELETE CASCADE |
| title | varchar | NOT NULL |
| slug | varchar | NOT NULL, UNIQUE theo (course_id, slug) |
| html | text | NULL cho phép, mặc định rỗng |
| is_visible | boolean | NOT NULL DEFAULT false |
| access_level | varchar | NOT NULL DEFAULT 'private' — public \| logged_in \| paid \| private |
| order | int | NOT NULL DEFAULT 0 |
| created_at / updated_at | timestamp | auto |
| deleted_at | timestamp | soft delete (@Exclude) |

## Access rules (enforce ở backend)
- `is_visible = false` -> Front trả 404 (chỉ admin xem/sửa được).
- `public` -> ai cũng xem.
- `logged_in` -> cần user đăng nhập hợp lệ.
- `paid` -> user phải sở hữu course (user_course tồn tại).
- `private` -> chỉ admin (không phục vụ qua endpoint public).

## API
### Admin (`/admin/courses/:courseId/resources`, guard: JwtAdminAuthenticationGuard)
- `GET    /admin/courses/:courseId/resources` — list tất cả (kể cả ẩn).
- `POST   /admin/courses/:courseId/resources` — tạo.
- `GET    /admin/courses/:courseId/resources/:id` — chi tiết.
- `PUT    /admin/courses/:courseId/resources/:id` — cập nhật.
- `PATCH  /admin/courses/:courseId/resources/:id/visibility` — bật/tắt.
- `PATCH  /admin/courses/:courseId/resources/reorder` — sắp xếp lại.
- `DELETE /admin/courses/:courseId/resources/:id` — xóa mềm.

### Public (`/courses/:courseId/resources`, guard: JwtOptionalAuthenticationGuard)
- `GET /courses/:courseId/resources` — list resource `is_visible=true` mà user có quyền xem (không trả `html`).
- `GET /courses/:courseId/resources/:slug` — trả full resource (kèm `html`) nếu qua được access check, ngược lại 403/404.

## Render ở Front
- Route: `/courses/{id}/resources` (list) + `/courses/{id}/resources/{slug}` (detail).
- Detail render: `<iframe srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox">`.
  - Không `allow-scripts` (chặn JS), không `allow-same-origin` (cô lập origin).
  - `allow-popups` để link `target="_blank"`/`mailto:` trong tài liệu vẫn mở được.
- Không cần SEO/index cho nội dung iframe.

## Ngoài phạm vi (tương lai)
- Cột `allow_scripts` per-resource nếu về sau cần chạy JS (mặc định tắt, admin phải chủ động bật).
- Upload file .html thay cho dán thô.
