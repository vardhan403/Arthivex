package com.finguard;

import com.finguard.config.DotenvConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FinGuardApplication {

    public static void main(String[] args) {
        DotenvConfig.load();
        SpringApplication.run(FinGuardApplication.class, args);
    }
}

