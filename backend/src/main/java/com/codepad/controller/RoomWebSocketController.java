package com.codepad.controller;

import com.codepad.dto.CodeChange;
import com.codepad.dto.LanguageChange;
import com.codepad.dto.UserPresence;
import com.codepad.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class RoomWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(RoomWebSocketController.class);

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomWebSocketController(RoomService roomService, SimpMessagingTemplate messagingTemplate) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/room/{roomId}/code")
    @SendTo("/topic/room/{roomId}/code")
    public CodeChange handleCodeChange(@DestinationVariable String roomId, CodeChange change) {
        change.setRoomId(roomId);
        change.setTimestamp(System.currentTimeMillis());
        roomService.updateCode(roomId, change.getContent());
        log.debug("Code updated in room {} by user {}", roomId, change.getUserId());
        return change;
    }

    @MessageMapping("/room/{roomId}/language")
    @SendTo("/topic/room/{roomId}/language")
    public LanguageChange handleLanguageChange(@DestinationVariable String roomId, LanguageChange change) {
        change.setRoomId(roomId);
        roomService.updateLanguage(roomId, change.getLanguage());
        log.info("Language changed to '{}' in room {} by user {}", change.getLanguage(), roomId, change.getUserId());
        return change;
    }

    @MessageMapping("/room/{roomId}/join")
    public void handleJoin(@DestinationVariable String roomId, UserPresence presence) {
        presence.setRoomId(roomId);
        presence.setAction("join");
        roomService.addUser(roomId, presence.getUserId(), presence.getUsername());

        Map<String, Object> state = new HashMap<>();
        state.put("code", roomService.getRoomCode(roomId));
        state.put("language", roomService.getRoomLanguage(roomId));
        state.put("users", roomService.getUsers(roomId));

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/presence", presence);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/state", state);
        log.info("User '{}' ({}) joined room {}", presence.getUsername(), presence.getUserId(), roomId);
    }

    @MessageMapping("/room/{roomId}/leave")
    public void handleLeave(@DestinationVariable String roomId, UserPresence presence) {
        presence.setRoomId(roomId);
        presence.setAction("leave");
        roomService.removeUser(roomId, presence.getUserId());
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/presence", presence);
        log.info("User '{}' ({}) left room {}", presence.getUsername(), presence.getUserId(), roomId);
    }

    @MessageExceptionHandler
    public void handleException(Exception ex) {
        log.error("WebSocket message handling error: {}", ex.getMessage(), ex);
    }
}
