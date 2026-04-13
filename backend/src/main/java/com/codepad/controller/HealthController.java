package com.codepad.controller;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final DataSource dataSource;
    private final RedisTemplate<String, Object> redisTemplate;

    public HealthController(DataSource dataSource, RedisTemplate<String, Object> redisTemplate) {
        this.dataSource = dataSource;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "up");
        response.put("timestamp", Instant.now().toString());
        response.put("postgres", checkPostgres());
        response.put("redis", checkRedis());
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> checkPostgres() {
        Map<String, Object> status = new LinkedHashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("SELECT 1");
            status.put("status", "up");
        } catch (Exception e) {
            status.put("status", "down");
            status.put("error", e.getMessage());
        }
        return status;
    }

    private Map<String, Object> checkRedis() {
        Map<String, Object> status = new LinkedHashMap<>();
        try {
            var factory = redisTemplate.getConnectionFactory();
            if (factory == null) {
                status.put("status", "down");
                status.put("error", "No connection factory");
                return status;
            }
            String pong = factory.getConnection().ping();
            status.put("status", pong != null ? "up" : "down");
        } catch (Exception e) {
            status.put("status", "down");
            status.put("error", e.getMessage());
        }
        return status;
    }
}
