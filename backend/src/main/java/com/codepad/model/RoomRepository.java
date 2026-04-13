package com.codepad.model;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface RoomRepository extends JpaRepository<Room, String> {
    List<Room> findByLastActiveAtBefore(Instant cutoff);
}
