package com.finguard.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Test 2A: GET /health returns 200 OK and safe status")
    void healthEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/health").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.service", not(emptyOrNullString())))
                .andExpect(jsonPath("$.version", not(emptyOrNullString())))
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                // Verify sensitive configuration is NOT exposed
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.db").doesNotExist())
                .andExpect(jsonPath("$.secret").doesNotExist());
    }

    @Test
    @DisplayName("Test 2B: GET /api/v1/health returns 200 OK")
    void apiV1HealthEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/health").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }
}

