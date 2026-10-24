package com.carrental.service;

import com.carrental.dto.RentalResponse;
import com.carrental.model.Car;
import com.carrental.model.Customer;
import com.carrental.model.Rental;
import com.carrental.repository.CarRepository;
import com.carrental.repository.CustomerRepository;
import com.carrental.repository.RentalRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RentalServiceTest {

    private RentalRepository rentalRepository;
    private CustomerRepository customerRepository;
    private CarRepository carRepository;
    private RentalService rentalService;

    private Rental rental;
    private Car car;

    @BeforeEach
    void setUp() {
        rentalRepository = mock(RentalRepository.class);
        customerRepository = mock(CustomerRepository.class);
        carRepository = mock(CarRepository.class);

        rentalService = new RentalService(
                rentalRepository,
                customerRepository,
                carRepository
        );

        Customer customer = new Customer();
        customer.setId(2L);
        customer.setFullName("Demo Customer");

        car = new Car(
                "Maruti Suzuki",
                "Swift",
                "MH01AB1234",
                "Petrol",
                1800.0,
                "BOOKED"
        );
        car.setId(3L);

        rental = new Rental();
        rental.setId(1L);
        rental.setCustomer(customer);
        rental.setCar(car);
        rental.setStartDate(LocalDate.now());
        rental.setEndDate(LocalDate.now().plusDays(1));
        rental.setDailyRate(1800.0);
        rental.setTotalPrice(1800.0);
        rental.setStatus("RESERVED");

        when(rentalRepository.findById(1L))
                .thenReturn(Optional.of(rental));

        when(carRepository.findById(3L))
                .thenReturn(Optional.of(car));

        when(rentalRepository.existsByCar_IdAndIdNotAndStatusIn(
                eq(3L), eq(1L), anyCollection()))
                .thenReturn(false);

        when(rentalRepository.save(any(Rental.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void reservedRentalCanBecomeActive() {
        RentalResponse result =
                rentalService.updateStatus(1L, "ACTIVE");

        assertEquals("ACTIVE", result.status());
        assertEquals("ACTIVE", car.getStatus());
        verify(carRepository).save(car);
    }

    @Test
    void activeRentalCanBeCompleted() {
        rental.setStatus("ACTIVE");
        car.setStatus("ACTIVE");

        RentalResponse result =
                rentalService.updateStatus(1L, "COMPLETED");

        assertEquals("COMPLETED", result.status());
        assertEquals("AVAILABLE", car.getStatus());
        verify(carRepository).save(car);
    }

    @Test
    void reservedRentalCannotBeCompletedDirectly() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> rentalService.updateStatus(1L, "COMPLETED")
        );

        assertTrue(
                exception.getMessage().contains(
                        "Invalid rental status transition"
                )
        );

        verify(carRepository, never()).save(any(Car.class));
    }

    @Test
    void completedRentalCannotBeReactivated() {
        rental.setStatus("COMPLETED");
        car.setStatus("AVAILABLE");

        assertThrows(
                IllegalStateException.class,
                () -> rentalService.updateStatus(1L, "ACTIVE")
        );

        verify(carRepository, never()).save(any(Car.class));
    }
}