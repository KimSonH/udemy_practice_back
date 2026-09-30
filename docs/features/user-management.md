# Feature: User Management — quản lý người học từ admin

Trạng thái: đã duyệt thiết kế, chưa triển khai.
Liên quan: `udemy_practice_admin` (giao diện), `udemy_practice_back` (API, schema, auth).

## Mục tiêu

Admin cần một mục **Users** để xem, tạo, sửa người học, và **khoá tài khoản** khi
cần. Khoá là cơ chế chính: phần lớn user thật không xoá được vì còn enrolment và
lịch sử thanh toán, nên "chặn đăng nhập" mới là thứ dùng hằng ngày.

## Phạm vi

Có trong phạm vi:

- Danh sách user: phân trang, tìm kiếm theo tên/email, sắp xếp.
- Xem chi tiết một user kèm các khoá họ đã mua.
- Tạo user từ admin (đặt mật khẩu).
- Sửa tên, email.
- Khoá / mở khoá tài khoản (`status`).
- Xoá mềm, chỉ khi user chưa có enrolment nào.
- Gỡ `UsersController` công khai.

Ngoài phạm vi, cố ý:

- Đổi mật khẩu user từ admin. Chưa ai cần; thêm vào là đoán.
- Xem lịch sử làm bài trong trang chi tiết.
- Phân quyền nhiều mức cho admin.
- Sửa `admin/user-courses` để hiển thị "user đã xoá" — xem **Ràng buộc đã biết**.

## Quy tắc nền

Những điều đã chốt khi thiết kế, ghi lại vì chúng quyết định phần còn lại:

1. **Khoá, không xoá.** `user_course.user_id` và `user_premium.user_id` là
   `NO ACTION`, nên Postgres chặn hard delete với bất kỳ user nào đã mua khoá.
   `test_attempt.user_id` lại là `CASCADE` — nếu hard delete có lọt qua thì nó
   xoá sạch lịch sử làm bài. Cả hai lý do đều dẫn tới: không hard delete.
2. **Xoá mềm chỉ cho user sạch.** Còn enrolment thì từ chối kèm lý do.
3. **Khoá phải có hiệu lực ngay**, không đợi token hết hạn.
4. **Bám khuôn mẫu sẵn có.** Controller admin có guard, service dùng
   `resolveSort` + `toOrderObject` với tiebreaker `id`, giao diện dùng
   `DataTable` chung. Bốn mục hiện có đều vậy; làm khác chỉ tạo idiom thứ hai.

## Mô hình dữ liệu

Thêm một cột vào `user`:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `status` | `varchar`, `NOT NULL`, mặc định `'active'` | `'active'` hoặc `'inactive'` |

Dùng varchar cho khớp `course.status` vốn đã là varchar `'active'`/`'inactive'`,
thay vì boolean. Migration đặt mọi user hiện có thành `'active'`.

`down` xoá cột. Không cần bảng sao lưu: cột mới, không ghi đè dữ liệu cũ.

**Migration do người dùng chạy**, không phải Claude — quy tắc thường trực.

## Chặn đăng nhập — phần quan trọng nhất

Đây là chỗ tính năng này sống hoặc chết. Nếu chỉ chặn ở màn đăng nhập thì một
người đang đăng nhập vẫn dùng bình thường tới khi token hết hạn (hiện là
`expiresIn: 604800`, tức 7 ngày). Như vậy gần như vô dụng.

May mắn là cả ba đường vào đều **đã** đọc user từ database, nên thêm kiểm tra
không tốn thêm truy vấn nào:

| Đường | Hàm hiện có | Thêm gì |
|---|---|---|
| Mọi request có token | `JwtStrategy.validate` → `usersService.getById` | từ chối nếu `status !== 'active'` |
| Refresh token | `getUserIfRefreshTokenMatches` | như trên |
| Đăng nhập | `getAuthenticatedUser` → `getByEmail` | như trên, lỗi riêng |

**Có một đường thứ tư**, tìm ra ở review toàn nhánh:
`JwtOptionalAuthenticationGuard` cũng chạy `JwtStrategy`, nên cũng gọi
`assertUserActive` — nhưng `handleRequest` của nó nuốt mọi lỗi và trả
`undefined`. Người bị khoá gọi `GET /courses/:courseId/resources` vì thế thành
**khách vãng lai**, không phải bị từ chối. Hướng này an toàn (họ mất quyền xem
tài liệu dành cho người đã mua), nên không phải lỗ hổng — nhưng route nào đặt
sau guard đó về sau sẽ thừa hưởng việc *hạ quyền âm thầm* thay vì từ chối.

