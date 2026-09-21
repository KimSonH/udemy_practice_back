# Feature: Test Attempts — lưu bài làm trên server & màn tiến độ

**Ngày:** 2026-09-21
**Repos:** `udemy_practice_back` (chủ — schema + API), `udemy_practice_front` (P2–P4)
**Quyết định kiến trúc:** [`adr/0001-server-side-test-attempts.md`](../adr/0001-server-side-test-attempts.md)

## Mục tiêu

Học viên phải biết **mình đang dở ở khoá nào** và **đã tiến bộ tới đâu**, trên
mọi thiết bị. Kéo theo: bài làm phải sống ở server chứ không chỉ trong
`localStorage` của một trình duyệt.

Đo trước khi thiết kế — trong lúc *đang làm bài* thì thông tin khoá đã đủ
(tab title, `<h1>` màn bắt đầu, header runner có tên khoá + tên bộ đề + badge
chế độ, `ExamTopBar` ở màn kết quả). Chỗ thủng nằm **ngoài** bài thi:
`/my-courses` không có dấu vết tiến độ nào, `/dashboard` là demo shadcn.

## Phạm vi

- Backend: bảng `test_attempt`, chấm điểm phía server, API cho front.
- Front: đồng bộ trong runner, banner "Tiếp tục", badge tiến độ trên
  `/my-courses`, dựng lại `/dashboard`.
- **Ngoài phạm vi:** admin xem bài làm của học viên; chứng chỉ; xếp hạng.

## Quy tắc nền

| Tình huống | Nơi lưu |
|---|---|
| Chưa đăng nhập, làm bài khoá free | **Chỉ `localStorage`**, không đồng bộ |
| Đã đăng nhập | `localStorage` (đệm trong lúc làm) **+ server** (nguồn sự thật) |
| Đang làm với tư cách khách rồi đăng nhập giữa chừng | Bài đang dở **không** được đẩy lên; server bắt đầu ghi từ attempt kế tiếp |

Không có bước import dữ liệu `localStorage` cũ lên server.

## Mô hình dữ liệu — bảng `test_attempt`

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | serial | PK |
| user_id | int | FK -> user(id), NOT NULL, INDEX |
| course_id | int | FK -> course(id) ON DELETE CASCADE, NOT NULL, INDEX |
| course_set_id | int | FK -> course_set(id) ON DELETE CASCADE, **NULL = drill "luyện câu sai"** |
| mode | varchar | NOT NULL — `exam` \| `practice` |
| status | varchar | NOT NULL DEFAULT `in_progress` — `in_progress` \| `submitted` |
| current_index | int | NOT NULL DEFAULT 0 |
| question_ids | jsonb | NULL — chỉ có khi bộ câu hỏi không lấy trọn từ một set (drill) |
| option_order | jsonb | NULL — `{ "<questionId>": ["2","0","1"] }`, chỉ có khi tráo đáp án |
| answers | jsonb | NOT NULL DEFAULT `{}` — `{ "<questionId>": ["4"] }` |
| flagged | jsonb | NOT NULL DEFAULT `[]` — mảng questionId dạng chuỗi |
| revealed | jsonb | NOT NULL DEFAULT `[]` — practice mode |
| revision | int | NOT NULL DEFAULT 0 — tăng mỗi lần ghi, dùng phát hiện hai tab |
| started_at | timestamptz | NOT NULL |
| finished_at | timestamptz | NULL khi chưa nộp |
| deadline | timestamptz | NULL ở practice mode |
| timed_out | boolean | NOT NULL DEFAULT false |
| correct_count | int | NULL cho tới khi nộp — **server chấm** |
| total_count | int | NULL cho tới khi nộp |
| domain_scores | jsonb | NULL cho tới khi nộp — `[{ "domain": "...", "correct": 7, "total": 10 }]` |
| created_at / updated_at | timestamptz | auto |
| deleted_at | timestamptz | soft delete (`@Exclude`) |

**Index bổ sung:** `(user_id, course_id, started_at DESC)` — phục vụ cả màn lịch
sử lẫn API progress.

**Vì sao materialize `correct_count` / `domain_scores` lúc nộp:** màn tổng hợp
tiến độ xuyên khoá nếu phải chấm lại thì mỗi lần mở `/my-courses` sẽ kéo toàn
bộ ngân hàng câu hỏi của mọi khoá ra. Chốt số lúc nộp biến nó thành một query.

