package com.demo.ib.fineract;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only connectivity check. Reveals no URLs, credentials or response bodies. */
@RestController
@RequestMapping("/api/v1/fineract")
public class FineractController {
    private final FineractClient fineract;

    public FineractController(FineractClient fineract) {
        this.fineract = fineract;
    }

    @GetMapping("/status")
    @PreAuthorize("hasAuthority('FINERACT_STATUS')")
    public ResponseEntity<Map<String, Object>> status() {
        boolean up = fineract.isUp();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("engine", up ? "UP" : "DOWN");
        body.put("serviceCredentials", up ? (fineract.credentialsWork() ? "OK" : "REJECTED") : "UNKNOWN");
        return ResponseEntity.status(up ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}
