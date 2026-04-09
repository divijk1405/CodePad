package com.codepad.service;

import com.codepad.model.Room;
import com.codepad.model.RoomRepository;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class RoomService {

    private static final String ROOM_CODE_KEY = "room:%s:code";
    private static final String ROOM_LANG_KEY = "room:%s:language";
    private static final String ROOM_USERS_KEY = "room:%s:users";
    private static final Duration ROOM_TTL = Duration.ofHours(24);

    private final RoomRepository roomRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    public RoomService(RoomRepository roomRepository, RedisTemplate<String, Object> redisTemplate) {
        this.roomRepository = roomRepository;
        this.redisTemplate = redisTemplate;
    }

    public Room createRoom() {
        String id = generateRoomId();
        Room room = new Room(id);
        roomRepository.save(room);

        String codeKey = String.format(ROOM_CODE_KEY, id);
        String langKey = String.format(ROOM_LANG_KEY, id);
        redisTemplate.opsForValue().set(codeKey, "", ROOM_TTL.toSeconds(), TimeUnit.SECONDS);
        redisTemplate.opsForValue().set(langKey, "javascript", ROOM_TTL.toSeconds(), TimeUnit.SECONDS);

        return room;
    }

    public Room getRoom(String roomId) {
        return roomRepository.findById(roomId).orElse(null);
    }

    public String getRoomCode(String roomId) {
        String key = String.format(ROOM_CODE_KEY, roomId);
        Object code = redisTemplate.opsForValue().get(key);
        if (code != null) return code.toString();

        Room room = getRoom(roomId);
        return room != null ? room.getCode() : "";
    }

    public String getRoomLanguage(String roomId) {
        String key = String.format(ROOM_LANG_KEY, roomId);
        Object lang = redisTemplate.opsForValue().get(key);
        if (lang != null) return lang.toString();

        Room room = getRoom(roomId);
        return room != null ? room.getLanguage() : "javascript";
    }

    public void updateCode(String roomId, String code) {
        String key = String.format(ROOM_CODE_KEY, roomId);
        redisTemplate.opsForValue().set(key, code, ROOM_TTL.toSeconds(), TimeUnit.SECONDS);
        touchRoom(roomId);
    }

    public void updateLanguage(String roomId, String language) {
        String key = String.format(ROOM_LANG_KEY, roomId);
        redisTemplate.opsForValue().set(key, language, ROOM_TTL.toSeconds(), TimeUnit.SECONDS);
        touchRoom(roomId);
    }

    public void addUser(String roomId, String userId, String username) {
        String key = String.format(ROOM_USERS_KEY, roomId);
        redisTemplate.opsForHash().put(key, userId, username);
        redisTemplate.expire(key, ROOM_TTL.toSeconds(), TimeUnit.SECONDS);
    }

    public void removeUser(String roomId, String userId) {
        String key = String.format(ROOM_USERS_KEY, roomId);
        redisTemplate.opsForHash().delete(key, userId);
    }

    @SuppressWarnings("unchecked")
    public Map<String, String> getUsers(String roomId) {
        String key = String.format(ROOM_USERS_KEY, roomId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
        Map<String, String> users = new HashMap<>();
        entries.forEach((k, v) -> users.put(k.toString(), v.toString()));
        return users;
    }

    public void persistRoom(String roomId) {
        Room room = getRoom(roomId);
        if (room == null) return;
        room.setCode(getRoomCode(roomId));
        room.setLanguage(getRoomLanguage(roomId));
        room.setLastActiveAt(Instant.now());
        roomRepository.save(room);
    }

    private void touchRoom(String roomId) {
        roomRepository.findById(roomId).ifPresent(room -> {
            room.setLastActiveAt(Instant.now());
            roomRepository.save(room);
        });
    }

    private String generateRoomId() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        Random random = new Random();
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
