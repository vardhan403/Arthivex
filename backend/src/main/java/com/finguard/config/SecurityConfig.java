package com.finguard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.ErrorResponse;
import com.finguard.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;
    private final List<String> allowedOrigins;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            ObjectMapper objectMapper,
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOriginsStr,
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.objectMapper = objectMapper;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = Arrays.stream(allowedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Configure CORS using explicit non-wildcard configuration source
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Stateless REST API uses Authorization headers, not session cookies.
                // Disabling CSRF is architecturally sound for stateless bearer tokens without cookies.
                .csrf(AbstractHttpConfigurer::disable)

                // Session Management: Stateless
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Security Headers Foundation
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(Customizer.withDefaults())
                        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; frame-ancestors 'none';"))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .cacheControl(Customizer.withDefaults())
                )

                // Authorization: Deny by default. Explicitly allow only public endpoints.
                .authorizeHttpRequests(auth -> auth
                        // Public Health & Telemetry endpoints
                        .requestMatchers("/health", "/api/v1/health").permitAll()

                        // Public Authentication endpoints
                        .requestMatchers(
                                "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/demo", "/api/v1/auth/bootstrap-admin",
                                "/api/auth/login", "/api/auth/register", "/api/auth/demo", "/api/auth/bootstrap-admin"
                        ).permitAll()

                        // Explicitly deny everything else unless authenticated
                        .anyRequest().authenticated()
                )

                // Stateless JWT Authentication filter
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

                // Safe customized authentication entry point (returns JSON 401 without HTML error page)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse error = new ErrorResponse(
                                    "UNAUTHORIZED",
                                    "Authentication credentials are required to access this resource.",
                                    UUID.randomUUID().toString().substring(0, 8),
                                    Instant.now(),
                                    null
                            );
                            response.getWriter().write(objectMapper.writeValueAsString(error));
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse error = new ErrorResponse(
                                    "ACCESS_DENIED",
                                    "Access to this resource is prohibited for your role.",
                                    UUID.randomUUID().toString().substring(0, 8),
                                    Instant.now(),
                                    null
                            );
                            response.getWriter().write(objectMapper.writeValueAsString(error));
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Requested-With", "Accept"));
        config.setExposedHeaders(List.of("Idempotency-Key", "Location"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

