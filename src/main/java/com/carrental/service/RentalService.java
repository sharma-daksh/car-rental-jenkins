package com.carrental.service;

import com.carrental.dto.RentalRequest;
import com.carrental.dto.RentalResponse;
import com.carrental.model.Car;
import com.carrental.model.Customer;
import com.carrental.model.Rental;
import com.carrental.repository.CarRepository;
import com.carrental.repository.CustomerRepository;
import com.carrental.repository.RentalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class RentalService {
    private static final Set<String> OPEN_STATUSES = Set.of("RESERVED", "BOOKED", "ACTIVE");
    private static final Set<String> VALID_STATUSES = Set.of("RESERVED", "BOOKED", "ACTIVE", "COMPLETED", "CANCELLED");

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            "RESERVED", Set.of("ACTIVE", "CANCELLED"),
            "BOOKED", Set.of("ACTIVE", "CANCELLED"), // compatibility with older records
            "ACTIVE", Set.of("COMPLETED"),
            "COMPLETED", Set.of(),
            "CANCELLED", Set.of()
    );

    private final RentalRepository rentalRepository;
    private final CustomerRepository customerRepository;
    private final CarRepository carRepository;

    public RentalService(RentalRepository rentalRepository, CustomerRepository customerRepository, CarRepository carRepository) {
        this.rentalRepository = rentalRepository;
        this.customerRepository = customerRepository;
        this.carRepository = carRepository;
    }

    @Transactional(readOnly = true)
    public List<RentalResponse> getAll() {
        return rentalRepository.findAllByOrderByIdDesc().stream().map(RentalResponse::from).toList();
    }

    public RentalResponse create(RentalRequest request) {
        if (request == null || request.customerId() == null || request.carId() == null
                || request.startDate() == null || request.endDate() == null) {
            throw new IllegalArgumentException("Customer, vehicle, start date, and end date are required.");
        }
        LocalDate startDate = request.startDate();
        LocalDate endDate = request.endDate();
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must be on or after the start date.");
        }
        if (startDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Start date cannot be in the past.");
        }

        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new java.util.NoSuchElementException("Customer not found: " + request.customerId()));

        // Acquire a row lock before checking availability. Concurrent requests for
        // the same vehicle must wait for the first reservation transaction to finish.
        Car car = carRepository.findByIdForUpdate(request.carId())
                .orElseThrow(() -> new java.util.NoSuchElementException("Vehicle not found: " + request.carId()));

        if (car.getStatus() == null || !"AVAILABLE".equalsIgnoreCase(car.getStatus())) {
            throw new IllegalStateException("This vehicle is not available. Refresh the inventory and choose an available vehicle.");
        }
        if (rentalRepository.existsByCar_IdAndStatusIn(car.getId(), OPEN_STATUSES)) {
            throw new IllegalStateException("This vehicle already has an open rental. Refresh the inventory and choose another vehicle.");
        }
        if (car.getRentalPrice() == null || car.getRentalPrice() < 0) {
            throw new IllegalStateException("The selected vehicle does not have a valid daily rental rate.");
        }

        long days = Math.max(1, ChronoUnit.DAYS.between(startDate, endDate));
        Rental rental = new Rental();
        rental.setCustomer(customer);
        rental.setCar(car);
        rental.setStartDate(startDate);
        rental.setEndDate(endDate);
        rental.setDailyRate(car.getRentalPrice());
        rental.setTotalPrice(Math.round(days * car.getRentalPrice() * 100.0) / 100.0);
        rental.setStatus("RESERVED");
        rental.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());

        // Reserve inventory atomically with the rental record.
        car.setStatus("BOOKED");
        carRepository.save(car);
        return RentalResponse.from(rentalRepository.save(rental));
    }

    public RentalResponse updateStatus(Long id, String requestedStatus) {
        String nextStatus = requestedStatus == null ? "" : requestedStatus.trim().toUpperCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(nextStatus)) {
            throw new IllegalArgumentException("Invalid rental status. Use RESERVED, ACTIVE, COMPLETED, or CANCELLED.");
        }

        Rental rental = rentalRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("Rental not found: " + id));
        Car car = carRepository.findByIdForUpdate(rental.getCar().getId())
                .orElseThrow(() -> new java.util.NoSuchElementException("Vehicle not found for this rental."));

        String currentStatus = rental.getStatus() == null ? "" : rental.getStatus().trim().toUpperCase(Locale.ROOT);
        if (nextStatus.equals(currentStatus)) return RentalResponse.from(rental);

        if (!ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of()).contains(nextStatus)) {
            throw new IllegalStateException("Invalid rental status transition from " + currentStatus + " to " + nextStatus + ".");
        }

        boolean targetOpen = OPEN_STATUSES.contains(nextStatus);
        boolean vehicleInUseByAnotherRental = rentalRepository.existsByCar_IdAndIdNotAndStatusIn(
                car.getId(), rental.getId(), OPEN_STATUSES);

        if (targetOpen) {
            if (vehicleInUseByAnotherRental) {
                throw new IllegalStateException("Another open rental already uses this vehicle.");
            }
            String carStatus = car.getStatus() == null ? "" : car.getStatus().trim().toUpperCase(Locale.ROOT);
            boolean thisRentalAlreadyOwnsVehicle = OPEN_STATUSES.contains(currentStatus)
                    && ("BOOKED".equals(carStatus) || "ACTIVE".equals(carStatus));
            if (!"AVAILABLE".equals(carStatus) && !thisRentalAlreadyOwnsVehicle) {
                throw new IllegalStateException("This vehicle is not available for an open rental.");
            }
            car.setStatus("ACTIVE".equals(nextStatus) ? "ACTIVE" : "BOOKED");
        } else {
            // Only the last open rental can release the vehicle. A vehicle placed
            // in maintenance must remain in maintenance after a rental is closed.
            if (!vehicleInUseByAnotherRental && !"MAINTENANCE".equalsIgnoreCase(car.getStatus())) {
                car.setStatus("AVAILABLE");
            }
        }

        rental.setStatus(nextStatus);
        carRepository.save(car);
        return RentalResponse.from(rentalRepository.save(rental));
    }
}
