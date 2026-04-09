package com.codepad.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    private String id;

    private String language;

    @Column(columnDefinition = "TEXT")
    private String code;

    private Instant createdAt;
    private Instant lastActiveAt;

    public Room() {}

    public Room(String id) {
        this.id = id;
        this.language = "javascript";
        this.code = "";
        this.createdAt = Instant.now();
        this.lastActiveAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; }
}
