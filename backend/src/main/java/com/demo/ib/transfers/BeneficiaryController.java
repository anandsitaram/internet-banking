package com.demo.ib.transfers;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/beneficiaries")
public class BeneficiaryController {
    private final BeneficiaryRepository repo;

    public record AddBeneficiaryRequest(
        String beneficiaryName,
        String accountReference,
        String bankName,
        String nickname
    ) {}

    public BeneficiaryController(BeneficiaryRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BENEFICIARY_MANAGE') or hasRole('CUSTOMER')")
    public List<BeneficiaryRepository.BeneficiaryRow> list(@AuthenticationPrincipal AuthUser user) {
        return repo.listByUser(user.id());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BENEFICIARY_MANAGE') or hasRole('CUSTOMER')")
    public BeneficiaryRepository.BeneficiaryRow add(
        @AuthenticationPrincipal AuthUser user,
        @RequestBody AddBeneficiaryRequest req
    ) {
        if (req.beneficiaryName() == null || req.beneficiaryName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_NAME", "Beneficiary name is required.");
        }
        if (req.accountReference() == null || req.accountReference().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ACCOUNT", "Account reference is required.");
        }
        long id = repo.insert(user.id(), req.beneficiaryName(), req.accountReference(), req.bankName(), req.nickname());
        return repo.findById(user.id(), id).orElseThrow();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BENEFICIARY_MANAGE') or hasRole('CUSTOMER')")
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable long id) {
        repo.remove(user.id(), id);
    }
}
