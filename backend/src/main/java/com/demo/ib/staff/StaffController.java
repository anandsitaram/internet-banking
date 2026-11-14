package com.demo.ib.staff;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.fineract.FineractClient.FineractSavingsAccount;
import com.demo.ib.transfers.TransferRepository.TransferRequestRow;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff")
public class StaffController {
    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @PostMapping("/customers")
    @PreAuthorize("hasAuthority('CUSTOMER_REGISTER') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public StaffService.CustomerStaffView registerCustomer(
        @AuthenticationPrincipal AuthUser staff,
        @RequestBody StaffService.RegisterCustomerInput input,
        HttpServletRequest request
    ) {
        return staffService.registerCustomer(staff, input, request);
    }

    @GetMapping("/customers")
    @PreAuthorize("hasAuthority('CUSTOMER_READ') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public List<StaffService.CustomerStaffView> searchCustomers(@RequestParam(required = false, defaultValue = "") String q) {
        return staffService.searchCustomers(q);
    }

    @GetMapping("/customers/{id}")
    @PreAuthorize("hasAuthority('CUSTOMER_READ') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public Map<String, Object> getCustomerDetails(@PathVariable long id) {
        return staffService.getCustomerDetails(id);
    }

    @PostMapping("/accounts")
    @PreAuthorize("hasAuthority('ACCOUNT_OPEN') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public FineractSavingsAccount openSavingsAccount(
        @AuthenticationPrincipal AuthUser staff,
        @RequestBody StaffService.OpenAccountInput input,
        HttpServletRequest request
    ) {
        return staffService.openSavingsAccount(staff, input, request);
    }

    @GetMapping("/approvals")
    @PreAuthorize("hasAuthority('APPROVAL_DECIDE') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public List<TransferRequestRow> listApprovals() {
        return staffService.listPendingApprovals();
    }

    @PostMapping("/approvals/{id}/approve")
    @PreAuthorize("hasAuthority('APPROVAL_DECIDE') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public Map<String, Object> approve(
        @AuthenticationPrincipal AuthUser staff,
        @PathVariable long id,
        @RequestBody(required = false) StaffService.DecisionInput decision,
        HttpServletRequest request
    ) {
        return staffService.approveTransfer(staff, id, decision, request);
    }

    @PostMapping("/approvals/{id}/reject")
    @PreAuthorize("hasAuthority('APPROVAL_DECIDE') or hasRole('BANK_USER') or hasRole('ADMIN')")
    public Map<String, Object> reject(
        @AuthenticationPrincipal AuthUser staff,
        @PathVariable long id,
        @RequestBody(required = false) StaffService.DecisionInput decision,
        HttpServletRequest request
    ) {
        return staffService.rejectTransfer(staff, id, decision, request);
    }
}
