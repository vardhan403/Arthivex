package com.finguard.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Secure, explicit .env file configuration loader for local development.
 *
 * Design & Security Principles:
 * 1. Explicit search order: current working directory, 'backend', or parent directory.
 * 2. Precedence: Never overwrites OS environment variables or JVM system properties.
 * 3. Secret Protection: Never prints or logs actual variable values or credentials.
 * 4. Resilient parsing: Safely handles comments (#), blank lines, and quoted values.
 */
public final class DotenvConfig {

    private static final Logger log = LoggerFactory.getLogger(DotenvConfig.class);

    private DotenvConfig() {
        // Utility class
    }

    public static void load() {
        List<Path> candidatePaths = List.of(
                Paths.get(".env"),
                Paths.get("backend", ".env"),
                Paths.get("..", ".env")
        );

        for (Path candidate : candidatePaths) {
            if (Files.isRegularFile(candidate)) {
                log.info("Loading local development configuration from: {}", candidate.toAbsolutePath().normalize());
                parseAndApply(candidate);
                return;
            }
        }
        log.info("No local .env file found. Proceeding with environment variables and defaults.");
    }

    private static void parseAndApply(Path path) {
        try (BufferedReader reader = Files.newBufferedReader(path)) {
            String line;
            int loadedCount = 0;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int equalsIndex = line.indexOf('=');
                if (equalsIndex > 0) {
                    String key = line.substring(0, equalsIndex).trim();
                    String value = line.substring(equalsIndex + 1).trim();

                    // Strip surrounding single or double quotes
                    if ((value.startsWith("\"") && value.endsWith("\"")) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        if (value.length() >= 2) {
                            value = value.substring(1, value.length() - 1);
                        }
                    }

                    // Respect existing environment variables and JVM properties (higher precedence)
                    if (System.getenv(key) == null && System.getProperty(key) == null) {
                        System.setProperty(key, value);
                        loadedCount++;
                    }
                }
            }
            log.info("Successfully loaded {} local configuration properties from .env (secrets masked).", loadedCount);
        } catch (IOException e) {
            log.warn("Failed to read .env file at {}: {}", path, e.getMessage());
        }
    }
}

