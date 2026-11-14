package com.demo.ib.customer;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.ApiException;
import com.demo.ib.fineract.FineractClient;
import com.demo.ib.fineract.FineractClient.FineractSavingsAccount;
import com.demo.ib.fineract.FineractClient.FineractTransaction;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CustomerService {
    private final CustomerRepository customerRepo;
    private final FineractClient fineract;

    public record CustomerProfileView(
        long userId,
        String username,
        String fullName,
        String email,
        String phone,
        long fineractClientId,
        String kycStatus,
        int activeAccountsCount
    ) {}

    public record AccountSummaryView(
        long id,
        String accountNumber,
        long clientId,
        String clientName,
        String productName,
        String status,
        BigDecimal balance,
        BigDecimal availableBalance,
        String currency,
        double interestRate,
        String openDate,
        String branchName
    ) {}

    public record BalanceView(
        long accountId,
        String accountNumber,
        BigDecimal balance,
        BigDecimal availableBalance,
        String currency
    ) {}

    public record StatementView(
        long accountId,
        String accountNumber,
        String currency,
        BigDecimal openingBalance,
        BigDecimal closingBalance,
        int totalTransactions,
        List<FineractTransaction> transactions
    ) {}

    public CustomerService(CustomerRepository customerRepo, FineractClient fineract) {
        this.customerRepo = customerRepo;
        this.fineract = fineract;
    }

    public CustomerProfileView getProfile(AuthUser user) {
        var profileOpt = customerRepo.findByUserId(user.id());
        long clientId = profileOpt.map(CustomerRepository.CustomerProfile::fineractClientId).orElse(1L);
        String phone = profileOpt.map(CustomerRepository.CustomerProfile::phone).orElse("+91 98765 43210");
        List<Long> linked = customerRepo.findLinkedAccountIds(user.id());

        return new CustomerProfileView(
            user.id(), user.username(), user.fullName(), user.email(), phone,
            clientId, "VERIFIED", linked.size()
        );
    }

    public List<AccountSummaryView> getAccounts(AuthUser user) {
        List<Long> linkedIds = customerRepo.findLinkedAccountIds(user.id());
        // If not linked yet in DB, default to Alex Demo accounts (10001, 10002) for graceful demo experience
        if (linkedIds.isEmpty()) {
            linkedIds = List.of(10001L, 10002L);
        }

        List<AccountSummaryView> results = new ArrayList<>();
        for (Long accId : linkedIds) {
            fineract.getSavingsAccount(accId).ifPresent(acc -> results.add(toView(acc)));
        }
        return results;
    }

    public AccountSummaryView getAccount(AuthUser user, long accountId) {
        verifyOwnership(user, accountId);
        FineractSavingsAccount acc = fineract.getSavingsAccount(accountId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", "Account not found in core system."));
        return toView(acc);
    }

    public BalanceView getBalance(AuthUser user, long accountId) {
        AccountSummaryView acc = getAccount(user, accountId);
        return new BalanceView(acc.id(), acc.accountNumber(), acc.balance(), acc.availableBalance(), acc.currency());
    }

    public List<FineractTransaction> getTransactions(AuthUser user, long accountId) {
        verifyOwnership(user, accountId);
        return fineract.getAccountTransactions(accountId);
    }

    public StatementView getStatement(AuthUser user, long accountId, String fromDate, String toDate) {
        AccountSummaryView acc = getAccount(user, accountId);
        List<FineractTransaction> txns = fineract.getAccountTransactions(accountId);

        // Filter transactions if dates provided
        List<FineractTransaction> filtered = txns.stream()
            .filter(t -> (fromDate == null || fromDate.isBlank() || t.date().compareTo(fromDate) >= 0)
                      && (toDate == null || toDate.isBlank() || t.date().compareTo(toDate) <= 0))
            .toList();

        BigDecimal opening = filtered.isEmpty() ? acc.balance() : filtered.get(filtered.size() - 1).runningBalance();
        BigDecimal closing = filtered.isEmpty() ? acc.balance() : filtered.get(0).runningBalance();

        return new StatementView(acc.id(), acc.accountNumber(), acc.currency(), opening, closing, filtered.size(), filtered);
    }

    private void verifyOwnership(AuthUser user, long accountId) {
        // If user is Bank Staff or Admin, allowed to view
        if (user.roles().contains("ADMIN") || user.roles().contains("BANK_USER")) {
            return;
        }
        // Demo accounts fallback
        if (accountId == 10001L || accountId == 10002L) {
            return;
        }
        if (!customerRepo.isAccountOwnedByUser(user.id(), accountId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_ACCOUNT", "You do not have permission to access account #" + accountId);
        }
    }

    private AccountSummaryView toView(FineractSavingsAccount acc) {
        return new AccountSummaryView(
            acc.id(), acc.accountNo(), acc.clientId(), acc.clientName(), acc.savingsProductName(),
            acc.status(), acc.accountBalance(), acc.availableBalance(), acc.currency(),
            acc.nominalAnnualInterestRate(), acc.submittedOnDate(), acc.branchName()
        );
    }
}
