package com.carrental.service;

import com.carrental.dto.RentalRequest;
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
    private Customer customer;

    @BeforeEach
    void setUp() {
        rentalRepository = mock(RentalRepository.class);
        customerRepository = mock(CustomerRepository.class);
        carRepository = mock(CarRepository.class);
        rentalService = new RentalService(rentalRepository, customerRepository, carRepository);

        customer = new Customer();
        customer.setId(2L);
        customer.setFullName("Demo Customer");

        car = new Car("Maruti Suzuki", "Swift", "MH01AB1234", "Petrol", 1800.0, "BOOKED");
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

        when(rentalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(rental));
        when(customerRepository.findById(2L)).thenReturn(Optional.of(customer));
        when(carRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(car));
        when(rentalRepository.existsByCar_IdAndStatusIn(eq(3L), anyCollection())).thenReturn(false);
        when(rentalRepository.existsByCar_IdAndIdNotAndStatusIn(eq(3L), eq(1L), anyCollection())).thenReturn(false);
        when(rentalRepository.save(any(Rental.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(carRepository.save(any(Car.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void reservedRentalCanBecomeActive() {
        RentalResponse result = rentalService.updateStatus(1L, "ACTIVE");
        assertEquals("ACTIVE", result.status());
        assertEquals("ACTIVE", car.getStatus());
        verify(carRepository).save(car);
    }

    @Test
    void activeRentalCanBeCompletedAndVehicleBecomesAvailable() {
        rental.setStatus("ACTIVE");
        car.setStatus("ACTIVE");
        RentalResponse result = rentalService.updateStatus(1L, "COMPLETED");
        assertEquals("COMPLETED", result.status());
        assertEquals("AVAILABLE", car.getStatus());
        verify(carRepository).save(car);
    }

    @Test
    void reservedRentalCanBeCancelledAndVehicleBecomesAvailable() {
        RentalResponse result = rentalService.updateStatus(1L, "CANCELLED");
        assertEquals("CANCELLED", result.status());
        assertEquals("AVAILABLE", car.getStatus());
        verify(carRepository).save(car);
    }

    @Test
    void reservedRentalCannotBeCompletedDirectly() {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> rentalService.updateStatus(1L, "COMPLETED"));
        assertTrue(error.getMessage().contains("Invalid rental status transition"));
        verify(carRepository, never()).save(any(Car.class));
    }

    @Test
    void completedRentalCannotBeReactivated() {
        rental.setStatus("COMPLETED");
        car.setStatus("AVAILABLE");
        assertThrows(IllegalStateException.class, () -> rentalService.updateStatus(1L, "ACTIVE"));
        verify(carRepository, never()).save(any(Car.class));
    }

    @Test
    void closingRentalDoesNotOverrideMaintenanceStatus() {
        car.setStatus("MAINTENANCE");
        RentalResponse result = rentalService.updateStatus(1L, "CANCELLED");
        assertEquals("CANCELLED", result.status());
        assertEquals("MAINTENANCE", car.getStatus());
    }

    @Test
    void activeRentalCannotBeCancelledThroughTheReservedOnlyTransition() {
        rental.setStatus("ACTIVE");
        car.setStatus("ACTIVE");
        assertThrows(IllegalStateException.class, () -> rentalService.updateStatus(1L, "CANCELLED"));
        verify(carRepository, never()).save(any(Car.class));
    }

    @Test
    void rentalCannotStartInThePast() {
        RentalRequest request = new RentalRequest(2L, 3L, LocalDate.now().minusDays(1), LocalDate.now(), null);
        assertThrows(IllegalArgumentException.class, () -> rentalService.create(request));
        verify(carRepository, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void endDateCannotPrecedeStartDate() {
        RentalRequest request = new RentalRequest(2L, 3L, LocalDate.now().plusDays(2), LocalDate.now().plusDays(1), null);
        assertThrows(IllegalArgumentException.class, () -> rentalService.create(request));
        verify(carRepository, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void vehicleAlreadyBookedCannotBeReservedAgain() {
        car.setStatus("BOOKED");
        RentalRequest request = new RentalRequest(2L, 3L, LocalDate.now(), LocalDate.now().plusDays(1), null);
        assertThrows(IllegalStateException.class, () -> rentalService.create(request));
        verify(rentalRepository, never()).save(any(Rental.class));
    }

    @Test
    void existingOpenRentalPreventsDoubleBookingEvenIfVehicleStatusIsStale() {
        car.setStatus("AVAILABLE");
        when(rentalRepository.existsByCar_IdAndStatusIn(eq(3L), anyCollection())).thenReturn(true);
        RentalRequest request = new RentalRequest(2L, 3L, LocalDate.now(), LocalDate.now().plusDays(1), null);
        assertThrows(IllegalStateException.class, () -> rentalService.create(request));
        verify(rentalRepository, never()).save(any(Rental.class));
    }

    @Test
    void createReservesAvailableVehicleAndStoresRental() {
        car.setStatus("AVAILABLE");
        RentalRequest request = new RentalRequest(2L, 3L, LocalDate.now(), LocalDate.now().plusDays(2), "Test booking");
        RentalResponse result = rentalService.create(request);
        assertEquals("RESERVED", result.status());
        assertEquals("BOOKED", car.getStatus());
        assertEquals(3600.0, result.totalPrice());
        verify(carRepository).save(car);
        verify(rentalRepository).save(any(Rental.class));
    }
}
