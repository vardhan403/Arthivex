package com.finguard.controller;

import com.finguard.dto.HealthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final String appName;
    private final String appVersion;

    public HealthController(
            @Value("${app.name:Arthivex Backend}") String appName,
            @Value("${app.version:1.0.0}") String appVersion) {
        this.appName = appName;
        this.appVersion = appVersion;
    }

    @GetMapping({"/health", "/api/v1/health"})
    public ResponseEntity<HealthResponse> getHealth() {
        return ResponseEntity.ok(HealthResponse.up(appName, appVersion));
    }
}

