package com.codepad.service;

import com.codepad.model.Room;
import com.codepad.model.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class RoomCleanupService {

    private static final Logger log = LoggerFactory.getLogger(RoomCleanupService.class);

    private final RoomRepository roomRepository;

    @Value("${codepad.room.ttl-hours:24}")
    private int ttlHours;

    public RoomCleanupService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @Scheduled(fixedRate = 3600000) // every hour
    public void cleanupExpiredRooms() {
        Instant cutoff = Instant.now().minus(ttlHours, ChronoUnit.HOURS);
        List<Room> expiredRooms = roomRepository.findByLastActiveAtBefore(cutoff);

        if (expiredRooms.isEmpty()) {
            log.info("Room cleanup: no expired rooms found");
            return;
        }

        roomRepository.deleteAll(expiredRooms);
        log.info("Room cleanup: removed {} expired rooms inactive since before {}",
                expiredRooms.size(), cutoff);
    }
}
