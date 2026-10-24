package com.carrental.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record RentalRequest(
        @NotNull Long customerId,
        @NotNull Long carId,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @Size(max = 500) String notes
) {}
