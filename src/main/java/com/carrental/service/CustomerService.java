package com.carrental.service;

import com.carrental.dto.CustomerRequest;
import com.carrental.model.Customer;
import com.carrental.repository.CustomerRepository;
import com.carrental.repository.RentalRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CustomerService {
    private final CustomerRepository customerRepository;
    private final RentalRepository rentalRepository;

    public CustomerService(CustomerRepository customerRepository, RentalRepository rentalRepository) {
        this.customerRepository = customerRepository;
        this.rentalRepository = rentalRepository;
    }

    @Transactional(readOnly = true)
    public List<Customer> getAll() {
        return customerRepository.findAll(Sort.by(Sort.Direction.ASC, "fullName"));
    }

    @Transactional(readOnly = true)
    public Customer getById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("Customer not found: " + id));
    }

    public Customer create(CustomerRequest request) {
        Customer customer = new Customer();
        apply(request, customer, null);
        return customerRepository.save(customer);
    }

    public Customer update(Long id, CustomerRequest request) {
        Customer customer = getById(id);
        apply(request, customer, id);
        return customerRepository.save(customer);
    }

    public void delete(Long id) {
        Customer customer = getById(id);
        if (rentalRepository.existsByCustomer_Id(id)) {
            throw new IllegalStateException("This customer has rental records and cannot be deleted. Keep the record for rental history.");
        }
        customerRepository.delete(customer);
    }

    private void apply(CustomerRequest request, Customer customer, Long currentId) {
        String name = request.fullName().trim();
        String phone = request.phone().trim();
        String license = request.licenseNumber().trim().toUpperCase();
        String email = request.email() == null || request.email().isBlank()
                ? null : request.email().trim().toLowerCase();

        boolean duplicateLicense = currentId == null
                ? customerRepository.existsByLicenseNumberIgnoreCase(license)
                : customerRepository.existsByLicenseNumberIgnoreCaseAndIdNot(license, currentId);
        if (duplicateLicense) throw new IllegalStateException("A customer with this driving licence already exists.");

        if (email != null) {
            boolean duplicateEmail = currentId == null
                    ? customerRepository.existsByEmailIgnoreCase(email)
                    : customerRepository.existsByEmailIgnoreCaseAndIdNot(email, currentId);
            if (duplicateEmail) throw new IllegalStateException("A customer with this email already exists.");
        }

        customer.setFullName(name);
        customer.setPhone(phone);
        customer.setLicenseNumber(license);
        customer.setEmail(email);
        customer.setAddress(request.address() == null || request.address().isBlank() ? null : request.address().trim());
    }
}
