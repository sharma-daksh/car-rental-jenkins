package com.carrental.controller;

import com.carrental.dto.RentalRequest;
import com.carrental.dto.RentalResponse;
import com.carrental.dto.RentalStatusRequest;
import com.carrental.service.RentalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rentals")
public class RentalController {
    private final RentalService rentalService;

    public RentalController(RentalService rentalService) {
        this.rentalService = rentalService;
    }

    @GetMapping
    public List<RentalResponse> getAll() { return rentalService.getAll(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RentalResponse create(@Valid @RequestBody RentalRequest request) { return rentalService.create(request); }

    @PatchMapping("/{id}/status")
    public RentalResponse updateStatus(@PathVariable Long id, @Valid @RequestBody RentalStatusRequest request) {
        return rentalService.updateStatus(id, request.status());
    }
}