Dùng một helper chung, gọi từ ba nơi. **Không** nhét kiểm tra vào
`UsersService.getById` / `getByEmail`: admin phải đọc được cả user inactive để
hiển thị và mở khoá. Chặn ở tầng auth, không chặn ở tầng đọc.

Lỗi ném ra viết bằng tiếng Anh (quy tắc thường trực); chuỗi hiển thị cho người
dùng cuối localize en + vi ở phía front.

## API — `admin/users`

Controller mới, `@UseGuards(JwtAdminAuthenticationGuard)`, đặt cạnh
`admin/organizations` và theo cùng hình dạng.

| Route | Việc |
|---|---|
| `GET /` | Phân trang. `search` khớp tên hoặc email, không phân biệt hoa thường. Sort whitelist: `id`, `email`, `firstName`, `lastName`, `status`, `createdAt`. Luôn kèm tiebreaker `id DESC`. Không trả user đã xoá mềm. |
| `GET /:id` | User + danh sách khoá đã mua. |
| `POST /` | Tạo user. Mật khẩu **bcrypt 10 vòng**. |
| `PATCH /:id` | Sửa `firstName`, `lastName`, `email`. |
| `PATCH /:id/status` | Khoá / mở khoá. |
| `DELETE /:id` | Xoá mềm; từ chối nếu còn enrolment. |

Danh sách **không** trả `password` — entity đã có `@Exclude()` và app bật
`ClassSerializerInterceptor`, nhưng spec ghi lại để người sau không gỡ nhầm.

### Gỡ `UsersController`

`@Controller('users')` hiện **không có guard nào** và phơi ra hai route:

- `POST /users` — tạo user với `user.password = body.password`, **không hash**.
  Đối chiếu `authentication.service.ts` vốn dùng `bcrypt.hash(password, 10)`.
  Nghĩa là bất kỳ ai cũng chèn được user với mật khẩu lưu dạng trần.
- `GET /users/email?email=…` — dò xem một email đã đăng ký hay chưa.

Không client nào gọi hai route này: front đăng ký qua
`/authentication/register`. Nên **xoá** controller, không phải thêm guard —
bề mặt không dùng thì không cần bảo vệ, và để lại chỉ mời guard biến mất lần nữa.

`UsersService` giữ nguyên vì `authentication.service` vẫn dùng, nhưng
`UsersService.create` phải sửa để hash.

## Giao diện admin

Ba trang, theo đúng khuôn `courses` và `organizations`:

- `/users` — danh sách. Cột: ID · Name · Email · Status · Số khoá đã mua ·
  Created At · Actions.
- `/users/create` — form tạo.
- `/users/[id]` — form sửa + nút khoá/mở khoá + danh sách khoá đã mua.

`src/lib/router.ts` **đã khai báo sẵn** `users` và `users.create` từ trước nhưng
`app-sidebar.tsx` không render. Chỉ cần thêm mục vào sidebar.

Đổi trạng thái là thao tác **trên từng user** — một mục trong row actions của
danh sách và một nút ở trang chi tiết, cùng gọi `PATCH /:id/status`. Cố ý khác
"Change status" của Courses, vốn là hành động hàng loạt trên các dòng đã chọn
(`PUT /admin/courses/status`): khoá tài khoản là việc nên làm có chủ đích từng
người, không phải quét một lượt.

## Ba chỗ dễ hỏng

**Email trùng với user đã xoá mềm.** `email` có UNIQUE index, và xoá mềm không
giải phóng nó. Tạo hoặc sửa trùng phải trả lỗi đọc được ở đúng field, không phải
500 từ Postgres.

**Đếm khoá đã mua.** Đếm qua join có lọc, không đếm bảng nối trần. Đây đúng là
lỗi đã xảy ra với `attachQuestionCounts`: bảng nối giữ nguyên dòng khi bản ghi
bên kia bị xoá mềm, nên con số quảng cáo lệch với thực tế.

**Khoá mà không có hiệu lực.** Xem phần trên. Test phải chứng minh bằng token cũ.

## Ràng buộc đã biết

`admin/user-courses` load `relations: ['user']`, và TypeORM loại bản ghi xoá mềm
khỏi relation — nên nếu một user có enrolment bị xoá mềm, dòng đó sẽ hiện tên
trống. Với quy tắc "từ chối xoá khi còn enrolment" thì tình huống này không xảy
ra, nên lần này **không** sửa `user-courses`. Nếu sau này nới quy tắc xoá, phải
sửa chỗ đó cùng lúc.

