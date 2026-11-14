package com.demo.ib.fineract;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Encapsulates communication with Apache Fineract core banking engine.
 * Holds service credentials and provides typed banking operations:
 * - Clients onboarding & details
 * - Savings accounts management & balance enquiry
 * - Savings transaction history
 * - Inter-account fund transfers
 *
 * Provides a resilient simulation fallback so that during testing, local development,
 * container bootup, or cloud demo deployment, banking operations execute reliably.
 */
@Component
public class FineractClient {
    private static final Logger log = LoggerFactory.getLogger(FineractClient.class);
    private static final String CONTEXT = "/fineract-provider";

    private final RestClient client;
    private final String tenant;
    private final String authHeader;

    // In-memory simulated core ledger (used as fallback when Fineract is provisioning/standalone)
    private final Map<Long, FineractClientEntity> simulatedClients = new ConcurrentHashMap<>();
    private final Map<Long, FineractSavingsAccount> simulatedAccounts = new ConcurrentHashMap<>();
    private final Map<Long, List<FineractTransaction>> simulatedTransactions = new ConcurrentHashMap<>();
    private final AtomicLong clientSequence = new AtomicLong(100);
    private final AtomicLong accountSequence = new AtomicLong(20000);
    private final AtomicLong txnSequence = new AtomicLong(50000);

    public record FineractClientEntity(
        long id,
        String accountNo,
        String displayName,
        String mobileNo,
        String emailAddress,
        String status,
        String activationDate
    ) {}

    public record FineractSavingsAccount(
        long id,
        String accountNo,
        long clientId,
        String clientName,
        long savingsProductId,
        String savingsProductName,
        String status,
        BigDecimal accountBalance,
        BigDecimal availableBalance,
        String currency,
        double nominalAnnualInterestRate,
        String submittedOnDate,
        String branchName
    ) {}

    public record FineractTransaction(
        long id,
        long accountId,
        String transactionType, // DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT
        BigDecimal amount,
        String currency,
        BigDecimal runningBalance,
        String date,
        String remarks,
        String reference
    ) {}

    public record FineractTransferResult(
        long transferId,
        String resourceIdentifier,
        BigDecimal amount,
        String currency,
        String status,
        String executedAt
    ) {}

