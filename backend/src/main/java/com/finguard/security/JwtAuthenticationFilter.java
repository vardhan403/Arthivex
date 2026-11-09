package com.finguard.security;

import com.finguard.entity.User;
import com.finguard.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Security filter that authenticates incoming HTTP requests via Bearer JWT tokens.
 * Loads the current user state directly from the authoritative database to ensure immediate
 * revocation on account disablement and to prevent client-supplied or stale role forgery.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthAuditService authAuditService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserRepository userRepository,
            AuthAuditService authAuditService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.authAuditService = authAuditService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7).trim();

        if (jwtService.validateToken(token)) {
            try {
                UUID userId = jwtService.extractUserId(token);

                // Authoritative database verification (BACKEND.md Section 5.4, THREATS.md T-01)
                Optional<User> userOpt = userRepository.findById(userId);

                if (userOpt.isPresent()) {
                    User user = userOpt.get();

                    if (user.isEnabled()) {
                        // Authorities are authoritatively derived from PostgreSQL user record, NOT from client JWT claims
                        UserPrincipal principal = UserPrincipal.fromEntity(user);
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                principal.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    } else {
                        authAuditService.logTokenRejection(request.getRemoteAddr(), "User account is disabled: " + userId);
                    }
                } else {
                    authAuditService.logTokenRejection(request.getRemoteAddr(), "User does not exist in database: " + userId);
                }
            } catch (Exception ex) {
                authAuditService.logTokenRejection(request.getRemoteAddr(), "Failed to resolve authenticated identity: " + ex.getMessage());
            }
        } else {
            authAuditService.logTokenRejection(request.getRemoteAddr(), "Invalid, expired, or tampered token");
        }

        filterChain.doFilter(request, response);
    }
}

