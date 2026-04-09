package com.codepad.dto;

public class LanguageChange {
    private String roomId;
    private String userId;
    private String language;

    public LanguageChange() {}

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
