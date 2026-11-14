package com.demo.ib.transfers;

import com.demo.ib.auth.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transfers")
public class TransferController {
    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TRANSFER_CREATE') or hasRole('CUSTOMER')")
    public TransferService.TransferResponse initiate(
        @AuthenticationPrincipal AuthUser user,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody TransferService.TransferRequestInput input,
        HttpServletRequest request
    ) {
        return transferService.initiateTransfer(user, input, idempotencyKey, request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TRANSFER_CREATE') or hasRole('CUSTOMER')")
    public TransferService.TransferResponse getTransfer(
        @AuthenticationPrincipal AuthUser user,
        @PathVariable long id
    ) {
        return transferService.getTransfer(user, id);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TRANSFER_CREATE') or hasRole('CUSTOMER')")
    public List<TransferService.TransferResponse> listTransfers(@AuthenticationPrincipal AuthUser user) {
        return transferService.listTransfers(user);
    }
}