`question_ids` và `option_order` để NULL khi không dùng, đúng như bản
`localStorage` hiện tại — một attempt thường lấy trọn câu hỏi từ set của nó.

## Chấm điểm ở server

Port `gradeQuestion` từ `udemy_practice_front/src/lib/question-utils.ts` sang
NestJS. Quy tắc giữ nguyên: đúng khi **tập đáp án chọn trùng khớp hoàn toàn**
tập đáp án đúng; thiếu hoặc thừa đều là sai; không chọn gì là `skipped` và
tính như sai.

**Ràng buộc bắt buộc:** front vẫn giữ bản của nó để phục vụ khách chưa đăng
nhập. Hai bản phải không được lệch. Chốt bằng một **bộ ca kiểm thử dùng
chung** (fixture JSON cùng nội dung ở cả hai repo), chạy ở cả hai phía. Bất kỳ
ai sửa quy tắc chấm mà chỉ sửa một bên sẽ làm đỏ phía kia.

## API (NestJS)

Guard: `JwtAuthenticationGuard`. Mọi endpoint chỉ thao tác trên attempt của
chính người gọi — `user_id` lấy từ token, **không bao giờ từ body**.

| Method | Path | Việc |
|---|---|---|
| POST | `/test-attempts` | Bắt đầu. Body: `courseId`, `courseSetId?`, `mode`, `questionIds?`, `optionOrder?`, `deadline?`. Trả attempt kèm `id`, `revision`. |
| PATCH | `/test-attempts/:id` | Lưu tiến độ: `answers`, `flagged`, `revealed`, `currentIndex`, `revision`. Từ chối nếu attempt đã `submitted`. |
| POST | `/test-attempts/:id/submit` | Nộp. Server chấm, ghi `correct_count`, `total_count`, `domain_scores`, `finished_at`, `timed_out`. Trả kết quả. |
| GET | `/test-attempts?courseId=` | Lịch sử một khoá, mới nhất trước. |
| GET | `/test-attempts/progress` | **Tổng hợp mọi khoá** — xem dưới. |

### Kiểm tra quyền

- Khoá `paid`: phải tồn tại `user_course` của user đó với `status = completed`.
  Không có thì `403`, **không phải `404`** — người dùng biết khoá tồn tại.
- Khoá `free`: chỉ cần đăng nhập.
- `course_set_id` nếu có phải thuộc đúng `course_id`. Không thì `400`.
- Thao tác lên attempt của người khác: `404` (không tiết lộ nó tồn tại).

### `GET /test-attempts/progress`

Trả về, cho mỗi khoá người dùng có ít nhất một attempt:

```jsonc
[
  {
    "courseId": 7,
    "courseName": "AI-102",
    "setsTotal": 6,
    "setsAttempted": 3,
    "bestPercent": 78,          // cao nhất trong mọi attempt đã nộp
    "lastPercent": 64,          // attempt đã nộp gần nhất
    "lastAttemptAt": "2026-09-20T08:15:00.000Z",
    "inProgress": {             // null nếu không có bài dở
      "attemptId": 91,
      "courseSetId": 12,
      "courseSetName": "Bộ đề 2",
      "mode": "exam",
      "answered": 41,
      "total": 60,
      "deadline": "2026-09-21T04:30:00.000Z",
      "expired": false          // deadline đã qua -> không gọi là "tiếp tục"
    }
  }
]
```

`expired` do **server** tính, không để client so giờ — đồng hồ máy khách không
đáng tin, và gọi một bài đã hết giờ là "tiếp tục" là nói dối người dùng.

## Nhịp đồng bộ (front)

`localStorage` vẫn ghi như hiện nay (debounce 300ms). Server nhận ở ba mốc:

1. **Bắt đầu** — `POST /test-attempts`, lưu `attemptId` vào `TestSession`.
   Thất bại thì bài vẫn chạy bằng local, và báo cho người dùng là chưa đồng bộ.
2. **Heartbeat** — `PATCH` mỗi **15s** và chỉ khi có thay đổi kể từ lần gửi
   trước. Payload là toàn bộ `answers`/`flagged`/`revealed` (vài KB), không phải
   diff — diff cần merge, mà merge câu trả lời thì không có đáp án đúng.
