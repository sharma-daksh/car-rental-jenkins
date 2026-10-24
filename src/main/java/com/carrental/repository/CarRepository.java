package com.carrental.repository;

import com.carrental.model.Car;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CarRepository extends JpaRepository<Car, Long> {

    List<Car> findByBrandContainingIgnoreCaseOrModelContainingIgnoreCase(
            String brand, String model);

    boolean existsByRegistrationNumber(String registrationNumber);

    /**
     * Locks the selected vehicle row until the surrounding transaction completes.
     * This serializes concurrent booking attempts for the same vehicle.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select car from Car car where car.id = :id")
    Optional<Car> findByIdForUpdate(@Param("id") Long id);
}
