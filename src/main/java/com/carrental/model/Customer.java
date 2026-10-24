package com.carrental.model;

import jakarta.persistence.*;

@Entity
@Table(name = "customers", uniqueConstraints = {
        @UniqueConstraint(name = "uk_customers_license_number", columnNames = "license_number"),
        @UniqueConstraint(name = "uk_customers_email", columnNames = "email")
})
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(length = 180)
    private String email;

    @Column(nullable = false, length = 24)
    private String phone;

    @Column(name = "license_number", nullable = false, length = 40)
    private String licenseNumber;

    @Column(length = 300)
    private String address;

    public Customer() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
