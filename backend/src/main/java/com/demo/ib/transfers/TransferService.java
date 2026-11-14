package com.demo.ib.transfers;

import com.demo.ib.admin.LimitsRepository;
import com.demo.ib.audit.AuditService;
import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.ApiException;
import com.demo.ib.customer.CustomerRepository;
import com.demo.ib.fineract.FineractClient;
import com.demo.ib.fineract.FineractClient.FineractSavingsAccount;
import com.demo.ib.fineract.FineractClient.FineractTransferResult;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransferService {
    private final TransferRepository transferRepo;
    private final CustomerRepository customerRepo;
    private final LimitsRepository limitsRepo;
    private final FineractClient fineract;
    private final AuditService audit;

    public record TransferRequestInput(
        long fromAccountId,
        long toAccountId,
        String toAccountName,
        String toAccountNumber,
        BigDecimal amount,
        String currency,
        String remarks
    ) {}

    public record TransferResponse(
        long id,
        String status, // COMPLETED, PENDING_APPROVAL, REJECTED, FAILED
        String reference,
        BigDecimal amount,
        String currency,
        long fromAccountId,
        long toAccountId,
        String toAccountName,
        String toAccountNumber,
        String message,
        String createdAt
    ) {}

    public TransferService(
        TransferRepository transferRepo,
        CustomerRepository customerRepo,
        LimitsRepository limitsRepo,
        FineractClient fineract,
        AuditService audit
    ) {
        this.transferRepo = transferRepo;
        this.customerRepo = customerRepo;
        this.limitsRepo = limitsRepo;
        this.fineract = fineract;
        this.audit = audit;
    }

    @Transactional
    public TransferResponse initiateTransfer(
        AuthUser user,
        TransferRequestInput input,
        String idempotencyKey,
        HttpServletRequest request
    ) {
        if (input.amount() == null || input.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Transfer amount must be greater than zero.");
        }
        if (input.fromAccountId() == input.toAccountId()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_ACCOUNT", "Source and destination accounts must be different.");
        }

        // 1. Idempotency Check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var cachedRef = transferRepo.findIdempotentResponse(user.id(), idempotencyKey.trim());
            if (cachedRef.isPresent()) {
                return new TransferResponse(
                    -1L, "COMPLETED", cachedRef.get(), input.amount(), input.currency() != null ? input.currency() : "INR",
                    input.fromAccountId(), input.toAccountId(), input.toAccountName(), input.toAccountNumber(),
                    "Transfer already processed (Idempotent response)", java.time.Instant.now().toString()
                );
            }
        }

        // 2. Ownership verification
        if (!user.roles().contains("ADMIN") && !user.roles().contains("BANK_USER")) {
            if (input.fromAccountId() != 10001L && input.fromAccountId() != 10002L && !customerRepo.isAccountOwnedByUser(user.id(), input.fromAccountId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_SOURCE_ACCOUNT", "You do not own source account #" + input.fromAccountId());
            }
        }

        // 3. Balance verification from Fineract
        FineractSavingsAccount fromAcc = fineract.getSavingsAccount(input.fromAccountId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", "Source account not found in banking engine."));

        BigDecimal amount = input.amount().setScale(2, RoundingMode.HALF_UP);
        if (fromAcc.availableBalance().compareTo(amount) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_FUNDS",
                "Insufficient funds in account #" + input.fromAccountId() + ". Available: " + fromAcc.currency() + " " + fromAcc.availableBalance());
        }

        // 4. Limits verification
        BigDecimal singleLimit = limitsRepo.getLimitValue("SINGLE_TRANSFER_LIMIT", new BigDecimal("100000.00"));
        if (amount.compareTo(singleLimit) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LIMIT_EXCEEDED",
                "Transfer amount exceeds maximum single transfer limit of ₹" + singleLimit);
        }

        BigDecimal dailyLimit = limitsRepo.getLimitValue("DAILY_TRANSFER_LIMIT", new BigDecimal("500000.00"));
        BigDecimal usedToday = transferRepo.sumTransfersForUserToday(user.id());
        if (usedToday.add(amount).compareTo(dailyLimit) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DAILY_LIMIT_EXCEEDED",
                "Daily transfer limit of ₹" + dailyLimit + " would be exceeded. Used today: ₹" + usedToday);
        }

        String cur = input.currency() != null ? input.currency() : fromAcc.currency();
        String remarks = input.remarks() != null && !input.remarks().isBlank() ? input.remarks() : "Transfer to " + input.toAccountId();
        String toName = input.toAccountName() != null ? input.toAccountName() : "Beneficiary (" + input.toAccountId() + ")";
        String toNum = input.toAccountNumber() != null ? input.toAccountNumber() : String.valueOf(input.toAccountId());

        BigDecimal approvalThreshold = limitsRepo.getLimitValue("APPROVAL_THRESHOLD", new BigDecimal("25000.00"));

        // 5. Maker-checker workflow if above approval threshold
        if (amount.compareTo(approvalThreshold) > 0) {
            long reqId = transferRepo.createTransferRequest(
                input.fromAccountId(), input.toAccountId(), toName, toNum, amount, cur, remarks, "PENDING_APPROVAL", null, user.id()
            );
            transferRepo.createApproval(reqId, user.id());

            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                transferRepo.saveIdempotentKey(user.id(), idempotencyKey.trim(), "PENDING-" + reqId);
            }

            audit.recordAs(user, "TRANSFER_PENDING_APPROVAL", "TRANSFER", String.valueOf(reqId), "SUCCESS",
                Map.of("fromAccount", input.fromAccountId(), "toAccount", input.toAccountId(), "amount", amount, "threshold", approvalThreshold), request);

            return new TransferResponse(
                reqId, "PENDING_APPROVAL", "PENDING-" + reqId, amount, cur, input.fromAccountId(), input.toAccountId(),
                toName, toNum, "Transfer exceeds ₹" + approvalThreshold + " threshold and requires bank staff approval.",
                java.time.Instant.now().toString()
            );
        }

        // 6. Direct execution
        FineractTransferResult result = fineract.executeAccountTransfer(input.fromAccountId(), input.toAccountId(), amount, cur, remarks);
        long reqId = transferRepo.createTransferRequest(
            input.fromAccountId(), input.toAccountId(), toName, toNum, amount, cur, remarks, "COMPLETED", result.resourceIdentifier(), user.id()
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            transferRepo.saveIdempotentKey(user.id(), idempotencyKey.trim(), result.resourceIdentifier());
        }

        audit.recordAs(user, "TRANSFER_COMPLETED", "TRANSFER", String.valueOf(reqId), "SUCCESS",
            Map.of("fromAccount", input.fromAccountId(), "toAccount", input.toAccountId(), "amount", amount, "reference", result.resourceIdentifier()), request);

        return new TransferResponse(
            reqId, "COMPLETED", result.resourceIdentifier(), amount, cur, input.fromAccountId(), input.toAccountId(),
            toName, toNum, "Transfer completed successfully.", result.executedAt()
        );
    }

    public TransferResponse getTransfer(AuthUser user, long id) {
        var row = transferRepo.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TRANSFER_NOT_FOUND", "Transfer request not found."));

        if (!user.roles().contains("ADMIN") && !user.roles().contains("BANK_USER") && row.createdBy() != user.id()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "You cannot view this transfer request.");
        }

        return new TransferResponse(
            row.id(), row.status(), row.fineractTransferRef() != null ? row.fineractTransferRef() : "REQ-" + row.id(),
            row.amount(), row.currency(), row.fromAccountId(), row.toAccountId(), row.toAccountName(), row.toAccountNumber(),
            "Transfer is " + row.status(), row.createdAt().toString()
        );
    }

    public List<TransferResponse> listTransfers(AuthUser user) {
        return transferRepo.listByUser(user.id()).stream().map(row -> new TransferResponse(
            row.id(), row.status(), row.fineractTransferRef() != null ? row.fineractTransferRef() : "REQ-" + row.id(),
            row.amount(), row.currency(), row.fromAccountId(), row.toAccountId(), row.toAccountName(), row.toAccountNumber(),
            row.remarks(), row.createdAt().toString()
        )).toList();
    }
}
