package com.carrental.dto;

import com.carrental.model.Rental;
import java.time.LocalDate;

public record RentalResponse(
        Long id,
        Long customerId,
        String customerName,
        Long carId,
        String vehicleName,
        String registrationNumber,
        LocalDate startDate,
        LocalDate endDate,
        Double dailyRate,
        Double totalPrice,
        String status,
        String notes
) {
    public static RentalResponse from(Rental rental) {
        return new RentalResponse(
                rental.getId(),
                rental.getCustomer().getId(),
                rental.getCustomer().getFullName(),
                rental.getCar().getId(),
                rental.getCar().getBrand() + " " + rental.getCar().getModel(),
                rental.getCar().getRegistrationNumber(),
                rental.getStartDate(), rental.getEndDate(),
                rental.getDailyRate(), rental.getTotalPrice(), rental.getStatus(), rental.getNotes()
        );
    }
}