## Kiểm thử

Backend (jest):

- Phân trang, search, sort whitelist, tiebreaker `id`.
- `POST` lưu mật khẩu đã hash, không phải chuỗi gốc.
- Email trùng trả lỗi rõ, kể cả khi bản trùng đã xoá mềm.
- `DELETE` từ chối khi còn enrolment; cho phép khi không còn.
- **Khoá có hiệu lực ngay**: user inactive bị từ chối ở cả ba đường — đăng nhập,
  request bằng token đã cấp trước đó, và refresh.
- Một test ở tầng module khẳng định mọi controller nó đăng ký đều mang guard —
  đúng loại test đã bắt được lỗ hổng `/questions`. Danh sách route không phải
  thứ cần canh; route vẫn đúng, chỉ thiếu guard.

Admin (vitest): zod schema của form tạo và sửa.

Mutation test cho mọi nhánh mới, theo thông lệ đang dùng trong repo.

## Rủi ro

- **Migration trên production.** Thêm cột có `DEFAULT` trên bảng `user` là thao
  tác nhẹ, bảng nhỏ. Vẫn phải deploy code trước, chạy migration sau.
- **Khoá nhầm chính mình.** Admin và user là hai bảng khác nhau (`admin` và
  `user`), nên khoá một user không thể tự khoá phiên admin. Không cần chống.
- **Gỡ `UsersController`** — đã kiểm không client nào gọi, nhưng nếu có script
  ngoài repo dùng thì sẽ gãy.

### Việc đã hoãn có chủ đích khi triển khai

Ghi lại ở đây vì ledger của lần triển khai nằm trong thư mục không được track.
Không cái nào chặn merge; xếp theo mức đáng làm trước.

- **`ValidationPipe` toàn cục không có `whitelist`** — key thừa trong body sống
  sót vào DTO. Sáu call site truyền DTO thô vào `update()`. Endpoint user tự vệ
  bằng cách destructure, nhưng đây là món đáng giá nhất trong danh sách.
- **`PaginationParams` có `@Min(0)` trên `page`** trong khi mọi service tính
  `(page - 1) * limit`, nên `?page=0` sinh OFFSET âm. Có sẵn ở bốn endpoint; sửa
  một lần trong `pagination.type.ts`.
- **`limit` không có trần** — một request có thể xin toàn bộ user.
- **`ILike('%'+search+'%')` không escape `%`/`_`** — tìm `%` khớp tất cả. Có
  bind nên không phải injection.
- **`assertUserActive` chỉ chặn đúng chuỗi `'inactive'`** — cố ý fail-open cho
  lần deploy nửa vời. Xem lại ngay khi có giá trị status thứ ba.
- **Thẻ chi tiết ghi "chưa mua khoá nào"** trong khi guard xoá đếm cả enrolment
  đã thu hồi, nên một user có thể trông như chưa mua gì mà vẫn không xoá được.
  Đây là mục duy nhất người dùng sẽ thực sự gặp.
- **Admin giờ có hai idiom server action** — `action/user.ts` nhận object có
  kiểu và trả `{success|message|errors}`; `course.ts`/`organization.ts` nhận
  `(state, formData)`. Bản mới tốt hơn và nhất quán nội bộ; nên hội tụ dần về
  nó, đừng quay lại bản cũ.
- **`@ApiProperty` trên `status` thiếu `enum: USER_STATUSES`** — Swagger mô tả
  nó là string trần.
- Regex che log bỏ sót `cookie`, `x-api-key`, `pwd`, `jwt`; `url` vẫn log thô.
  Chưa caller nào gửi những thứ đó.

Một mục đã được review toàn nhánh **giải quyết, không cần làm**: `PATCH {}`
rỗng không gây 500 — TypeORM loại giá trị `undefined` rồi luôn nối thêm
`@UpdateDateColumn`, nên tập giá trị không bao giờ rỗng. Đó là 200 no-op.

## Câu hỏi còn treo

- User bị khoá đang làm bài dở thì sao? Hiện thiết kế để request kế tiếp bị từ
  chối, bài làm dở nằm lại ở server. Chưa có màn báo cho họ biết vì sao.
- Có cần ghi lại ai khoá và khoá lúc nào không? Chưa làm; thêm sau nếu cần audit.
