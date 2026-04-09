package com.codepad.controller;

import com.codepad.dto.RunRequest;
import com.codepad.dto.RunResponse;
import com.codepad.model.Room;
import com.codepad.service.CodeExecutionService;
import com.codepad.service.RoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class RoomController {

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
        Room room = roomService.getRoom(id);
        if (room == null) {
            return ResponseEntity.notFound().build();
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
        RunResponse response = executionService.execute(request.getCode(), request.getLanguage());
        return ResponseEntity.ok(response);
    }
}
