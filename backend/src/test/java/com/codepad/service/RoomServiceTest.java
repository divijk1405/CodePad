package com.codepad.service;

import com.codepad.model.Room;
import com.codepad.model.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        roomService = new RoomService(roomRepository, redisTemplate);
    }

    @Test
    void createRoom_generatesIdAndSaves() {
        when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));

        Room room = roomService.createRoom();

        assertNotNull(room);
        assertNotNull(room.getId());
        assertEquals(6, room.getId().length());
        assertEquals("javascript", room.getLanguage());
        assertEquals("", room.getCode());

        verify(roomRepository).save(any(Room.class));
        verify(valueOperations, times(2)).set(anyString(), any(), anyLong(), eq(TimeUnit.SECONDS));
    }

    @Test
    void getRoom_existingRoom_returnsRoom() {
        Room room = new Room("ABC123");
        when(roomRepository.findById("ABC123")).thenReturn(Optional.of(room));

        Room result = roomService.getRoom("ABC123");

        assertNotNull(result);
        assertEquals("ABC123", result.getId());
    }

    @Test
    void getRoom_nonExistingRoom_returnsNull() {
        when(roomRepository.findById("XXXXXX")).thenReturn(Optional.empty());

        Room result = roomService.getRoom("XXXXXX");

        assertNull(result);
    }

    @Test
    void getRoomCode_fromRedis() {
        when(valueOperations.get("room:ABC123:code")).thenReturn("console.log('hi')");

        String code = roomService.getRoomCode("ABC123");

        assertEquals("console.log('hi')", code);
    }

    @Test
    void getRoomCode_fallbackToDatabase() {
        when(valueOperations.get("room:ABC123:code")).thenReturn(null);
        Room room = new Room("ABC123");
        room.setCode("saved code");
        when(roomRepository.findById("ABC123")).thenReturn(Optional.of(room));

        String code = roomService.getRoomCode("ABC123");

        assertEquals("saved code", code);
    }

    @Test
    void getRoomCode_noRoomExists_returnsEmpty() {
        when(valueOperations.get("room:XXXXXX:code")).thenReturn(null);
        when(roomRepository.findById("XXXXXX")).thenReturn(Optional.empty());

        String code = roomService.getRoomCode("XXXXXX");

        assertEquals("", code);
    }

    @Test
    void getRoomLanguage_fromRedis() {
        when(valueOperations.get("room:ABC123:language")).thenReturn("python");

        String lang = roomService.getRoomLanguage("ABC123");

        assertEquals("python", lang);
    }

    @Test
    void getRoomLanguage_fallbackDefault() {
        when(valueOperations.get("room:XXXXXX:language")).thenReturn(null);
        when(roomRepository.findById("XXXXXX")).thenReturn(Optional.empty());

        String lang = roomService.getRoomLanguage("XXXXXX");

        assertEquals("javascript", lang);
    }

    @Test
    void updateCode_writesToRedisAndTouchesRoom() {
        Room room = new Room("ABC123");
        when(roomRepository.findById("ABC123")).thenReturn(Optional.of(room));
        when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));

        roomService.updateCode("ABC123", "new code");

        verify(valueOperations).set(eq("room:ABC123:code"), eq("new code"), anyLong(), eq(TimeUnit.SECONDS));
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void updateLanguage_writesToRedisAndTouchesRoom() {
        Room room = new Room("ABC123");
        when(roomRepository.findById("ABC123")).thenReturn(Optional.of(room));
        when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));

        roomService.updateLanguage("ABC123", "python");

        verify(valueOperations).set(eq("room:ABC123:language"), eq("python"), anyLong(), eq(TimeUnit.SECONDS));
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void addUser_putsInRedisHash() {
        roomService.addUser("ABC123", "user-1", "Alice");

        verify(hashOperations).put("room:ABC123:users", "user-1", "Alice");
        verify(redisTemplate).expire(eq("room:ABC123:users"), anyLong(), eq(TimeUnit.SECONDS));
    }

    @Test
    void removeUser_deletesFromRedisHash() {
        roomService.removeUser("ABC123", "user-1");

        verify(hashOperations).delete("room:ABC123:users", "user-1");
    }

    @Test
    void getUsers_returnsStringMap() {
        Map<Object, Object> entries = new HashMap<>();
        entries.put("user-1", "Alice");
        entries.put("user-2", "Bob");
        when(hashOperations.entries("room:ABC123:users")).thenReturn(entries);

        Map<String, String> users = roomService.getUsers("ABC123");

        assertEquals(2, users.size());
        assertEquals("Alice", users.get("user-1"));
        assertEquals("Bob", users.get("user-2"));
    }

    @Test
    void persistRoom_savesCodeAndLanguageToDb() {
        Room room = new Room("ABC123");
        when(roomRepository.findById("ABC123")).thenReturn(Optional.of(room));
        when(valueOperations.get("room:ABC123:code")).thenReturn("persisted code");
        when(valueOperations.get("room:ABC123:language")).thenReturn("python");
        when(roomRepository.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));

        roomService.persistRoom("ABC123");

        ArgumentCaptor<Room> captor = ArgumentCaptor.forClass(Room.class);
        verify(roomRepository).save(captor.capture());
        Room saved = captor.getValue();
        assertEquals("persisted code", saved.getCode());
        assertEquals("python", saved.getLanguage());
        assertNotNull(saved.getLastActiveAt());
    }

    @Test
    void persistRoom_nonExistingRoom_doesNothing() {
        when(roomRepository.findById("XXXXXX")).thenReturn(Optional.empty());

        roomService.persistRoom("XXXXXX");

        verify(roomRepository, never()).save(any());
    }
}
