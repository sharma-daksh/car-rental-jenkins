package com.carrental.repository;

import com.carrental.model.Car;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CarRepository extends JpaRepository<Car, Long> {

    List<Car> findByBrandContainingIgnoreCaseOrModelContainingIgnoreCase(
            String brand, String model);

    boolean existsByRegistrationNumber(String registrationNumber);
}