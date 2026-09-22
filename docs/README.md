# Docs — `udemy_practice_back`

Backend là nguồn sự thật duy nhất của hệ thống, nên **tài liệu xuyên hệ thống
nằm ở đây**. Hai repo còn lại chỉ giữ tài liệu mô tả chính chúng.

> Nguồn gốc: bộ docs này được tạo ngày 2026-08-10 từ việc đọc trực tiếp source
> của cả 3 repo, trọng tâm là **luồng bán course**. Luồng làm bài được bổ sung
> về sau qua các spec trong `features/`.

## Ba repo

| Repo | Vai trò | Stack |
|---|---|---|
| `udemy_practice_back` | API dùng chung cho front + admin | NestJS 11, TypeORM 0.3, PostgreSQL, JWT |
| `udemy_practice_front` | Website khách hàng | Next.js 16 App Router, React 19, next-intl (en/vi) |
| `udemy_practice_admin` | Trang quản trị | Next.js 16 App Router, React 19 |

Ba repo git độc lập, giao tiếp qua REST. Không có API gateway.

## Tài liệu hệ thống

| File | Nội dung |
|---|---|
| [`architecture.md`](./architecture.md) | Sơ đồ tổng thể, cách 3 repo kết nối, các luồng bán course chạy song song |
| [`backend.md`](./backend.md) | Module / entity / endpoint của repo này |
| [`data-model.md`](./data-model.md) | Các entity và quan hệ giữa chúng |
| [`payments.md`](./payments.md) | Từng cổng thanh toán và mức độ hoàn thiện **thực tế** |
| [`open-questions.md`](./open-questions.md) | **Đọc trước tiên** — điểm cần xác nhận, xếp theo mức nghiêm trọng, gồm cả lỗ hổng an ninh |

Nếu chỉ có 5 phút: đọc `open-questions.md`.

## Feature specs (repo này là repo chủ)

| File | Nội dung |
|---|---|
| [`features/course-resources.md`](./features/course-resources.md) | Tài liệu HTML đính theo course; có phần admin và phần front |
| [`features/test-attempts.md`](./features/test-attempts.md) | Lưu bài làm trên server + màn tiến độ; phần front ở `udemy_practice_front` |

## ADR

| File | Nội dung |
|---|---|
| [`adr/0001-server-side-test-attempts.md`](./adr/0001-server-side-test-attempts.md) | Vì sao bài làm chuyển từ `localStorage` sang bảng `test_attempt` |

## Tài liệu ở repo khác

- `udemy_practice_front/docs/frontend.md` — trang và luồng phía khách hàng
- `udemy_practice_admin/docs/admin.md` — trang quản trị

Tham chiếu chéo ghi bằng đường dẫn `<repo>/docs/<file>` chứ không phải link
GitHub: ba repo nằm cạnh nhau khi clone, còn link tới nhánh mặc định sẽ hỏng
cho tới khi nhánh làm việc được merge.
