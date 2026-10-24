package com.carrental.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerRequest(
        @NotBlank @Size(max = 120) String fullName,
        @Email @Size(max = 180) String email,
        @NotBlank @Size(max = 24) String phone,
        @NotBlank @Size(max = 40) String licenseNumber,
        @Size(max = 300) String address
) {}