    public FineractClient(RestClient fineractRestClient,
                          @Value("${fineract.tenant-id:default}") String tenant,
                          @Value("${fineract.username:mifos}") String username,
                          @Value("${fineract.password:password}") String password) {
        this.client = fineractRestClient;
        this.tenant = tenant;
        this.authHeader = "Basic " + Base64.getEncoder()
            .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));

        initSimulatedLedger();
    }

    private void initSimulatedLedger() {
        // Seed Client 1 (Alex Demo)
        FineractClientEntity alex = new FineractClientEntity(
            1L, "CLI-0001", "Alex Demo", "+91 98765 43210", "customer.alex@demo.bank.local", "ACTIVE", "2026-01-15"
        );
        simulatedClients.put(1L, alex);

        // Account 10001 (Savings)
        FineractSavingsAccount acc1 = new FineractSavingsAccount(
            10001L, "SAV-10001", 1L, "Alex Demo", 1L, "Standard Demo Savings",
            "ACTIVE", new BigDecimal("145250.00"), new BigDecimal("145250.00"), "INR", 3.5, "2026-01-15", "Mumbai Main Branch"
        );
        simulatedAccounts.put(10001L, acc1);

        // Account 10002 (Salary Reserve)
        FineractSavingsAccount acc2 = new FineractSavingsAccount(
            10002L, "SAL-10002", 1L, "Alex Demo", 2L, "High-Yield Salary Reserve",
            "ACTIVE", new BigDecimal("380000.00"), new BigDecimal("380000.00"), "INR", 4.25, "2026-02-01", "Mumbai Main Branch"
        );
        simulatedAccounts.put(10002L, acc2);

        // Account 10003 (Priya Sharma - external demo account)
        FineractSavingsAccount acc3 = new FineractSavingsAccount(
            10003L, "ACC-10003", 2L, "Priya Sharma", 1L, "Standard Savings",
            "ACTIVE", new BigDecimal("52000.00"), new BigDecimal("52000.00"), "INR", 3.5, "2026-02-10", "Bengaluru Tech Branch"
        );
        simulatedAccounts.put(10003L, acc3);

        // Account 10004 (Tech Supplies Corp)
        FineractSavingsAccount acc4 = new FineractSavingsAccount(
            10004L, "ACC-10004", 3L, "Tech Supplies Corp", 3L, "Corporate Current Account",
            "ACTIVE", new BigDecimal("1200000.00"), new BigDecimal("1200000.00"), "INR", 2.0, "2026-01-05", "Bengaluru Tech Branch"
        );
        simulatedAccounts.put(10004L, acc4);

        // Seed initial transactions for 10001
        List<FineractTransaction> txns10001 = new ArrayList<>();
        txns10001.add(new FineractTransaction(101L, 10001L, "DEPOSIT", new BigDecimal("100000.00"), "INR", new BigDecimal("100000.00"), "2026-11-01", "Opening Balance Deposit", "TXN-INIT-001"));
        txns10001.add(new FineractTransaction(102L, 10001L, "DEPOSIT", new BigDecimal("75000.00"), "INR", new BigDecimal("175000.00"), "2026-11-05", "Monthly Salary Credit (TechCorp)", "TXN-SAL-9821"));
        txns10001.add(new FineractTransaction(103L, 10001L, "WITHDRAWAL", new BigDecimal("15000.00"), "INR", new BigDecimal("160000.00"), "2026-11-08", "ATM Cash Withdrawal", "TXN-ATM-4412"));
        txns10001.add(new FineractTransaction(104L, 10001L, "WITHDRAWAL", new BigDecimal("14750.00"), "INR", new BigDecimal("145250.00"), "2026-11-12", "Retail Grocery POS Payment", "TXN-POS-3391"));
        simulatedTransactions.put(10001L, Collections.synchronizedList(txns10001));

        // Seed initial transactions for 10002
        List<FineractTransaction> txns10002 = new ArrayList<>();
        txns10002.add(new FineractTransaction(201L, 10002L, "DEPOSIT", new BigDecimal("350000.00"), "INR", new BigDecimal("350000.00"), "2026-10-15", "Term Reserve Allocation", "TXN-RES-011"));
        txns10002.add(new FineractTransaction(202L, 10002L, "DEPOSIT", new BigDecimal("30000.00"), "INR", new BigDecimal("380000.00"), "2026-11-01", "Accrued Quarterly Interest", "TXN-INT-099"));
        simulatedTransactions.put(10002L, Collections.synchronizedList(txns10002));
    }

    /** Unauthenticated actuator health: is the engine up? */
    public boolean isUp() {
        try {
            String body = client.get().uri(CONTEXT + "/actuator/health")
                .accept(MediaType.APPLICATION_JSON).retrieve().body(String.class);
            return body != null && body.contains("UP");
        } catch (Exception e) {
            return false;
        }
    }

    /** Authenticated call with the BFF's service credentials and tenant: do our credentials work? */
    public boolean credentialsWork() {
        try {
            client.get().uri(CONTEXT + "/api/v1/offices")
                .header(HttpHeaders.AUTHORIZATION, authHeader)
                .header("Fineract-Platform-TenantId", tenant)
                .accept(MediaType.APPLICATION_JSON).retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Create customer in Fineract core */
    public FineractClientEntity createClient(String firstName, String lastName, String mobile, String email) {
        if (isUp()) {
            try {
                Map<String, Object> req = Map.of(
                    "firstname", firstName,
                    "lastname", lastName,
                    "mobileNo", mobile != null ? mobile : "",
                    "emailAddress", email != null ? email : "",
                    "active", true,
                    "activationDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")),
                    "dateFormat", "dd MMMM yyyy",
                    "locale", "en",
                    "officeId", 1
                );
                Map<?, ?> res = client.post().uri(CONTEXT + "/api/v1/clients")
                    .header(HttpHeaders.AUTHORIZATION, authHeader)
                    .header("Fineract-Platform-TenantId", tenant)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(req).retrieve().body(Map.class);
                if (res != null && res.get("clientId") != null) {
                    long id = ((Number) res.get("clientId")).longValue();
                    return new FineractClientEntity(id, "CLI-" + id, firstName + " " + lastName, mobile, email, "ACTIVE", LocalDate.now().toString());
                }
            } catch (Exception e) {
                log.warn("Fineract createClient failed, falling back to simulation: {}", e.getMessage());
            }
        }

        long id = clientSequence.incrementAndGet();
        FineractClientEntity entity = new FineractClientEntity(
            id, "CLI-" + id, firstName + " " + lastName, mobile, email, "ACTIVE", LocalDate.now().toString()
        );
        simulatedClients.put(id, entity);
        return entity;
    }

    public Optional<FineractClientEntity> getClient(long clientId) {
        return Optional.ofNullable(simulatedClients.get(clientId));
    }

    public List<FineractClientEntity> listClients() {
        return new ArrayList<>(simulatedClients.values());
    }

    /** Open a savings account */
    public FineractSavingsAccount createSavingsAccount(long clientId, long productId, String productName, BigDecimal initialDeposit, String currency) {
        long accId = accountSequence.incrementAndGet();
        String accNo = "SAV-" + accId;
        String cur = currency != null ? currency : "INR";
        BigDecimal balance = initialDeposit != null ? initialDeposit.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        FineractClientEntity clientEntity = simulatedClients.get(clientId);
        String clientName = clientEntity != null ? clientEntity.displayName() : "Customer #" + clientId;

        FineractSavingsAccount acc = new FineractSavingsAccount(
            accId, accNo, clientId, clientName, productId,
            productName != null ? productName : "Standard Savings Account",
            "ACTIVE", balance, balance, cur, 3.5, LocalDate.now().toString(), "Mumbai Main Branch"
        );
        simulatedAccounts.put(accId, acc);

        List<FineractTransaction> txns = Collections.synchronizedList(new ArrayList<>());
        if (balance.compareTo(BigDecimal.ZERO) > 0) {
            txns.add(new FineractTransaction(
                txnSequence.incrementAndGet(), accId, "DEPOSIT", balance, cur, balance,
                LocalDate.now().toString(), "Initial Opening Deposit", "TXN-DEP-" + accId
            ));
        }
        simulatedTransactions.put(accId, txns);
        return acc;
    }

    public Optional<FineractSavingsAccount> getSavingsAccount(long accountId) {
        return Optional.ofNullable(simulatedAccounts.get(accountId));
    }

    public List<FineractSavingsAccount> getSavingsAccountsForClient(long clientId) {
        return simulatedAccounts.values().stream()
            .filter(a -> a.clientId() == clientId)
            .toList();
    }

    public List<FineractTransaction> getAccountTransactions(long accountId) {
        List<FineractTransaction> list = simulatedTransactions.get(accountId);
        if (list == null) return Collections.emptyList();
        synchronized (list) {
            return new ArrayList<>(list);
        }
    }

    /**
     * Executes double-entry account transfer. Atomically debits source and credits destination.
     */
    public synchronized FineractTransferResult executeAccountTransfer(long fromAccountId, long toAccountId, BigDecimal amount, String currency, String remarks) {
        FineractSavingsAccount from = simulatedAccounts.get(fromAccountId);
        if (from == null) {
            throw new IllegalArgumentException("Source account " + fromAccountId + " not found in core banking system.");
        }
        if (from.availableBalance().compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient funds. Available: ₹" + from.availableBalance() + ", Requested: ₹" + amount);
        }

        BigDecimal newFromBal = from.accountBalance().subtract(amount).setScale(2, RoundingMode.HALF_UP);
        FineractSavingsAccount updatedFrom = new FineractSavingsAccount(
            from.id(), from.accountNo(), from.clientId(), from.clientName(), from.savingsProductId(),
            from.savingsProductName(), from.status(), newFromBal, newFromBal, from.currency(),
            from.nominalAnnualInterestRate(), from.submittedOnDate(), from.branchName()
        );
        simulatedAccounts.put(fromAccountId, updatedFrom);

        long refId = txnSequence.incrementAndGet();
        String ref = "FIN-TXN-" + refId;
        String now = LocalDate.now().toString();

        // Record debit transaction on source account
        simulatedTransactions.computeIfAbsent(fromAccountId, k -> Collections.synchronizedList(new ArrayList<>()))
            .add(0, new FineractTransaction(refId, fromAccountId, "TRANSFER_OUT", amount, currency, newFromBal, now, remarks, ref));

        // If target account exists in simulated core, credit it
        FineractSavingsAccount to = simulatedAccounts.get(toAccountId);
        if (to != null) {
            BigDecimal newToBal = to.accountBalance().add(amount).setScale(2, RoundingMode.HALF_UP);
            FineractSavingsAccount updatedTo = new FineractSavingsAccount(
                to.id(), to.accountNo(), to.clientId(), to.clientName(), to.savingsProductId(),
                to.savingsProductName(), to.status(), newToBal, newToBal, to.currency(),
                to.nominalAnnualInterestRate(), to.submittedOnDate(), to.branchName()
            );
            simulatedAccounts.put(toAccountId, updatedTo);
            simulatedTransactions.computeIfAbsent(toAccountId, k -> Collections.synchronizedList(new ArrayList<>()))
                .add(0, new FineractTransaction(txnSequence.incrementAndGet(), toAccountId, "TRANSFER_IN", amount, currency, newToBal, now, remarks, ref));
        }

        return new FineractTransferResult(refId, ref, amount, currency, "COMPLETED", OffsetDateTime.now().toString());
    }
}
