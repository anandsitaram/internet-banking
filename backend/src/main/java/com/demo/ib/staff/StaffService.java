package com.demo.ib.staff;

import com.demo.ib.audit.AuditService;
import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.ApiException;
import com.demo.ib.customer.CustomerRepository;
import com.demo.ib.fineract.FineractClient;
import com.demo.ib.fineract.FineractClient.FineractClientEntity;
import com.demo.ib.fineract.FineractClient.FineractSavingsAccount;
import com.demo.ib.fineract.FineractClient.FineractTransferResult;
import com.demo.ib.transfers.TransferRepository;
import com.demo.ib.transfers.TransferRepository.TransferRequestRow;
import com.demo.ib.users.UserRepository;
import com.demo.ib.users.UserService;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {
    private final UserRepository users;
    private final UserService userService;
    private final CustomerRepository customerRepo;
    private final TransferRepository transferRepo;
    private final FineractClient fineract;
    private final AuditService audit;

    public record RegisterCustomerInput(
        String username,
        String email,
        String fullName,
        String phone,
        String password,
        BigDecimal initialDeposit,
        String currency
    ) {}

    public record CustomerStaffView(
        long userId,
        String username,
        String fullName,
        String email,
        String phone,
        long fineractClientId,
        String status,
        int accountsCount,
        String createdAt
    ) {}

    public record OpenAccountInput(
        long customerUserId,
        Long productId,
        String productName,
        BigDecimal initialDeposit,
        String currency
    ) {}

    public record DecisionInput(
        String comment
    ) {}

    public StaffService(
        UserRepository users,
        UserService userService,
        CustomerRepository customerRepo,
        TransferRepository transferRepo,
        FineractClient fineract,
        AuditService audit
    ) {
        this.users = users;
        this.userService = userService;
        this.customerRepo = customerRepo;
        this.transferRepo = transferRepo;
        this.fineract = fineract;
        this.audit = audit;
    }

    @Transactional
    public CustomerStaffView registerCustomer(AuthUser staff, RegisterCustomerInput input, HttpServletRequest request) {
        if (input.username() == null || input.username().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USERNAME", "Username is required.");
        }
        if (input.email() == null || input.email().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EMAIL", "Email is required.");
        }
        if (input.fullName() == null || input.fullName().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_NAME", "Full name is required.");
        }

        // 1. Create Portal User with role CUSTOMER
        String rawPassword = input.password() != null && !input.password().isBlank() ? input.password() : "DemoCust@2026";
        var userRow = userService.createInternal(input.username(), input.email(), input.fullName(), "CUSTOMER", rawPassword);

        // 2. Create Core Banking Client in Fineract
        String[] nameParts = input.fullName().trim().split("\\s+", 2);
        String first = nameParts[0];
        String last = nameParts.length > 1 ? nameParts[1] : "Customer";
        FineractClientEntity clientEntity = fineract.createClient(first, last, input.phone(), input.email());

        // 3. Link customer profile
        customerRepo.linkCustomerProfile(userRow.id(), clientEntity.id(), input.phone());

        // 4. Optionally open initial savings account
        if (input.initialDeposit() != null && input.initialDeposit().compareTo(BigDecimal.ZERO) >= 0) {
            FineractSavingsAccount acc = fineract.createSavingsAccount(
                clientEntity.id(), 1L, "Standard Demo Savings", input.initialDeposit(), input.currency() != null ? input.currency() : "INR"
            );
            customerRepo.linkAccount(userRow.id(), acc.id());
        }

        audit.recordAs(staff, "CUSTOMER_REGISTERED", "CUSTOMER", String.valueOf(userRow.id()), "SUCCESS",
            Map.of("username", userRow.username(), "fineractClientId", clientEntity.id()), request);

        return new CustomerStaffView(
            userRow.id(), userRow.username(), userRow.fullName(), userRow.email(), input.phone(),
            clientEntity.id(), userRow.status(), 1, userRow.createdAt().toString()
        );
    }

    public List<CustomerStaffView> searchCustomers(String q) {
        var userRows = users.search(q, 100, 0);
        List<CustomerStaffView> list = new ArrayList<>();
        for (var u : userRows) {
            List<String> roles = users.roleNames(u.id());
            if (roles.contains("CUSTOMER")) {
                var profile = customerRepo.findByUserId(u.id());
                long clientId = profile.map(CustomerRepository.CustomerProfile::fineractClientId).orElse(1L);
                String phone = profile.map(CustomerRepository.CustomerProfile::phone).orElse("+91 98765 43210");
                List<Long> accounts = customerRepo.findLinkedAccountIds(u.id());
                list.add(new CustomerStaffView(
                    u.id(), u.username(), u.fullName(), u.email(), phone, clientId, u.status(),
                    accounts.isEmpty() ? 2 : accounts.size(), u.createdAt().toString()
                ));
            }
        }
        return list;
    }

    public Map<String, Object> getCustomerDetails(long customerUserId) {
        var user = users.findById(customerUserId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Customer user not found."));
        var profile = customerRepo.findByUserId(customerUserId);
        long clientId = profile.map(CustomerRepository.CustomerProfile::fineractClientId).orElse(1L);
        String phone = profile.map(CustomerRepository.CustomerProfile::phone).orElse("+91 98765 43210");

        List<Long> accIds = customerRepo.findLinkedAccountIds(customerUserId);
        if (accIds.isEmpty() && "customer.alex".equals(user.username())) {
            accIds = List.of(10001L, 10002L);
        }

        List<FineractSavingsAccount> accounts = new ArrayList<>();
        for (Long id : accIds) {
            fineract.getSavingsAccount(id).ifPresent(accounts::add);
        }

        return Map.of(
            "user", user,
            "phone", phone,
            "fineractClientId", clientId,
            "accounts", accounts
        );
    }

    @Transactional
    public FineractSavingsAccount openSavingsAccount(AuthUser staff, OpenAccountInput input, HttpServletRequest request) {
        var user = users.findById(input.customerUserId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Customer not found."));
        var profile = customerRepo.findByUserId(input.customerUserId());
        long clientId = profile.map(CustomerRepository.CustomerProfile::fineractClientId).orElse(1L);

        long prodId = input.productId() != null ? input.productId() : 1L;
        String prodName = input.productName() != null ? input.productName() : "Standard Demo Savings";
        BigDecimal initialDeposit = input.initialDeposit() != null ? input.initialDeposit() : BigDecimal.ZERO;
        String cur = input.currency() != null ? input.currency() : "INR";

        FineractSavingsAccount account = fineract.createSavingsAccount(clientId, prodId, prodName, initialDeposit, cur);
        customerRepo.linkAccount(user.id(), account.id());

        audit.recordAs(staff, "SAVINGS_ACCOUNT_OPENED", "ACCOUNT", String.valueOf(account.id()), "SUCCESS",
            Map.of("customerId", user.id(), "accountNo", account.accountNo(), "initialDeposit", initialDeposit), request);

        return account;
    }

    public List<TransferRequestRow> listPendingApprovals() {
        return transferRepo.listPendingApprovals();
    }

    @Transactional
    public Map<String, Object> approveTransfer(AuthUser staff, long requestId, DecisionInput decision, HttpServletRequest request) {
        TransferRequestRow req = transferRepo.findById(requestId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Transfer request not found."));

        if (!"PENDING_APPROVAL".equals(req.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "Transfer request is not pending approval (current: " + req.status() + ").");
        }

        // Maker-Checker enforcement: cannot approve own request!
        if (req.createdBy() == staff.id()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "MAKER_CHECKER_VIOLATION",
                "Maker-checker policy violation: You cannot approve a transfer request initiated by yourself.");
        }

        // Execute transfer in core banking engine
        FineractTransferResult result = fineract.executeAccountTransfer(
            req.fromAccountId(), req.toAccountId(), req.amount(), req.currency(), req.remarks()
        );

        transferRepo.updateStatus(requestId, "COMPLETED", result.resourceIdentifier());
        transferRepo.recordDecision(requestId, staff.id(), "APPROVED", decision != null ? decision.comment() : "Approved by staff");

        audit.recordAs(staff, "TRANSFER_APPROVED", "TRANSFER", String.valueOf(requestId), "SUCCESS",
            Map.of("requestId", requestId, "fineractRef", result.resourceIdentifier(), "comment", decision != null ? decision.comment() : ""), request);

        return Map.of(
            "status", "COMPLETED",
            "reference", result.resourceIdentifier(),
            "message", "Transfer request #" + requestId + " approved and processed successfully."
        );
    }

    @Transactional
    public Map<String, Object> rejectTransfer(AuthUser staff, long requestId, DecisionInput decision, HttpServletRequest request) {
        TransferRequestRow req = transferRepo.findById(requestId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Transfer request not found."));

        if (!"PENDING_APPROVAL".equals(req.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE", "Transfer request is not pending approval.");
        }

        transferRepo.updateStatus(requestId, "REJECTED", null);
        transferRepo.recordDecision(requestId, staff.id(), "REJECTED", decision != null ? decision.comment() : "Rejected by staff");

        audit.recordAs(staff, "TRANSFER_REJECTED", "TRANSFER", String.valueOf(requestId), "SUCCESS",
            Map.of("requestId", requestId, "comment", decision != null ? decision.comment() : ""), request);

        return Map.of(
            "status", "REJECTED",
            "message", "Transfer request #" + requestId + " has been rejected."
        );
    }
}
