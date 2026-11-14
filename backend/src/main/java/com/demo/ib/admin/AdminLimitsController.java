package com.demo.ib.admin;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.ApiException;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/limits")
public class AdminLimitsController {
    private final LimitsRepository limitsRepo;

    public record UpdateLimitRequest(String code, BigDecimal value) {}

    public AdminLimitsController(LimitsRepository limitsRepo) {
        this.limitsRepo = limitsRepo;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('LIMITS_READ') or hasRole('ADMIN')")
    public List<LimitsRepository.SystemLimit> getLimits() {
        return limitsRepo.listLimits();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('LIMITS_WRITE') or hasRole('ADMIN')")
    public List<LimitsRepository.SystemLimit> updateLimit(
        @AuthenticationPrincipal AuthUser admin,
        @RequestBody UpdateLimitRequest req
    ) {
        if (req.code() == null || req.value() == null || req.value().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_LIMIT", "Valid limit code and non-negative value are required.");
        }
        limitsRepo.updateLimit(req.code(), req.value());
        return limitsRepo.listLimits();
    }
}
