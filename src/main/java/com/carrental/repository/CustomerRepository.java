package com.carrental.repository;

import com.carrental.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    boolean existsByLicenseNumberIgnoreCase(String licenseNumber);
    boolean existsByLicenseNumberIgnoreCaseAndIdNot(String licenseNumber, Long id);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
}
