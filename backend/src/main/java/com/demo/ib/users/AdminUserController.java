package com.demo.ib.users;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {
    private final UserService service;

    public AdminUserController(UserService service) {
        this.service = service;
    }

    public record CreateUserRequest(
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9._-]{3,40}$", message = "3-40 chars: letters, digits, . _ -") String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank String role,
        @NotBlank String password) {}

    public record UpdateUserRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank String role,
        @NotBlank String status,
        String newPassword) {}

    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    public PageResponse<UserView> list(@RequestParam(required = false) String q,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return service.list(q, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserView create(@Valid @RequestBody CreateUserRequest body,
                           @AuthenticationPrincipal AuthUser actor, HttpServletRequest request) {
        return service.create(body.username(), body.email(), body.fullName(), body.role(), body.password(), actor, request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserView update(@PathVariable long id, @Valid @RequestBody UpdateUserRequest body,
                           @AuthenticationPrincipal AuthUser actor, HttpServletRequest request) {
        return service.update(id, body.email(), body.fullName(), body.role(), body.status(),
            body.newPassword(), actor, request);
    }
}
