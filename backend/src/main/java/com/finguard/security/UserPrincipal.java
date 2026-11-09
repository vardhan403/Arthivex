package com.finguard.security;

import com.finguard.entity.OnboardingStatus;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Authenticated user principal stored in Spring SecurityContextHolder.
 */
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String name;
    private final String passwordHash;
    private final Role role;
    private final OnboardingStatus onboardingStatus;
    private final boolean enabled;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(UUID id, String email, String name, String passwordHash, Role role, boolean enabled) {
        this(id, email, name, passwordHash, role, OnboardingStatus.PENDING, enabled);
    }

    public UserPrincipal(UUID id, String email, String name, String passwordHash, Role role, OnboardingStatus onboardingStatus, boolean enabled) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.role = role;
        this.onboardingStatus = onboardingStatus != null ? onboardingStatus : OnboardingStatus.PENDING;
        this.enabled = enabled;
        this.authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    public static UserPrincipal fromEntity(User user) {
        return new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getPasswordHash(),
                user.getRole(),
                user.getOnboardingStatus(),
                user.isEnabled()
        );
    }

    public OnboardingStatus getOnboardingStatus() {
        return onboardingStatus;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getName() {
        return name;
    }

    public Role getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}

