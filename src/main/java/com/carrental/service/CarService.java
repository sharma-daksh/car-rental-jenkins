package com.carrental.service;

import com.carrental.model.Car;
import com.carrental.repository.CarRepository;
import com.carrental.repository.RentalRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CarService {
    private final CarRepository carRepository;
    private final RentalRepository rentalRepository;

    public CarService(CarRepository carRepository, RentalRepository rentalRepository) {
        this.carRepository = carRepository;
        this.rentalRepository = rentalRepository;
    }

    public List<Car> getAllCars() {
        return carRepository.findAll();
    }

    public Optional<Car> getCarById(Long id) {
        return carRepository.findById(id);
    }

    public Car addCar(Car car) {
        if (carRepository.existsByRegistrationNumber(car.getRegistrationNumber())) {
            throw new IllegalStateException("Registration number already exists.");
        }
        if (car.getStatus() == null || car.getStatus().isBlank()) {
            car.setStatus("AVAILABLE");
        }
        return carRepository.save(car);
    }

    public Car updateCar(Long id, Car updatedCar) {
        return carRepository.findById(id).map(car -> {
            String requestedStatus = updatedCar.getStatus();
            boolean hasOpenRental = rentalRepository.existsByCar_IdAndStatusIn(
                    id, List.of("RESERVED", "BOOKED", "ACTIVE"));
            if (hasOpenRental && requestedStatus != null && car.getStatus() != null
                    && !requestedStatus.equalsIgnoreCase(car.getStatus())) {
                throw new IllegalStateException("Vehicle status is controlled by its open rental. Complete or cancel the rental before changing the status.");
            }
            car.setBrand(updatedCar.getBrand());
            car.setModel(updatedCar.getModel());
            car.setRegistrationNumber(updatedCar.getRegistrationNumber());
            car.setFuelType(updatedCar.getFuelType());
            car.setRentalPrice(updatedCar.getRentalPrice());
            if (updatedCar.getStatus() != null && !updatedCar.getStatus().isBlank()) {
                car.setStatus(updatedCar.getStatus());
            }
            return carRepository.save(car);
        }).orElseThrow(() -> new java.util.NoSuchElementException("Car not found: " + id));
    }

    public void deleteCar(Long id) {
        if (!carRepository.existsById(id)) {
            throw new java.util.NoSuchElementException("Car not found: " + id);
        }
        if (rentalRepository.existsByCar_Id(id)) {
            throw new IllegalStateException("This vehicle has rental history and cannot be deleted. Keep it for audit history.");
        }
        carRepository.deleteById(id);
    }

    public List<Car> searchCars(String query) {
        return carRepository.findByBrandContainingIgnoreCaseOrModelContainingIgnoreCase(query, query);
    }
}
