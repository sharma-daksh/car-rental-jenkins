package com.carrental.dto;

import jakarta.validation.constraints.NotBlank;

public record RentalStatusRequest(@NotBlank String status) {}
