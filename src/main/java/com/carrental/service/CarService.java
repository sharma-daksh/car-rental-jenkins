package com.carrental.service;

import com.carrental.model.Car;
import com.carrental.repository.CarRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CarService {

    private final CarRepository carRepository;

    public CarService(CarRepository carRepository) {
        this.carRepository = carRepository;
    }

    public List<Car> getAllCars() {
        return carRepository.findAll();
    }

    public Optional<Car> getCarById(Long id) {
        return carRepository.findById(id);
    }

    public Car addCar(Car car) {
        if (carRepository.existsByRegistrationNumber(
                car.getRegistrationNumber())) {
            throw new RuntimeException("Registration number already exists");
        }

        if (car.getStatus() == null || car.getStatus().isBlank()) {
            car.setStatus("AVAILABLE");
        }

        return carRepository.save(car);
    }

    public Car updateCar(Long id, Car updatedCar) {
        return carRepository.findById(id)
                .map(car -> {
                    car.setBrand(updatedCar.getBrand());
                    car.setModel(updatedCar.getModel());
                    car.setRegistrationNumber(updatedCar.getRegistrationNumber());
                    car.setFuelType(updatedCar.getFuelType());
                    car.setRentalPrice(updatedCar.getRentalPrice());
                    car.setStatus(updatedCar.getStatus());
                    return carRepository.save(car);
                })
                .orElseThrow(() -> new RuntimeException("Car not found"));
    }

    public void deleteCar(Long id) {
        if (!carRepository.existsById(id)) {
            throw new RuntimeException("Car not found");
        }

        carRepository.deleteById(id);
    }

    public List<Car> searchCars(String query) {
        return carRepository
                .findByBrandContainingIgnoreCaseOrModelContainingIgnoreCase(
                        query, query);
    }
}