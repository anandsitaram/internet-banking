package com.demo.ib.customer;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.fineract.FineractClient.FineractTransaction;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customer")
public class CustomerController {
    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/profile")
    @PreAuthorize("hasAuthority('ACCOUNT_VIEW_OWN') or hasRole('CUSTOMER')")
    public CustomerService.CustomerProfileView getProfile(@AuthenticationPrincipal AuthUser user) {
        return customerService.getProfile(user);
    }

    @GetMapping("/accounts")
    @PreAuthorize("hasAuthority('ACCOUNT_VIEW_OWN') or hasRole('CUSTOMER')")
    public List<CustomerService.AccountSummaryView> getAccounts(@AuthenticationPrincipal AuthUser user) {
        return customerService.getAccounts(user);
    }

    @GetMapping("/accounts/{id}")
    @PreAuthorize("hasAuthority('ACCOUNT_VIEW_OWN') or hasRole('CUSTOMER')")
    public CustomerService.AccountSummaryView getAccount(@AuthenticationPrincipal AuthUser user, @PathVariable long id) {
        return customerService.getAccount(user, id);
    }

    @GetMapping("/accounts/{id}/balance")
    @PreAuthorize("hasAuthority('ACCOUNT_VIEW_OWN') or hasRole('CUSTOMER')")
    public CustomerService.BalanceView getBalance(@AuthenticationPrincipal AuthUser user, @PathVariable long id) {
        return customerService.getBalance(user, id);
    }

    @GetMapping("/accounts/{id}/transactions")
    @PreAuthorize("hasAuthority('ACCOUNT_VIEW_OWN') or hasRole('CUSTOMER')")
    public List<FineractTransaction> getTransactions(@AuthenticationPrincipal AuthUser user, @PathVariable long id) {
        return customerService.getTransactions(user, id);
    }

    @GetMapping("/accounts/{id}/statement")
    @PreAuthorize("hasAuthority('STATEMENT_DOWNLOAD') or hasRole('CUSTOMER')")
    public CustomerService.StatementView getStatement(
        @AuthenticationPrincipal AuthUser user,
        @PathVariable long id,
        @RequestParam(required = false) String fromDate,
        @RequestParam(required = false) String toDate
    ) {
        return customerService.getStatement(user, id, fromDate, toDate);
    }
}
