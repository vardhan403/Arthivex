package com.finguard.controller;

import com.finguard.security.UserPrincipal;
import com.finguard.service.DemoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller for Sandbox Demo operations including isolated environment reset.
 */
@RestController
@RequestMapping({"/api/v1/demo", "/api/demo"})
public class DemoController {

    private final DemoService demoService;

    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetDemoEnvironment(@AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> result = demoService.resetDemoEnvironment(principal);
        return ResponseEntity.ok(result);
    }
}

