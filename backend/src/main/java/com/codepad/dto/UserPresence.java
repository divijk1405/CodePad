package com.codepad.dto;

public class UserPresence {
    private String roomId;
    private String userId;
    private String username;
    private String action; // "join" or "leave"

    public UserPresence() {}

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
}
