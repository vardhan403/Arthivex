package com.finguard;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class FinGuardApplicationTests {

    @Test
    @DisplayName("Test 1: Application context loads successfully with Flyway migrations")
    void contextLoads() {
        // Context loads and validates schema against database
    }
}

