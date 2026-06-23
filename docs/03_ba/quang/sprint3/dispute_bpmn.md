# Dispute Escalation Workflow (BPMN)

**Owner:** Quang  
**Trạng thái:** Draft for Review  
**Phạm vi:** Luồng xử lý tranh chấp Dispute (MVP và Full Flow)  
**Tài liệu tham chiếu:** `docs/03_ba/quang/sprint3/dispute_business_rules.md`

---

## 1. Luồng MVP (Sprint 3 & 4 Implementation)

Luồng MVP tối giản hóa vai trò giải quyết tranh chấp bằng cách tập trung quyền quyết định vào **Admin**. Không có sự tham gia của Policy Analyst và không liên kết trực tiếp với cập nhật Guideline trên hệ thống.

```mermaid
graph TD
    %% Nodes definition
    Start([Annotator nộp Task lần 1]) --> QA_Rev_1{QA Review lần 1}
    
    QA_Rev_1 -- Đồng ý --> Approved([Task Approved])
    QA_Rev_1 -- Không đồng ý --> Return_1[QA Return lần 1]
    
    Return_1 --> Ann_Edit[Annotator chỉnh sửa & Resubmit]
    
    Ann_Edit --> QA_Rev_2{QA Review lần 2}
    
    QA_Rev_2 -- Đồng ý --> Approved
    QA_Rev_2 -- Không đồng ý --> Dispute_Gate{Đã qua Return 1 lần &<br/>Annotator đã Resubmit?}
    
    Dispute_Gate -- Đúng --> Escalate_Option[Hiển thị nút Escalate Dispute]
    Dispute_Gate -- Sai (Override) --> Admin_Override[Admin tạo Dispute trực tiếp]
    
    Escalate_Option --> QA_Action{QA chọn hành động}
    QA_Action -- Return lần nữa --> Return_1
    QA_Action -- Escalate Dispute --> Create_Dispute[Tạo Dispute Record<br/>Trạng thái: Disputed]
    
    Admin_Override --> Create_Dispute
    
    Create_Dispute --> Notify_Admin[Notify: dispute_created gửi đến Admin + QA]
    Notify_Admin --> Admin_Review[Admin xem xét Dispute Detail]
    
    Admin_Review --> SLA_Check{Quá SLA 5 ngày?}
    SLA_Check -- Có --> Flag_Overdue[Tự động gắn cờ Overdue<br/>Notify: dispute_overdue] --> Admin_Resolve
    SLA_Check -- Không --> Admin_Resolve{Admin ra quyết định}
    
    Admin_Resolve -- Chấp nhận kết quả --> Resolve_Approve[Trạng thái: Dispute Resolved - Approved]
    Admin_Resolve -- Yêu cầu làm lại --> Resolve_Reann[Trạng thái: Dispute Resolved - Re-annotation]
    
    Resolve_Approve --> Task_Approve[Task chuyển sang Approved]
    Resolve_Reann --> Task_Return[Task chuyển sang Returned]
    
    Task_Approve --> Notify_Resolve[Notify: dispute_resolved gửi Annotator + QA]
    Task_Return --> Notify_Resolve
    
    Notify_Resolve --> End([Kết thúc Dispute])
```

---

## 2. Luồng Full Flow (Định hướng Phase 2)

Luồng đầy đủ mở rộng vai trò xử lý tranh chấp bằng cách thêm vai trò **Policy Analyst** để đánh giá nguyên nhân gốc rễ (thường do tài liệu hướng dẫn gán nhãn - Guideline không rõ ràng). Kết quả resolve có thể trigger một quy trình cập nhật Guideline của hệ thống.

```mermaid
graph TD
    %% Nodes definition
    Start([Dispute được tạo - Disputed]) --> Assign_PA[Hệ thống tự động gán hoặc<br/>Admin phân công cho Policy Analyst]
    
    Assign_PA --> PA_Review[Policy Analyst Review & Phân tích]
    
    PA_Review --> Guideline_Check{Có cần làm rõ hoặc<br/>cập nhật Guideline?}
    
    Guideline_Check -- Có --> Update_Guideline[Cập nhật Guideline dự án]
    Update_Guideline --> Publish_Notify[Publish Guideline mới &<br/>Notify: guideline_published đến tất cả Annotator]
    Publish_Notify --> Resolve_Decision
    
    Guideline_Check -- Không --> Resolve_Decision{PA / Admin quyết định}
    
    Resolve_Decision -- Approve Current Output --> Resolve_Approve[Resolved - Approved]
    Resolve_Decision -- Re-annotation Required --> Resolve_Reann[Resolved - Re-annotation]
    
    Resolve_Approve --> Task_Approve[Task chuyển sang Approved]
    Resolve_Reann --> Task_Return[Task chuyển sang Returned]
    
    Task_Approve --> Audit_Full[Ghi Audit Log & liên kết link Guideline mới]
    Task_Return --> Audit_Full
    
    Audit_Full --> End([Kết thúc Dispute])
```

---

## 3. Các điểm khác biệt chính giữa MVP và Full Flow

| Đặc trưng | MVP Flow (Sprint 3/4) | Full Flow (Phase 2) |
| :--- | :--- | :--- |
| **Tác nhân Resolve** | **Admin** xử lý trực tiếp. | **Policy Analyst** review, Admin phê duyệt kết quả. |
| **Liên kết Guideline** | Không có (xử lý sự vụ trên từng task). | Bắt buộc liên kết mã Dispute với phiên bản Guideline cập nhật (nếu có). |
| **Quy trình Thông báo** | Chỉ gửi `dispute_created` và `dispute_resolved`. | Gửi thêm `guideline_published` yêu cầu annotator xác nhận đã đọc. |
| **Hệ thống Quản lý** | Đơn giản, lưu trạng thái task và log dispute. | Có thêm phân hệ quản lý Guideline versioning và danh sách câu hỏi FAQ. |

---

*Tài liệu nội bộ VSF — Thiết kế luồng Dispute BPMN — Owner: Quang*
