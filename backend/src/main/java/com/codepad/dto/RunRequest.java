package com.codepad.dto;

public class RunRequest {
    private String code;
    private String language;

    public RunRequest() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
