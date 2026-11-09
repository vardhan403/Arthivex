package com.finguard.controller;

import com.finguard.dto.AdminBootstrapRequest;
import com.finguard.dto.AuthResponse;
import com.finguard.dto.LoginRequest;
import com.finguard.dto.RegisterRequest;
import com.finguard.dto.UpdateAvatarRequest;
import com.finguard.dto.UserResponse;
import com.finguard.security.UserPrincipal;
import com.finguard.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Authentication REST Controller.
 * Handles user self-registration, credential login, current-user identity resolution,
 * and first-administrator bootstrapping.
 */
@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/bootstrap-admin")
    public ResponseEntity<AuthResponse> bootstrapAdmin(
            @Valid @RequestBody AdminBootstrapRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.bootstrapAdmin(request, extractClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        UserResponse response = authService.register(request, extractClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request, extractClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/demo")
    public ResponseEntity<AuthResponse> demoLogin(HttpServletRequest httpRequest) {
        AuthResponse response = authService.demoLogin(extractClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserResponse response = authService.getCurrentUser(principal);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/avatar")
    public ResponseEntity<UserResponse> updateAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateAvatarRequest request) {
        UserResponse response = authService.updateProfilePicture(principal, request.profilePicture());
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/avatar/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        UserResponse response = authService.updateProfilePictureMultipart(principal, file);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<UserResponse> removeAvatar(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserResponse response = authService.removeProfilePicture(principal);
        return ResponseEntity.ok(response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