3. **Nộp** — `POST /submit`. Điểm hiển thị là điểm **server trả về**.

Thêm `navigator.sendBeacon` lúc `pagehide` để không mất 15s cuối.

**Hai tab cùng một attempt:** `PATCH` gửi kèm `revision` mà client đang giữ.
Nếu server đang ở revision cao hơn → trả `409`, client **dừng đồng bộ và cảnh
báo**, không ghi đè. Không merge.

**Mất mạng:** `PATCH` hỏng chỉ ghi log và thử lại ở nhịp sau. Bài không dừng.

### Sửa `TestSession`

Thêm `attemptId?: number` và `syncedRevision?: number`. Cả hai **optional**, nên
mọi session đang lưu vẫn hợp lệ — không bump `SESSION_VERSION`, vì bump là ném
đi bài đang làm dở của tất cả mọi người.

## Front — các màn

### 1. `/my-courses`

- **Banner "Tiếp tục"** ở đầu trang: bài dở gần nhất, deep-link thẳng vào.
  Nếu `expired` thì nhãn là "đã hết giờ — xem kết quả", dẫn sang màn kết quả.
- **Badge trên mỗi card**: `Bộ 3/6 · cao nhất 78%`.
- Dữ liệu từ `GET /test-attempts/progress`, gọi **server-side** → không có
  hydration mismatch.

### 2. `/dashboard` — dựng lại

Bỏ `data.json`, `SectionCards`, `ChartAreaInteractive`, `DataTable` mẫu. Thay
bằng: các khoá đang học kèm điểm cao nhất, danh sách bài dở, và đồ thị điểm
theo thời gian. Dùng `GET /test-attempts/progress` và
`GET /test-attempts?courseId=`.

### 3. Trong bài thi

Hai chỗ vá nhỏ: tên khoá bị cắt trên màn hẹp, và chế độ drill chỉ hiện "Luyện
câu sai" mà không nói thuộc khoá nào.

## Kế hoạch triển khai

| Giai đoạn | Nội dung | Repo |
|---|---|---|
| P1 | Entity + migration + module + chấm điểm + test | back |
| P2 | Route handler `/api/test-attempts/*` + đồng bộ trong runner | front |
| P3 | `GET /progress` + banner + badge trên `/my-courses` | back, front |
| P4 | Dựng lại `/dashboard` | front |

Mỗi giai đoạn một commit trở lên, chạy đủ `tsc` / `lint` / `test` / `build`
trước khi commit.

## Kiểm thử

- **Backend (Jest):** chấm điểm (đúng/thiếu/thừa/bỏ trống, câu nhiều đáp án),
  quyền (khoá paid chưa mua → 403, attempt người khác → 404, set không thuộc
  course → 400), `revision` xung đột → 409, nộp hai lần → từ chối lần hai,
  `expired` tính theo giờ server.
- **Bộ ca chấm điểm dùng chung** chạy ở cả hai repo, chặn hai bản logic lệch nhau.
- **Front (vitest):** module đồng bộ là hàm thuần — quyết định "có gửi không"
  tách khỏi việc gửi, để test không cần mạng.
- **Mutation test** cho mọi hàm thuần mới, như các module `lib/` hiện có.

## Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Deploy backend trước khi chạy migration | Chạy migration **trước**. Đã có tiền lệ 400 hàng loạt với `AddExamTimingToCourse`. |
| Hai bản logic chấm điểm lệch nhau | Bộ ca kiểm thử dùng chung ở cả hai repo. |
| Runner nuôi hai đường lưu trữ | Tách hẳn lớp đồng bộ khỏi `use-test-session`; khách đơn giản là không bật lớp đó. |
| `answers` phình to | Một attempt vài trăm câu vẫn chỉ vài KB. Đặt giới hạn kích thước body ở DTO. |
| `jsonb` đầu tiên trong repo | Chỉ dùng cho dữ liệu không cần query theo cột bên trong. |

## Câu hỏi còn treo

- Có cho học viên **xoá** một attempt trong lịch sử không? Hiện thiết kế là
  không.
- Giữ lịch sử bao lâu? Hiện là vĩnh viễn.
