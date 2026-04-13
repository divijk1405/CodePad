package com.codepad.controller;

import com.codepad.dto.RunRequest;
import com.codepad.dto.RunResponse;
import com.codepad.exception.RoomNotFoundException;
import com.codepad.model.Room;
import com.codepad.service.CodeExecutionService;
import com.codepad.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class RoomController {

    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("python", "javascript");
    private static final int MAX_CODE_LENGTH = 50_000;

    private final RoomService roomService;
    private final CodeExecutionService executionService;

    public RoomController(RoomService roomService, CodeExecutionService executionService) {
        this.roomService = roomService;
        this.executionService = executionService;
    }

    @PostMapping("/rooms")
    public ResponseEntity<Map<String, Object>> createRoom() {
        Room room = roomService.createRoom();
        Map<String, Object> response = new HashMap<>();
        response.put("id", room.getId());
        response.put("language", room.getLanguage());
        response.put("code", room.getCode());
        response.put("createdAt", room.getCreatedAt().toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/rooms/{id}")
    public ResponseEntity<Map<String, Object>> getRoom(@PathVariable String id) {
        if (id == null || !id.matches("^[A-Z0-9]{6}$")) {
            throw new IllegalArgumentException("Invalid room ID format. Expected 6 alphanumeric characters.");
        }

        Room room = roomService.getRoom(id);
        if (room == null) {
            throw new RoomNotFoundException(id);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", room.getId());
        response.put("code", roomService.getRoomCode(id));
        response.put("language", roomService.getRoomLanguage(id));
        response.put("users", roomService.getUsers(id));
        response.put("createdAt", room.getCreatedAt().toString());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/run")
    public ResponseEntity<RunResponse> runCode(@RequestBody RunRequest request) {
        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new IllegalArgumentException("Code must not be empty");
        }
        if (request.getCode().length() > MAX_CODE_LENGTH) {
            throw new IllegalArgumentException("Code exceeds maximum length of " + MAX_CODE_LENGTH + " characters");
        }
        if (request.getLanguage() == null || !SUPPORTED_LANGUAGES.contains(request.getLanguage())) {
            throw new IllegalArgumentException("Unsupported language. Supported: " + SUPPORTED_LANGUAGES);
        }

        RunResponse response = executionService.execute(request.getCode(), request.getLanguage());
        return ResponseEntity.ok(response);
    }
}
