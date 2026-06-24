# 14. Notification API Specification — Sprint 3

**Owner:** Phạm Đan Kha
**Phiên bản:** v0.1 (Sprint 3 draft)
**Trạng thái:** Draft — chốt 23/06/2026
**Phạm vi:** API endpoint cho Notification Center và Bell polling.
**Align với:** `01_Information_Architecture.md` v3.0, `06_Sprint3_Screen_Specification.md` §2, `10_Sprint3_Data_Dictionary.md` §6.1

---

## 1. Endpoint List

| Method | Endpoint | Vai trò | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | ALL | Lấy danh sách notification (phân trang, filter) |
| `GET` | `/api/v1/notifications/unread-count` | ALL | Lấy số unread (polling 10s) |
| `PATCH` | `/api/v1/notifications/{id}/read` | ALL (chỉ owner) | Mark 1 notification as read |
| `PATCH` | `/api/v1/not Ntifications/mark-all-read` | ALL | Mark tất cả notification của user là read |

---

## 2. GET /api/v1/notifications

### Request Parameters

| Param | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `page` | int | No | 1 | Trang |
| `per_page` | int | No | 20 | Số item/trang (max 50) |
| `filter` | enum | No | `all` | `all` / `unread` / `read` |
| `type` | string | No | — | Filter theo `NOTIFICATION.type` |
| `project_id` | uuid | No | — | Filter theo project |

### Response 200 OK

```json
{
  "data": [
    {
      "notification_id": "uuid",
      "type": "task_assigned",
      "title": "Task CLM-42 được giao cho bạn",
      "body": "Dự án: Vivipedia",
      "is_read": false,
      "created_at": "2026-06-23T10:00:00Z",
      "entity_type": "claim_task",
      "entity_id": "uuid",
      "deep_link": "/tasks/:id/annotate"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## 3. GET /api/v1/notifications/unread-count

### Response 200 OK

```json
{
  "unread_count": 5
}
```

> **Ghi chú**: FE polling mỗi 10s theo `DEC-S3-04`.

---

## 4. PATCH /api/v1/notifications/{id}/read

### Request Body

```json
{
  "is_read": true
}
```

### Response 204 No Content

---

## 5. Deep Link Mapping

| `type` | `entity_type` | `deep_link` pattern | Màn hình |
|---|---|---|---|
| `task_assigned` | `claim_task` | `/tasks/{entity_id}/annotate` | Annotation Workspace |
| `task_returned` | `claim_task` | `/tasks/{entity_id}/annotate?tab=qa_feedback` | Annotation Workspace (tab QA) |
| `dispute_created` | `dispute` | `/disputes/{entity_id}` | Dispute Detail |
| `dispute_resolved` | `dispute` | `/disputes/{entity_id}` | Dispute Detail (read-only) |
| `export_done` | `export_job` | `/export/jobs/{entity_id}` | Export Job Status |
| `llm_pre_scoring_done` | `project` | `/projects/{entity_id}` | Project Detail |
| `llm_pre_scoring_failed` | `project` | `/projects/{entity_id}` | Project Detail |
| `sla_approaching` | `claim_task` | `/tasks/{entity_id}/annotate` | Annotation Workspace |
| `dispute_overdue` | `dispute` | `/disputes/{entity_id}` | Dispute Detail |
| `rubric_published` | `project` | `/projects/{entity_id}/rubrics` | Project Rubric |

---

## 6. Validation / AC

- [ ] Unread count khớp số item chưa đọc trong list
- [ ] Deep link mở đúng màn và auto-mark read
- [ ] Empty state khi filter Unread và không có item
- [ ] `llm_job_failed` chỉ gửi tới ADMIN (không gửi annotator)

---

*Chốt 23/06/2026 — align Sprint 3 Design Spec*
