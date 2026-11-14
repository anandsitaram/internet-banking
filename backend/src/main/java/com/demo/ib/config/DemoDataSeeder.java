package com.demo.ib.config;

import com.demo.ib.customer.CustomerRepository;
import com.demo.ib.transfers.BeneficiaryRepository;
import com.demo.ib.transfers.TransferRepository;
import com.demo.ib.users.UserRepository;
import com.demo.ib.users.UserRow;
import com.demo.ib.users.UserService;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Creates the bootstrap admin and demo logins at startup.
 * Seeds linked customer profiles, Fineract account links, beneficiaries, and sample transfers.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository users;
    private final UserService userService;
    private final CustomerRepository customerRepo;
    private final BeneficiaryRepository beneficiaryRepo;
    private final TransferRepository transferRepo;
    private final String adminUsername;
    private final String adminPassword;
    private final boolean seedDemo;
    private final String demoPassword;

    public DemoDataSeeder(
        UserRepository users,
        UserService userService,
        CustomerRepository customerRepo,
        BeneficiaryRepository beneficiaryRepo,
        TransferRepository transferRepo,
        @Value("${app.bootstrap-admin-username}") String adminUsername,
        @Value("${app.bootstrap-admin-password}") String adminPassword,
        @Value("${app.seed-demo-users}") boolean seedDemo,
        @Value("${app.demo-user-password}") String demoPassword
    ) {
        this.users = users;
        this.userService = userService;
        this.customerRepo = customerRepo;
        this.beneficiaryRepo = beneficiaryRepo;
        this.transferRepo = transferRepo;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.seedDemo = seedDemo;
        this.demoPassword = demoPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.findByUsername(adminUsername).isEmpty()) {
            if (adminPassword == null || adminPassword.isBlank()) {
                throw new IllegalStateException("APP_BOOTSTRAP_ADMIN_PASSWORD must be set to create the first admin.");
            }
            userService.createInternal(adminUsername, adminUsername + "@demo.bank.local", "Demo Administrator", "ADMIN", adminPassword);
            log.info("Created bootstrap admin '{}'.", adminUsername);
        }

        if (seedDemo) {
            if (demoPassword == null || demoPassword.isBlank()) {
                throw new IllegalStateException("DEMO_USER_PASSWORD must be set when APP_SEED_DEMO_USERS=true.");
            }
            seed("bank.user1", "bank.user1@demo.bank.local", "Priya Staff", "BANK_USER");
            seed("customer.alex", "customer.alex@demo.bank.local", "Alex Demo", "CUSTOMER");

            // Seed Alex's profile, accounts, and beneficiaries
            users.findByUsername("customer.alex").ifPresent(alex -> {
                customerRepo.linkCustomerProfile(alex.id(), 1L, "+91 98765 43210");
                customerRepo.linkAccount(alex.id(), 10001L);
                customerRepo.linkAccount(alex.id(), 10002L);

                beneficiaryRepo.insert(alex.id(), "Priya Sharma", "ACC-10003", "State Core Bank", "Priya Personal");
                beneficiaryRepo.insert(alex.id(), "Tech Supplies Corp", "ACC-10004", "State Core Bank", "Office Hardware");
                beneficiaryRepo.insert(alex.id(), "Electricity Board", "ACC-10005", "National Utility Bank", "Home Utility Bill");

                // Seed sample transfer requests if none exist
                if (transferRepo.listByUser(alex.id()).isEmpty()) {
                    // Completed transfer
                    transferRepo.createTransferRequest(
                        10001L, 10003L, "Priya Sharma", "ACC-10003",
                        new BigDecimal("5000.00"), "INR", "Dinner reimbursement",
                        "COMPLETED", "FIN-TXN-10091", alex.id()
                    );

                    // Pending approval transfer (exceeds threshold)
                    long pendingId = transferRepo.createTransferRequest(
                        10001L, 10004L, "Tech Supplies Corp", "ACC-10004",
                        new BigDecimal("45000.00"), "INR", "Bulk IT Hardware purchase",
                        "PENDING_APPROVAL", null, alex.id()
                    );
                    transferRepo.createApproval(pendingId, alex.id());
                }
            });
        }
    }

    private void seed(String username, String email, String fullName, String role) {
        if (users.findByUsername(username).isEmpty()) {
            userService.createInternal(username, email, fullName, role, demoPassword);
            log.info("Created demo user '{}' ({}).", username, role);
        }
    }
}
