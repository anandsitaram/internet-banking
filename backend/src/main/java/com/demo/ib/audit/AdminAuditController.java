package com.demo.ib.audit;

import com.demo.ib.common.PageResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AdminAuditController {
    private final AuditQueryRepository repo;

    public AdminAuditController(AuditQueryRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AUDIT_READ')")
    public PageResponse<AuditLogView> search(@RequestParam(required = false) String action,
                                             @RequestParam(required = false) String outcome,
                                             @RequestParam(required = false) String actor,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size) {
        return repo.search(action, outcome, actor, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }
}
